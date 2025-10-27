// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('[analytics]', event)   // 先在日志里能看到就行
  return { errCode: 0, errMsg: 'ok' }
}