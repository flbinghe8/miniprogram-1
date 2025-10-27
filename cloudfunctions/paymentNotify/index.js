// cloudfunctions/paymentNotify/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  console.log('💰 支付回调收到数据:', event)
  
  const { return_code, result_code, out_trade_no } = event
  
  if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
    try {
      const db = cloud.database()
      
      // 1. 更新订单状态
      const updateResult = await db.collection('orders').where({
        outTradeNo: out_trade_no
      }).update({
        data: {
          status: 'paid',
          updateTime: new Date()
        }
      })
      
      console.log('📝 订单更新结果:', updateResult)
      
      // 2. 获取订单详情
      const orderRes = await db.collection('orders').where({
        outTradeNo: out_trade_no
      }).get()
      
      if (orderRes.data.length > 0) {
        const order = orderRes.data[0]
        const { openid, credits, validDays } = order
        
        console.log('👤 更新用户积分, openid:', openid, 'credits:', credits)
        
        // 3. 更新用户积分和会员信息
        const expireDate = new Date()
        expireDate.setDate(expireDate.getDate() + validDays)
        
        const userUpdate = await db.collection('user_profiles').where({
          _id: openid
        }).update({
          data: {
            paidCredits: db.command.inc(credits),
            totalCredits: db.command.inc(credits),
            isMember: true,
            expireDate: expireDate
          }
        })
        
        console.log('✅ 用户更新结果:', userUpdate)
      }
      
      // 4. 返回成功响应给微信
      return {
        return_code: 'SUCCESS',
        return_msg: 'OK'
      }
      
    } catch (error) {
      console.error('❌ 支付回调处理失败:', error)
      return {
        return_code: 'FAIL',
        return_msg: '处理失败'
      }
    }
  }
  
  return {
    return_code: 'FAIL',
    return_msg: '支付未成功'
  }
}