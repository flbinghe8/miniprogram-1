// pages/premium/packages/packages.js - 正式版
Page({
  data: {
    selectedPackage: '',
    touchPackage: '',
    isLoggedIn: false
  },

  onLoad: function () {
    console.log('🎯 套餐页面加载');
    this.checkLoginState();
  },

  onShow: function() {
    console.log('🔄 套餐页面显示');
    this.checkLoginState();
  },

  checkLoginState: function() {
    const app = getApp();
    const storageLogin = wx.getStorageSync('isLoggedIn');
    const globalLogin = app.globalData.isLoggedIn;
    const isLoggedIn = storageLogin || globalLogin;
    
    this.setData({ 
      isLoggedIn: isLoggedIn
    });
  },

  selectPackage: function (e) {
    const packageId = e.currentTarget.dataset.id;
    this.setData({ selectedPackage: packageId });
  },

  buyPackage: function (e) {
    const packageId = e.currentTarget.dataset.id;
    
    if (!packageId) {
      wx.showToast({ title: '系统错误', icon: 'none' });
      return;
    }
    
    // 检查登录状态
    const app = getApp();
    const storageLogin = wx.getStorageSync('isLoggedIn');
    const globalLogin = app.globalData.isLoggedIn;
    const isLoggedIn = storageLogin || globalLogin;
    
    if (!isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '购买套餐需要先登录账号',
        confirmText: '立即登录',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      return;
    }

    // 跳转到支付页面
    const targetUrl = '/pages/payment/payment?packageType=' + packageId;
    wx.navigateTo({
      url: targetUrl,
      fail: (err) => {
        wx.showModal({
          title: '跳转失败',
          content: '无法打开支付页面，请稍后重试',
          showCancel: false
        });
      }
    });
  },

  goBack: function () {
    wx.navigateBack();
  },

  onCardTouchStart: function (e) {
    this.setData({ touchPackage: e.currentTarget.dataset.id });
  },

  onCardTouchEnd: function () {
    this.setData({ touchPackage: '' });
  }
});