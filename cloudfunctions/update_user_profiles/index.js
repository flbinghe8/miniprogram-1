const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 1. 获取所有用户记录
    const userRes = await db.collection('user_profiles').get()
    console.log(`找到 ${userRes.data.length} 个用户需要更新`)
    
    let successCount = 0
    let errorCount = 0
    
    // 2. 遍历每个用户，更新字段
    for (const user of userRes.data) {
      try {
        // 计算已用试用次数
        let trialUsed = 0
        if (user.credits >= 0) {
          trialUsed = Math.max(0, 3 - user.credits)
        } else {
          trialUsed = 3 // 试用次数已用完
        }
        
        // 更新用户记录
        await db.collection('user_profiles').doc(user._id).update({
          data: {
            trialUsed: trialUsed,
            paidCredits: 0, // 付费次数初始为0
            phoneNumber: '' // 手机号初始为空
          }
        })
        
        console.log(`✅ 更新用户 ${user._id} 成功，trialUsed: ${trialUsed}`)
        successCount++
        
      } catch (userError) {
        console.error(`❌ 更新用户 ${user._id} 失败:`, userError)
        errorCount++
      }
    }
    
    return {
      success: true,
      message: `更新完成！成功: ${successCount}个，失败: ${errorCount}个`,
      total: userRes.data.length,
      successCount: successCount,
      errorCount: errorCount
    }
    
  } catch (error) {
    console.error('❌ 更新过程发生错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}