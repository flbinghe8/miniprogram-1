// cloudfunctions/updateUserProfile/index.js - 优化完整版
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { phoneNumber } = event

  // 参数验证
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      success: false,
      error: '手机号参数无效'
    }
  }

  // 简单的手机号格式验证（可选）
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneNumber)) {
    return {
      success: false,
      error: '手机号格式不正确'
    }
  }

  try {
    // 1. 先检查用户是否存在
    const userRes = await db.collection('user_profiles').where({ 
      _openid: userId 
    }).get()
    
    if (userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    // 2. 更新用户手机号
    const updateResult = await db.collection('user_profiles').where({
      _openid: userId
    }).update({
      data: {
        phoneNumber: phoneNumber,
        updatedTime: db.serverDate()
      }
    })

    // 3. 检查更新结果
    if (updateResult.stats.updated === 0) {
      return {
        success: false,
        error: '更新失败，请重试'
      }
    }

    return {
      success: true,
      message: '手机号更新成功',
      data: {
        phoneNumber: phoneNumber,
        updatedTime: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('更新手机号失败:', error)
    return {
      success: false,
      error: error.message || '系统错误，请稍后重试'
    }
  }
}