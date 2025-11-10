const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const USER_COLLECTION = 'user_profiles';
const DEFAULT_TRIALS = 2; // ✅ 登录用户固定2次

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  console.log('🔍 get_user_info 用户ID:', userId);

  try {
    const userRes = await db.collection(USER_COLLECTION)
      .where({ _openid: userId })
      .get();

    let userData = null;

    if (userRes.data.length === 0) {
      // ✅ 新用户：重置为完整的2次
      const newUser = {
        _openid: userId,
        trialUsed: 0,
        trialTotal: DEFAULT_TRIALS,
        paidCredits: 0,
        isMember: false,
        createdTime: db.serverDate(),
        updatedTime: db.serverDate(),
        expireDate: null
      };
      
      await db.collection(USER_COLLECTION).add({ data: newUser });
      const freshRes = await db.collection(USER_COLLECTION)
        .where({ _openid: userId })
        .get();
      userData = freshRes.data[0];
    } else {
      userData = userRes.data[0];
    }

    // ✅ 保护逻辑
    const trialUsed = Math.min(userData.trialUsed || 0, DEFAULT_TRIALS);
    const remainingTrials = Math.max(0, DEFAULT_TRIALS - trialUsed);
    const totalCredits = remainingTrials + (userData.paidCredits || 0);
    
    const isMember = userData.isMember && userData.expireDate ? 
      new Date(userData.expireDate) > new Date() : false;
    
    const userType = isMember ? 'member' : (userData.paidCredits > 0 ? 'paid' : 'trial');

    return {
      success: true,
      data: {
        userType,
        isMember,
        remainingTrials,
        paidCredits: userData.paidCredits || 0,
        totalCredits,
        trialUsed,
        trialTotal: DEFAULT_TRIALS,
        expireDate: userData.expireDate,
        openid: userId
      }
    };

  } catch (e) {
    console.error('❌ get_user_info 错误:', e);
    return { success: false, error: e.message };
  }
};