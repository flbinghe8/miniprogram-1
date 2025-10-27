// pages/paymentSuccess/paymentSuccess.js
Page({
  data: {
    packageName: '热销包',
    credits: 30,
    days: 60,
    price: 29,
    purchaseTime: ''
  },
  
  onLoad(options) {
    // 设置购买时间
    const now = new Date();
    const purchaseTime = `${now.getFullYear()}-${this.padZero(now.getMonth() + 1)}-${this.padZero(now.getDate())} ${this.padZero(now.getHours())}:${this.padZero(now.getMinutes())}`;
    
    this.setData({
      purchaseTime: purchaseTime
    });

    // 显示支付成功信息
    wx.showToast({
      title: '支付成功！',
      icon: 'success',
      duration: 2000
    });
  },

  // 补零函数
  padZero(num) {
    return num < 10 ? '0' + num : num;
  },
  
  backToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },
  
  continueBuy() {
    wx.navigateTo({
      url: '/pages/premium/packages/packages'
    });
  }
});