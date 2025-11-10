// pages/payment/payment.js - 修复版
Page({
  data: {
    productInfo: {
      name: '基础包',
      description: '10次AI分析，30天内有效',
      price: 9.9
    },
    isLoading: false,
    packageType: 'basic',
    isLoggedIn: false
  },

  onLoad(options) {
    console.log('💰 支付页面加载，参数:', options);
    
    // 🆕 修复：先设置数据，再检查登录
    if (options.packageType) {
      this.setData({ packageType: options.packageType });
      this.setProductInfo(options.packageType);
    }
    
    // 🆕 修复：延迟检查登录状态
    setTimeout(() => {
      this.checkLoginState();
    }, 100);
  },

  onShow() {
    console.log('🔄 支付页面显示');
    this.checkLoginState();
  },

  // 🆕 修复：登录检查改为警告，不阻断流程
  checkLoginState() {
    const app = getApp();
    const storageLogin = wx.getStorageSync('isLoggedIn');
    const globalLogin = app.globalData.isLoggedIn;
    const isLoggedIn = storageLogin || globalLogin;
    
    console.log('🔍 支付页面登录状态:', {
      存储: storageLogin,
      全局: globalLogin,
      最终: isLoggedIn
    });
    
    this.setData({ isLoggedIn: isLoggedIn });
    
    if (!isLoggedIn) {
      console.log('⚠️ 支付页面：用户未登录，但允许继续操作');
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
    }
    
    return isLoggedIn;
  },

  setProductInfo(packageType) {
    const packages = {
      'basic': { name: '基础包', description: '10次AI分析，30天内有效', price: 9.9 },
      'popular': { name: '热销包', description: '30次AI分析，60天内有效', price: 29 },
      'unlimited': { name: '无限包', description: '100次AI分析，90天内有效', price: 99 }
    };
    const selectedPackage = packages[packageType] || packages.basic;
    this.setData({ productInfo: selectedPackage });
  },

  onPayButtonClick() {
    console.log('🛒 支付按钮点击');
    
    if (this.data.isLoading) return;
    
    // 🆕 修复：支付前最终登录检查
    const app = getApp();
    const storageLogin = wx.getStorageSync('isLoggedIn');
    const globalLogin = app.globalData.isLoggedIn;
    const finalLoginCheck = storageLogin || globalLogin;
    
    console.log('🔍 支付前最终登录检查:', {
      存储: storageLogin,
      全局: globalLogin,
      最终: finalLoginCheck
    });
    
    if (!finalLoginCheck) {
      console.log('❌ 支付前最终检查：用户未登录');
      wx.showModal({
        title: '请先登录',
        content: '需要登录后才能完成支付',
        confirmText: '立即登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/profile' });
          }
        }
      });
      return;
    }

    console.log('✅ 支付前最终检查：用户已登录，开始支付流程');
    this.setData({ isLoading: true });

    // 调用支付云函数
    wx.cloud.callFunction({
      name: 'createPayment',
      data: { packageType: this.data.packageType },
      success: payRes => {
        console.log('✅ createPayment 返回:', payRes);
        
        if (!payRes.result.success) {
          wx.showModal({ 
            title: '提示', 
            content: payRes.result.message, 
            showCancel: false 
          });
          this.setData({ isLoading: false });
          return;
        }
        
        const p = payRes.result.data;
        console.log('✅ 支付参数:', p);
        
        // 调起微信支付
        wx.requestPayment({
          ...p,
          success: () => {
            wx.showToast({ 
              title: '支付成功', 
              icon: 'success' 
            });
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/paymentSuccess/paymentSuccess'
              });
            }, 1500);
          },
          fail: err => {
            console.log('❌ 支付取消或失败', err);
            wx.showToast({ 
              title: '支付取消', 
              icon: 'none' 
            });
          },
          complete: () => this.setData({ isLoading: false })
        });
      },
      fail: err => {
        console.error('❌ createPayment 调用失败', err);
        wx.showToast({ 
          title: '支付请求失败', 
          icon: 'none' 
        });
        this.setData({ isLoading: false });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});