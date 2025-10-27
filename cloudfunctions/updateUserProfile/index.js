const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    await db.collection('user_profiles').doc(userId).update({
      data: {
        phoneNumber: event.phoneNumber,
        updatedTime: db.serverDate()
      }
    })

    return {
      success: true,
      message: '手机号更新成功'
    }
  } catch (error) {
    console.error('更新手机号失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}