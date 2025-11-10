// cloudfunctions/getOrderHistory/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 支付记录集合
const PAYMENT_COLLECTION = 'payment_records';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  console.log('📋 开始查询用户订单记录:', openid);
  
  try {
    // 验证用户登录状态
    if (!openid) {
      return {
        success: false,
        code: 401,
        message: '用户未登录'
      };
    }
    
    // 查询用户的支付记录
    const db = cloud.database();
    const result = await db.collection(PAYMENT_COLLECTION)
      .where({
        _openid: openid,
        status: 'success' // 只查询支付成功的记录
      })
      .orderBy('createTime', 'desc')
      .get();
    
    console.log('✅ 查询到订单记录:', result.data);
    
    // 格式化返回数据
    const orders = result.data.map(order => {
      return {
        _id: order._id,
        orderId: order.out_trade_no || order._id,
        packageType: order.package_type || 'unknown',
        amount: order.total_fee ? (order.total_fee / 100).toFixed(2) : '0.00',
        status: 'completed',
        createTime: order.createTime || order.time_end || Date.now(),
        credits: this.getPackageCredits(order.package_type),
        expireTime: this.calculateExpireTime(order.createTime, order.package_type)
      };
    });
    
    return {
      success: true,
      code: 200,
      message: '获取成功',
      data: orders
    };
    
  } catch (error) {
    console.error('❌ 查询订单记录失败:', error);
    return {
      success: false,
      code: 500,
      message: '查询失败：' + error.message,
      data: []
    };
  }
};

// 根据套餐类型获取次数
function getPackageCredits(packageType) {
  const creditsMap = {
    'basic': 10,
    'popular': 30,
    'unlimited': 100,
    'member': 999 // 会员显示为无限次
  };
  return creditsMap[packageType] || 0;
}

// 计算过期时间
function calculateExpireTime(createTime, packageType) {
  const createDate = new Date(createTime);
  const validityMap = {
    'basic': 30, // 30天
    'popular': 60, // 60天
    'unlimited': 90, // 90天
    'member': 365 // 会员一年
  };
  
  const validityDays = validityMap[packageType] || 30;
  createDate.setDate(createDate.getDate() + validityDays);
  
  return createDate.getTime();
}