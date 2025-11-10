const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const USER_COLLECTION = 'user_profiles';
const DEFAULT_TRIALS = 2; // 登录用户默认2次

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userOpenid = wxContext.OPENID;
  const { guestData } = event;

  console.log('🔄 开始合并游客数据:', { userOpenid, guestData });

  try {
    const userRes = await db.collection(USER_COLLECTION)
      .where({ _openid: userOpenid })
      .get();

    let userRecord;
    
    if (userRes.data.length === 0) {
      const guestTrialUsed = guestData.trialUsed || 0;
      userRecord = {
        _openid: userOpenid,
        trialUsed: guestTrialUsed, // ✅ 继承游客已用次数
        trialTotal: DEFAULT_TRIALS,
        paidCredits: 0,
        isMember: false,
        // ✅ 新用户标记已合并（防止后续重复累加）
        mergedGuest: true,
        createdTime: db.serverDate(),
        updatedTime: db.serverDate(),
        expireDate: null
      };
      
      await db.collection(USER_COLLECTION).add({ data: userRecord });

      // ✅ 日志：新用户额度详情
      console.log('📊 新用户额度计算:', {
        游客已用: guestTrialUsed,
        合并后已用: userRecord.trialUsed,
        默认总额: DEFAULT_TRIALS,
        最终剩余: Math.max(0, DEFAULT_TRIALS - userRecord.trialUsed)
      });
      
      console.log('✅ 新用户创建成功，trialUsed:', userRecord.trialUsed);
    } else {
      userRecord = userRes.data[0];
      const currentTrialUsed = userRecord.trialUsed || 0;
      const guestTrialUsed = guestData.trialUsed || 0;
      
      // ✅ 核心修复：防止重复累加游客数据
      if (!userRecord.mergedGuest && guestTrialUsed > 0) {
        const mergedTrialUsed = currentTrialUsed + guestTrialUsed;
        await db.collection(USER_COLLECTION).doc(userRecord._id).update({
          data: {
            trialUsed: mergedTrialUsed,
            mergedGuest: true, // ✅ 标记已合并
            updatedTime: db.serverDate()
          }
        });
        userRecord.trialUsed = mergedTrialUsed; // ✅ 更新内存值，确保返回最新数据

        // ✅ 日志：老用户合并额度详情
        console.log('📊 老用户合并额度计算:', {
          游客已用: guestTrialUsed,
          用户原已用: currentTrialUsed,
          合并后已用: mergedTrialUsed,
          默认总额: DEFAULT_TRIALS,
          最终剩余: Math.max(0, DEFAULT_TRIALS - mergedTrialUsed)
        });

        console.log('✅ 首次合并游客数据，累加后 trialUsed:', mergedTrialUsed);
      } else {
        console.log('⚠️ 游客数据已合并过，跳过');
      }
    }

    const finalUserData = {
      userType: userRecord.paidCredits > 0 ? 'paid' : 'trial',
      isMember: userRecord.isMember || false,
      remainingTrials: Math.max(0, DEFAULT_TRIALS - (userRecord.trialUsed || 0)),
      paidCredits: userRecord.paidCredits || 0,
      totalCredits: Math.max(0, DEFAULT_TRIALS - (userRecord.trialUsed || 0)) + (userRecord.paidCredits || 0),
      trialUsed: userRecord.trialUsed || 0,
      trialTotal: DEFAULT_TRIALS,
      expireDate: userRecord.expireDate || null,
      openid: userOpenid
    };

    return {
      success: true,
      data: finalUserData
    };

  } catch (error) {
    console.error('❌ 合并游客数据失败:', error);
    return {
      success: false,
      error: error.message,
      code: 'MERGE_FAILED'
    };
  }
};