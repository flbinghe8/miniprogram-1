// pages/premium/orderHistory/orderHistory.js
Page({
  data: {
    orderList: [],
    isLoading: true,
    isEmpty: false
  },

  onLoad: function (options) {
    console.log('📋 开通记录页面加载');
    this.loadOrderHistory();
  },

  onShow: function() {
    this.loadOrderHistory();
  },

  loadOrderHistory: function() {
    this.setData({ isLoading: true });
    
    wx.cloud.callFunction({
      name: 'getOrderHistory',
      data: {}
    }).then(res => {
      console.log('✅ 订单记录获取成功:', res);
      
      if (res.result && res.result.success) {
        const orders = res.result.data || [];
        this.setData({
          orderList: this.formatOrders(orders),
          isLoading: false,
          isEmpty: orders.length === 0
        });
      } else {
        this.setData({ 
          isLoading: false,
          isEmpty: true 
        });
      }
    }).catch(err => {
      console.error('❌ 获取订单记录失败:', err);
      this.setData({ 
        isLoading: false,
        isEmpty: true 
      });
    });
  },

  formatOrders: function(orders) {
    return orders.map(order => {
      return {
        id: order._id || order.orderId,
        packageName: this.getPackageName(order.packageType),
        amount: order.amount || 0,
        status: order.status || 'completed',
        createTime: this.formatTime(order.createTime),
        expireTime: order.expireTime ? this.formatTime(order.expireTime) : '永久有效',
        credits: order.credits || 0
      };
    });
  },

  getPackageName: function(packageType) {
    const packageMap = {
      'basic': '基础包',
      'popular': '热销包', 
      'unlimited': '无限包',
      'member': '会员套餐'
    };
    return packageMap[packageType] || '未知套餐';
  },

  formatTime: function(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  },

  goToPackages: function() {
    console.log('🚀 跳转到套餐页面');
    wx.navigateTo({
      url: '/pages/premium/packages/packages',
      fail: (err) => {
        console.error('❌ 跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  goBack: function() {
    wx.navigateBack();
  }
});