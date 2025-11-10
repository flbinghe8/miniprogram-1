const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const USER_COLLECTION = 'user_profiles'; 
const HISTORY_COLLECTION = 'generation_history';
const INITIAL_CREDITS = 2;

// Coze API配置 - 使用旧版格式
const COZE_API_KEY = 'pat_du98MUrMoXsaTRSS8c1resbXWLvevR4LLp9RPSnEB0ac7Iqmq7Igep1USdRXvoH6';
const COZE_BOT_ID = '7559594025792847913';
const WORKFLOW_ID_ADS = '7559119531407933476';
const WORKFLOW_ID_SEO = '7561711043837558794';
const WORKFLOW_ID_SOP = '7559465853566255158';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  console.log('=== 🚀 开始云函数执行 ===');
  console.log('🔍 用户ID:', userId);

  try {
    // 1. 额度检查与扣减
    console.log('💰 开始额度检查...');
    const { success: deductionSuccess, errorMessage } = await deductCredit(userId);
    if (!deductionSuccess) {
      return { 
        success: false, 
        error: errorMessage
      };
    }
    console.log('✅ 额度检查通过');

    // 2. Coze API 调用准备
    console.log('🚀 准备Coze API调用...');
    
    let workflow_id;
    let content = {};
    
    if (event.workflowType === 'sop') {
      workflow_id = WORKFLOW_ID_SOP;
      content = {
        productName: event.productName,
        productFunctions: event.productFunctions,
        productParameters: event.productParameters,
        targetAudience: event.targetAudience
      };
    } else if (event.workflowType === 'ads') {
      workflow_id = WORKFLOW_ID_ADS;
      content = {
        business_goal: event.businessGoal,
        raw_data: event.rawData
      };
    } else if (event.workflowType === 'seo') {
      workflow_id = WORKFLOW_ID_SEO;
      content = { 
        product_name: event.product_name, 
        product_features: event.product_features, 
        core_keywords: event.core_keywords, 
        long_tail_keywords: event.long_tail_keywords, 
        target_audience: event.target_audience, 
        brand_name: event.brand_name
      };
    }

    console.log('🎯 工作流ID:', workflow_id);
    console.log('📤 发送内容:', content);

    // 3. 调用Coze API（使用旧版v3格式）
    const response = await cloud.callFunction({
      name: 'cozeHttpProxy',
      data: {
        url: 'https://api.coze.cn/v3/workflow/execute',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          workflow_id: workflow_id,
          parameters: {
            content: JSON.stringify(content),
            workflow_type: event.workflowType
          }
        }
      }
    });

    console.log('📥 Coze API响应:', response);

    if (!response.result.success) {
      throw new Error(response.result.error || 'Coze API调用失败');
    }

    // 4. 记录历史
    await db.collection(HISTORY_COLLECTION).add({
      _openid: userId,
      workflowType: event.workflowType,
      reportContent: JSON.stringify(response.result.data),
      createdTime: db.serverDate()
    });

    return {
      success: true,
      result: response.result.data
    };

  } catch (error) {
    console.error('❌ 云函数错误:', error);
    // 回滚额度
    await rollbackCredit(userId);
    return {
      success: false,
      error: error.message
    };
  }
};

// ----------------------------------------------------
// 【额度扣减函数 - 必须添加】
// ----------------------------------------------------
async function deductCredit(userId) {
  try {
    console.log('💰 开始额度扣减，用户:', userId);
    
    // ✅ 统一使用 _openid 查询
    const userRes = await db.collection(USER_COLLECTION).where({ _openid: userId }).get();
    let userData = userRes.data[0];
    
    if (!userData) {
      // ✅ 创建新用户
      console.log('🆕 创建新用户，trialUsed: 0');
      const newUser = {
        _openid: userId,
        trialUsed: 0,
        trialTotal: 2,
        paidCredits: 0,
        isMember: false,
        createdTime: db.serverDate(),
        updatedTime: db.serverDate(),
        lastActive: db.serverDate()
      };
      
      await db.collection(USER_COLLECTION).doc(userId).set({
        data: newUser
      });
      
      userData = newUser;
      console.log('✅ 新用户创建成功');
    }
    
    const trialUsed = Math.min(userData.trialUsed || 0, 2);
    const remainingTrials = Math.max(0, 2 - trialUsed);
    const paidCredits = userData.paidCredits || 0;
    const totalCredits = remainingTrials + paidCredits;
    
    console.log('💳 当前额度:', { trialUsed, remainingTrials, totalCredits });
    
    if (totalCredits <= 0) {
      return { success: false, errorMessage: "额度已用完，请购买套餐。" };
    }

    let updateData = { 
      updatedTime: db.serverDate(),
      lastActive: db.serverDate()
    };

    if (remainingTrials > 0) {
      updateData.trialUsed = trialUsed + 1;
    } else {
      updateData.paidCredits = paidCredits - 1;
    }

    await db.collection(USER_COLLECTION).doc(userData._id).update({ data: updateData });
    
    console.log('✅ 额度扣减成功');
    return { success: true, errorMessage: '' };

  } catch (e) {
    console.error('❌ 额度扣减失败:', e);
    return { success: false, errorMessage: '系统繁忙' };
  }
}

// ----------------------------------------------------
// 【额度回滚函数 - 必须添加】
// ----------------------------------------------------
async function rollbackCredit(userId) {
  try {
    console.log('🔄 开始回滚额度，用户:', userId);
    
    // 使用 _openid 查询
    const userRes = await db.collection(USER_COLLECTION).where({ _openid: userId }).get();
    
    if (userRes.data.length === 0) {
      console.log('❌ 用户不存在，无法回滚');
      return;
    }
    
    const userData = userRes.data[0];
    let updateData = {
      updatedTime: db.serverDate()
    };
    
    const trialUsed = userData.trialUsed || 0;
    if (trialUsed > 0) {
      updateData.trialUsed = trialUsed - 1;
      console.log('🔄 回滚1次试用额度');
    } else {
      const paidCredits = userData.paidCredits || 0;
      updateData.paidCredits = paidCredits + 1;
      console.log('🔄 回滚1次付费额度');
    }
    
    await db.collection(USER_COLLECTION).doc(userData._id).update({ data: updateData });
    console.log('✅ 额度回滚成功');
  } catch (e) {
    console.error('❌ 额度回滚失败:', e);
  }
}