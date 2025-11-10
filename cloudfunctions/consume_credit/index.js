const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const USER_COLLECTION = 'user_profiles';
const DEFAULT_TRIALS = 2; // ✅ 统一常量
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { isGuest = false, guestData = null } = event;

  console.log('🔍 consume_credit 被调用 >>>', { userId, isGuest });

  try {
    if (isGuest && guestData) {
      return await handleGuestConsume(guestData);
    } else if (userId) {
      return await handleUserConsume(userId);
    } else {
      return { success: false, error: '用户身份不明确', code: 'USER_IDENTITY_ERROR' };
    }
  } catch (error) {
    console.error('❌ 额度扣减失败:', error);
    return { success: false, error: '系统繁忙', code: 'SYSTEM_ERROR' };
  }
};

async function handleGuestConsume(guestData) {
  const { trialUsed = 0 } = guestData;
  
  if (trialUsed >= 1) {
    return { success: false, error: '试用次数已用完，请注册获取更多次数', code: 'GUEST_CREDIT_EXHAUSTED' };
  }

  const newTrialUsed = trialUsed + 1;
  const newRemainingTrials = Math.max(0, 1 - newTrialUsed);
  
  return {
    success: true,
    data: {
      trialUsed: newTrialUsed,
      remainingTrials: newRemainingTrials,
      totalCredits: newRemainingTrials,
      userType: 'guest'
    },
    consumeType: 'guest_trial'
  };
}

async function handleUserConsume(userId) {
  let userData;
  
  try {
    // ✅ 使用 _openid 查询，与 get_user_info 保持一致
    const userRes = await db.collection(USER_COLLECTION)
      .where({ _openid: userId })
      .get();
    
    if (userRes.data.length === 0) {
      // 用户不存在，自动创建
      console.log('🆕 用户不存在，自动创建');
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
      
      // 重新查询
      const freshRes = await db.collection(USER_COLLECTION)
        .where({ _openid: userId })
        .get();
      userData = freshRes.data[0];
    } else {
      userData = userRes.data[0];
    }
  } catch (e) {
    console.error('❌ 查询用户失败:', e);
    return { success: false, error: '查询失败', code: 'QUERY_ERROR' };
  }

  if (!userData) {
    return { success: false, error: '用户不存在', code: 'USER_NOT_FOUND' };
  }

  // ✅ 扣减逻辑（保持不变）
  const trialUsed = Math.min(userData.trialUsed || 0, DEFAULT_TRIALS);
  const paidCredits = userData.paidCredits || 0;
  const remainingTrials = Math.max(0, DEFAULT_TRIALS - trialUsed);
  
  let consumeType = '';
  let updateData = { updatedTime: db.serverDate() };
  
  if (remainingTrials > 0) {
    updateData.trialUsed = trialUsed + 1;
    consumeType = 'trial';
  } else if (paidCredits > 0) {
    updateData.paidCredits = paidCredits - 1;
    consumeType = 'paid';
  } else {
    return { success: false, error: '额度已用完，请购买套餐', code: 'CREDIT_EXHAUSTED' };
  }

  await db.collection(USER_COLLECTION).doc(userData._id).update({ data: updateData });

  const newTrialUsed = updateData.trialUsed || trialUsed;
  const newRemainingTrials = Math.max(0, DEFAULT_TRIALS - newTrialUsed);
  const newPaidCredits = updateData.paidCredits || paidCredits;

  return {
    success: true,
    data: {
      trialUsed: newTrialUsed,
      paidCredits: newPaidCredits,
      remainingTrials: newRemainingTrials,
      totalCredits: newRemainingTrials + newPaidCredits,
      consumeType: consumeType
    }
  };
}