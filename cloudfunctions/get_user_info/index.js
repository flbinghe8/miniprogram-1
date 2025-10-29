const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const USER_COLLECTION = 'user_profiles';
const DEFAULT_TRIALS = 3;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  try {
    const userRes = await db.collection(USER_COLLECTION).doc(userId).get();
    let userData = userRes.data;
    
    // 🆕【核心修复】智能处理新旧数据格式
    let trialUsed = 0;
    let paidCredits = 0;
    let phoneNumber = '';
    
    if (userData.trialUsed !== undefined) {
      // 新数据格式 - 直接使用现有字段
      trialUsed = userData.trialUsed || 0;
      paidCredits = userData.paidCredits || 0;
      phoneNumber = userData.phoneNumber || '';
    } else {
      // 🆕 旧数据格式自动转换
      if (userData.credits >= 0) {
        trialUsed = Math.max(0, 3 - userData.credits);
      } else {
        trialUsed = 3; // 试用已用完
      }
      paidCredits = 0;
      phoneNumber = '';
    }
    
    const remainingTrials = Math.max(0, DEFAULT_TRIALS - trialUsed);
    const totalCredits = remainingTrials + paidCredits;
    
    return {
      success: true,
      data: {
        openid: userId,          // ✅ 新增
        trialUsed: trialUsed,
        remainingTrials: remainingTrials,
        paidCredits: paidCredits,
        totalCredits: totalCredits,
        phoneNumber: phoneNumber,
        
        // 兼容旧字段 - 确保现有页面不报错
        credits: totalCredits,
        expireDate: userData.expireDate || null,
        isMember: userData.isMember || false,
        _id: userData._id
      }
    };

  } catch (e) {
    // 🆕【核心修复】用户记录不存在 - 创建新用户
    if (e.errCode === 10002) {
      console.log('🆕 创建新用户，OPENID:', userId);
      
      const newUserProfile = {
        _id: userId, // 🆕 关键：使用OPENID作为_id
        trialUsed: 0,
        paidCredits: 0,
        phoneNumber: '',
        credits: DEFAULT_TRIALS, // 🆕 关键：初始3次
        isMember: false,
        createdTime: db.serverDate(),
        updatedTime: db.serverDate()
      };
      
      await db.collection(USER_COLLECTION).add({ data: newUserProfile });
      
      console.log('✅ 新用户创建成功，分配3次试用');
      
      return {
        success: true,
        data: {
          openid: userId,
          trialUsed: 0,
          remainingTrials: DEFAULT_TRIALS,
          paidCredits: 0,
          totalCredits: DEFAULT_TRIALS,
          phoneNumber: '',
          credits: DEFAULT_TRIALS,
          expireDate: null,
          isMember: false,
          _id: userId
        }
      };
    }
    
    console.error('❌ 获取用户额度失败:', e);
    return { 
      success: false, 
      error: e.message,
      data: { credits: 0, expireDate: null, _id: userId }
    };
  }
};