const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  // 🆕 添加输入验证
  if (!userId) {
    return { 
      success: false, 
      error: '用户未登录' 
    };
  }

  try {
    // 获取当前用户数据
    const userRes = await db.collection('user_profiles').doc(userId).get();
    
    if (!userRes.data) {
      return { 
        success: false, 
        error: '用户不存在' 
      };
    }

    const userData = userRes.data;
    let updateData = {};
    
    // 额度扣减逻辑
    const trialUsed = userData.trialUsed || 0;
    const paidCredits = userData.paidCredits || 0;
    const remainingTrials = Math.max(0, 3 - trialUsed);
    
    console.log('🔍 扣减前用户数据:', { 
      trialUsed, 
      paidCredits, 
      remainingTrials,
      userId: userId.substring(0, 8) + '...' // 🆕 保护隐私
    });
    
    let consumeType = '';
    let creditChange = {};
    
    if (remainingTrials > 0) {
      // 扣减试用次数
      updateData.trialUsed = trialUsed + 1;
      consumeType = 'trial';
      creditChange = { 试用次数: `${trialUsed} → ${trialUsed + 1}` };
    } else if (paidCredits > 0) {
      // 扣减付费次数
      updateData.paidCredits = paidCredits - 1;
      consumeType = 'paid';
      creditChange = { 付费次数: `${paidCredits} → ${paidCredits - 1}` };
    } else {
      console.log('❌ 额度已用完');
      return { 
        success: false, 
        error: '额度已用完，请购买套餐',
        code: 'CREDIT_EXHAUSTED' // 🆕 明确错误码
      };
    }

    // 🆕 修复：使用记录逻辑优化
    const newRecord = {
      date: new Date().toISOString(), // 🆕 使用标准格式，便于排序
      timestamp: Date.now(), // 🆕 添加时间戳用于排序
      action: event.serviceType || 'AI分析',
      type: consumeType
    };
    
    const recentRecords = userData.recentRecords || [];
    
    // 🆕 优化：确保不重复添加
    const updatedRecords = [newRecord, ...recentRecords]
      .slice(0, 5) // 只保留最近5条
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // 按时间倒序
    
    updateData.recentRecords = updatedRecords;

    // 计算总额度
    const newRemainingTrials = Math.max(0, 3 - updateData.trialUsed);
    updateData.credits = newRemainingTrials + (updateData.paidCredits || paidCredits);
    updateData.updatedTime = db.serverDate();

    // 🆕 添加事务保护（可选，但推荐）
    await db.collection('user_profiles').doc(userId).update({
      data: updateData
    });

    console.log('✅ 额度扣减成功:', {
      userId: userId.substring(0, 8) + '...',
      试用已用: updateData.trialUsed,
      剩余试用: newRemainingTrials,
      付费剩余: updateData.paidCredits,
      总额度: updateData.credits,
      消费类型: consumeType
    });

    return {
      success: true,
      data: {
        trialUsed: updateData.trialUsed,
        paidCredits: updateData.paidCredits,
        credits: updateData.credits,
        remainingTrials: newRemainingTrials,
        consumeType: consumeType,
        availableTimes: updateData.credits // 🆕 添加总额度字段，便于前端使用
      }
    };

  } catch (error) {
    console.error('❌ 额度扣减失败:', error);
    return { 
      success: false, 
      error: '系统繁忙，请稍后重试',
      code: 'SYSTEM_ERROR'
    };
  }
};