// pages/premium/packages/packages.js - 添加登录检查
Page({
  data: {
    selectedPackage: '',
    touchPackage: ''
  },

  onLoad: function () {
    console.log('套餐页面加载');
    
    // 🆕 登录守门员
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '购买套餐需要先登录账号',
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            // 跳转到个人中心页
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      return;
    }
    
    // 已登录，正常加载
    console.log('✅ 用户已登录，显示套餐页面');
  },

  goBack: function () {
    wx.navigateBack();
  },

  selectPackage: function (e) {
    this.setData({ selectedPackage: e.currentTarget.dataset.id });
  },

  onCardTouchStart: function (e) {
    this.setData({ touchPackage: e.currentTarget.dataset.id });
  },

  onCardTouchEnd: function () {
    this.setData({ touchPackage: '' });
  },

  buyPackage: function (e) {
    console.log('>>> buyPackage 被点击', e.currentTarget.dataset.id);
    const packageId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/payment/payment?packageType=' + packageId
    });
  }
});