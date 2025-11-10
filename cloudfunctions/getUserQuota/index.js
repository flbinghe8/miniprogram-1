// cloudfunctions/getUserQuota/index.js - 优化完整版
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  try {
    // 直接查询用户数据
    const userRes = await db.collection('user_profiles').where({ _openid: userId }).get();
    
    if (userRes.data.length === 0) {
      // 新用户返回默认试用数据
      return {
        code: 200,
        data: {
          userType: 'trial',
          isMember: false,
          remainingTrials: 3,
          paidCredits: 0,
          totalCredits: 3,
          trialUsed: 0,
          expireDate: null
        }
      };
    }

    const userData = userRes.data[0];
    
    // 统一计算逻辑
    const trialUsed = userData.trialUsed || 0;
    const paidCredits = userData.paidCredits || 0;
    const remainingTrials = Math.max(0, 3 - trialUsed);
    const totalCredits = remainingTrials + paidCredits;
    
    // 简化会员判断逻辑
    const isMember = userData.expireDate ? new Date(userData.expireDate) > new Date() : false;
    const userType = isMember ? 'member' : (paidCredits > 0 ? 'paid' : 'trial');

    return {
      code: 200,
      data: {
        userType,
        isMember,
        remainingTrials,
        paidCredits,
        totalCredits,
        trialUsed,
        expireDate: userData.expireDate,
        openid: userId
        // 移除 _id 增强安全性
      }
    };

  } catch (error) {
    console.error('❌ 查询额度失败:', error);
    return { 
      code: 500, 
      msg: '系统繁忙，请稍后重试', 
      data: null 
    };
  }
};