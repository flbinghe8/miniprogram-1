const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  
  const { credits, type = 'use' } = event

  try {
    // 获取用户当前数据
    const userRes = await db.collection('user_profiles').doc(userId).get()
    const userData = userRes.data
    
    let updateData = {}
    
    if (type === 'add') {
      // 购买套餐：增加付费次数
      updateData.paidCredits = (userData.paidCredits || 0) + credits
      console.log(`为用户 ${userId} 增加 ${credits} 次付费额度`)
    } else if (type === 'use') {
      // 使用次数：先试用后付费 - 修复逻辑
      const remainingTrials = Math.max(0, 3 - (userData.trialUsed || 0))
      const currentPaidCredits = userData.paidCredits || 0
      
      if (remainingTrials > 0) {
        // 使用试用次数
        updateData.trialUsed = (userData.trialUsed || 0) + 1
        console.log(`使用1次试用额度，剩余试用: ${remainingTrials - 1}`)
      } else if (currentPaidCredits > 0) {
        // 使用付费次数
        updateData.paidCredits = currentPaidCredits - 1
        console.log(`使用1次付费额度，剩余付费: ${currentPaidCredits - 1}`)
      } else {
        throw new Error('次数不足，请购买套餐')
      }
    }
    
    updateData.updatedTime = db.serverDate()
    
    // 更新用户数据
    await db.collection('user_profiles').doc(userId).update({
      data: updateData
    })
    
    return {
      success: true,
      message: '用户次数更新成功',
      data: {
        paidCredits: updateData.paidCredits,
        trialUsed: updateData.trialUsed
      }
    }
    
  } catch (error) {
    console.error('更新用户次数失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}