// cloudfunctions/paymentNotify/index.js - 修复完整版
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  console.log('💰 支付回调收到数据:', event)
  
  const { return_code, result_code, out_trade_no } = event
  
  if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
    try {
      // 1. 检查是否已处理过（防止重复回调）
      const existingOrder = await db.collection('orders').where({
        outTradeNo: out_trade_no,
        status: 'paid'
      }).get()
      
      if (existingOrder.data.length > 0) {
        console.log('⚠️ 订单已处理过，直接返回成功')
        return {
          return_code: 'SUCCESS',
          return_msg: 'OK'
        }
      }
      
      // 2. 获取订单详情
      const orderRes = await db.collection('orders').where({
        outTradeNo: out_trade_no
      }).get()
      
      if (orderRes.data.length === 0) {
        console.error('❌ 订单不存在:', out_trade_no)
        return {
          return_code: 'FAIL',
          return_msg: '订单不存在'
        }
      }

      const order = orderRes.data[0]
      const { openid, credits, validDays } = order
      
      console.log('👤 处理用户积分, openid:', openid, 'credits:', credits)
      
      // 3. 获取用户当前信息
      const userRes = await db.collection('user_profiles').where({
        _openid: openid  // ✅ 修复：使用 _openid
      }).get()
      
      if (userRes.data.length === 0) {
        console.error('❌ 用户不存在:', openid)
        return {
          return_code: 'FAIL',
          return_msg: '用户不存在'
        }
      }
      
      const userData = userRes.data[0]
      
      // 4. 计算新的过期时间
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + (validDays || 30)) // 默认30天
      
      // 5. 计算总积分（保留试用次数）
      const currentTrialUsed = userData.trialUsed || 0
      const currentPaidCredits = userData.paidCredits || 0
      const remainingTrials = Math.max(0, 3 - currentTrialUsed)
      const newPaidCredits = currentPaidCredits + credits
      const totalCredits = remainingTrials + newPaidCredits
      
      // 6. 使用事务更新订单和用户信息
      const transaction = await db.startTransaction()
      
      try {
        // 更新订单状态
        await transaction.collection('orders').where({
          outTradeNo: out_trade_no
        }).update({
          data: {
            status: 'paid',
            payTime: new Date(),
            updateTime: new Date()
          }
        })
        
        // 更新用户信息
        await transaction.collection('user_profiles').where({
          _openid: openid
        }).update({
          data: {
            paidCredits: newPaidCredits,
            totalCredits: totalCredits,
            isMember: true,
            expireDate: expireDate,
            updateTime: new Date()
          }
        })
        
        // 提交事务
        await transaction.commit()
        console.log('✅ 支付回调处理成功')
        
      } catch (transactionError) {
        // 回滚事务
        await transaction.rollback()
        console.error('❌ 事务执行失败:', transactionError)
        throw transactionError
      }
      
      // 7. 返回成功响应给微信
      return {
        return_code: 'SUCCESS',
        return_msg: 'OK'
      }
      
    } catch (error) {
      console.error('❌ 支付回调处理失败:', error)
      return {
        return_code: 'FAIL',
        return_msg: '处理失败: ' + error.message
      }
    }
  }
  
  // 支付未成功
  console.log('❌ 支付未成功:', event)
  return {
    return_code: 'FAIL',
    return_msg: '支付未成功'
  }
}