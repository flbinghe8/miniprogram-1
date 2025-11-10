// cloudfunctions/update_user_credits/index.js - 优化完整版
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  
  const { credits, type = 'use' } = event;

  // 参数验证
  if (type === 'add' && (!credits || credits <= 0)) {
    return { success: false, error: '增加次数必须为正整数' };
  }

  try {
    // 使用 where 查询，更可靠
    const userRes = await db.collection('user_profiles').where({ 
      _openid: userId 
    }).get();
    
    if (userRes.data.length === 0) {
      return { success: false, error: '用户不存在' };
    }

    const userData = userRes.data[0];
    let updateData = {};
    
    // 统一扣减逻辑
    if (type === 'add') {
      // 增加付费次数
      const currentPaidCredits = userData.paidCredits || 0;
      const currentTrialUsed = userData.trialUsed || 0;
      const remainingTrials = Math.max(0, 3 - currentTrialUsed);
      
      updateData.paidCredits = currentPaidCredits + credits;
      updateData.totalCredits = remainingTrials + (currentPaidCredits + credits);
      
    } else if (type === 'use') {
      // 统一试用次数计算
      const remainingTrials = Math.max(0, 3 - (userData.trialUsed || 0));
      const currentPaidCredits = userData.paidCredits || 0;
      
      if (remainingTrials > 0) {
        // 使用试用次数
        updateData.trialUsed = (userData.trialUsed || 0) + 1;
        updateData.totalCredits = (remainingTrials - 1) + currentPaidCredits;
      } else if (currentPaidCredits > 0) {
        // 使用付费次数
        updateData.paidCredits = currentPaidCredits - 1;
        updateData.totalCredits = currentPaidCredits - 1; // 试用次数已用完
      } else {
        return { 
          success: false, 
          error: '次数不足，请购买套餐',
          data: {
            remainingTrials: 0,
            paidCredits: 0,
            totalCredits: 0
          }
        };
      }
    }
    
    updateData.updatedTime = db.serverDate();
    
    // 更新用户数据
    await db.collection('user_profiles').where({
      _openid: userId
    }).update({
      data: updateData
    });
    
    // 获取更新后的数据
    const updatedUser = await db.collection('user_profiles').where({
      _openid: userId
    }).get();
    
    const finalData = updatedUser.data[0];
    const finalRemainingTrials = Math.max(0, 3 - (finalData.trialUsed || 0));
    const finalPaidCredits = finalData.paidCredits || 0;
    
    return {
      success: true,
      message: type === 'add' ? '次数添加成功' : '次数使用成功',
      data: {
        remainingTrials: finalRemainingTrials,
        paidCredits: finalPaidCredits,
        totalCredits: finalRemainingTrials + finalPaidCredits,
        trialUsed: finalData.trialUsed || 0
      }
    };
    
  } catch (error) {
    console.error('更新用户次数失败:', error);
    return { 
      success: false, 
      error: error.message,
      data: null
    };
  }
};