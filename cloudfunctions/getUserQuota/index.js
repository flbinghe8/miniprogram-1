const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  console.log('🔍 查询用户额度:', userId);

  // 🆕 添加输入验证
  if (!userId) {
    return {
      code: 400,
      msg: '用户ID不能为空',
      data: null
    };
  }

  try {
    // 获取用户数据
    const userRes = await db.collection('user_profiles').doc(userId).get();
    
    if (!userRes.data) {
      return { 
        code: 404, 
        msg: '用户不存在',
        data: null 
      };
    }

    const user = userRes.data;

    // 计算关键数据
    const now = new Date();
    const trialUsed = user.trialUsed || 0;
    const paidCredits = user.paidCredits || 0;
    const remainingTrials = Math.max(0, 3 - trialUsed);
    const totalAvailable = remainingTrials + paidCredits;
    
    // 🆕 修复：更安全的日期检查
    let isMember = false;
    let daysRemaining = 0;
    
    if (user.expireDate) {
      const expireDate = new Date(user.expireDate);
      if (!isNaN(expireDate.getTime())) { // 验证日期有效性
        isMember = expireDate > now;
        daysRemaining = isMember ? 
          Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)) : 0;
      }
    }

    // 确定套餐类型
    let packageType = '试用包';
    if (isMember) {
      packageType = '会员无限';
    } else if (paidCredits > 0) {
      packageType = `付费包 (${paidCredits}次)`;
    }

    console.log('✅ 额度查询结果:', {
      userId: userId.substring(0, 8) + '...', // 🆕 保护用户隐私
      totalAvailable,
      trialUsed,
      paidCredits,
      packageType
    });

    return {
      code: 200,
      data: {
        // 核心额度信息
        availableTimes: totalAvailable,
        trialRemaining: remainingTrials,
        paidRemaining: paidCredits,
        usedTimes: trialUsed,
        totalTrials: 3,
        
        // 套餐信息
        packageType: packageType,
        expireDate: user.expireDate || '',
        daysRemaining: daysRemaining,
        
        // 使用记录
        recentRecords: user.recentRecords || [],
        
        // 状态标识
        isMember: isMember,
        hasTrialLeft: remainingTrials > 0,
        hasPaidLeft: paidCredits > 0
      }
    };

  } catch (error) {
    console.error('❌ 查询额度失败:', error);
    return {
      code: 500,
      msg: '系统繁忙，请稍后重试', // 🆕 更友好的错误提示
      data: null
    };
  }
};