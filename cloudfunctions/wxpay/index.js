const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { returnCode, ...msg } = event
  console.log('wxpay 回调入参:', event)

  if (returnCode !== 'SUCCESS') {
    console.error('通信失败', event)
    return { returnCode: 'FAIL', returnMsg: '通信失败' }
  }

  const db = cloud.database()
  const { outTradeNo, resultCode, transactionId, timeEnd } = msg

  if (resultCode === 'SUCCESS') {
    try {
      // 1. 更新订单状态
      const ord = await db.collection('orders').where({ outTradeNo }).get()
      if (ord.data.length === 0) {
        console.error('订单不存在:', outTradeNo)
        return { returnCode: 'FAIL', returnMsg: 'ORDER_NOT_FOUND' }
      }

      const order = ord.data[0]
      await db.collection('orders').doc(order._id).update({
        data: {
          status: 'paid',
          transactionId,
          payTime: timeEnd,
          updateTime: db.serverDate()
        }
      })

      // 2. 给用户增加付费次数 - 修复表名
      const userRes = await db.collection('user_profiles').where({ _openid: order._openid }).get()
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

      return { returnCode: 'SUCCESS', returnMsg: 'OK' }
    } catch (error) {
      console.error('支付回调处理失败:', error)
      return { returnCode: 'FAIL', returnMsg: 'PROCESS_ERROR' }
    }
  }

  return { returnCode: 'FAIL', returnMsg: 'RESULT_ERROR' }
}