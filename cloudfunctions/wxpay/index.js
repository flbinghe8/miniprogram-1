const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 签名验证函数（需要实现）
const verifyWxpaySignature = (params, sign) => {
  // TODO: 实现微信支付签名验证逻辑
  // 参考微信支付文档的签名算法
  return true // 临时返回true，实际需要实现验证
}

// 防止重复处理
const processedTransactions = new Set()

exports.main = async (event, context) => {
  const { returnCode, ...msg } = event
  console.log('wxpay 回调入参:', event)

  // 1. 验证通信状态
  if (returnCode !== 'SUCCESS') {
    console.error('通信失败', event)
    return { returnCode: 'FAIL', returnMsg: '通信失败' }
  }

  // 2. 验证签名（关键安全步骤）
  if (!verifyWxpaySignature(msg, msg.sign)) {
    console.error('签名验证失败:', event)
    return { returnCode: 'FAIL', returnMsg: 'SIGNATURE_ERROR' }
  }

  // 3. 防止重复处理
  if (processedTransactions.has(msg.transactionId)) {
    console.log('重复回调，已处理:', msg.transactionId)
    return { returnCode: 'SUCCESS', returnMsg: 'OK' }
  }

  const db = cloud.database()
  const { outTradeNo, resultCode, transactionId, timeEnd } = msg

  if (resultCode === 'SUCCESS') {
    try {
      // 使用数据库事务确保数据一致性
      const transaction = await db.startTransaction()
      
      // 1. 查询并锁定订单记录
      const ord = await db.collection('orders').where({ 
        outTradeNo,
        status: 'pending' // 只处理待支付订单
      }).get()
      
      if (ord.data.length === 0) {
        console.error('订单不存在或已处理:', outTradeNo)
        await transaction.rollback()
        return { returnCode: 'FAIL', returnMsg: 'ORDER_NOT_FOUND' }
      }

      const order = ord.data[0]
      
      // 2. 更新订单状态
      await db.collection('orders').doc(order._id).update({
        data: {
          status: 'paid',
          transactionId,
          payTime: timeEnd,
          updateTime: db.serverDate()
        }
      })

      // 3. 更新用户额度
      const userRes = await db.collection('user_profiles').where({ 
        _openid: order._openid 
      }).get()
      
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        await db.collection('user_profiles').doc(user._id).update({
          data: {
            paidCredits: (user.paidCredits || 0) + order.credits,
            updateTime: db.serverDate()
          }
        })
        console.log(`✅ 用户 ${order._openid} 增加 ${order.credits} 次付费额度`)
      }

      // 提交事务
      await transaction.commit()
      
      // 记录已处理交易
      processedTransactions.add(transactionId)
      
      // 设置清理机制（防止内存泄漏）
      if (processedTransactions.size > 1000) {
        processedTransactions.clear()
      }

      return { returnCode: 'SUCCESS', returnMsg: 'OK' }
    } catch (error) {
      console.error('支付回调处理失败:', error)
      // 事务会自动回滚
      return { returnCode: 'FAIL', returnMsg: 'PROCESS_ERROR' }
    }
  }

  return { returnCode: 'FAIL', returnMsg: 'RESULT_ERROR' }
}