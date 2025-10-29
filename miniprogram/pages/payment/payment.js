// pages/payment/payment.js
Page({
  data: {
    productInfo: {
      name: '基础包',
      description: '10次AI分析，30天内有效',
      price: 9.9
    },
    isLoading: false,
    packageType: 'basic'
  },

  onLoad(options) {
    console.log('支付页面加载，参数:', options);
    if (options.packageType) {
      this.setData({ packageType: options.packageType });
      this.setProductInfo(options.packageType);
    }
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
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    // ✅ 1. 先检查登录
    wx.cloud.callFunction({
      name: 'get_user_info',
      success: res => {
        console.log('get_user_info 返回:', res)
        if (!res.result || !res.result.data || !res.result.data.openid) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          this.setData({ isLoading: false });
          // 🆕 添加跳转登录提示
          setTimeout(() => {
            wx.showModal({
              title: '请先登录',
              content: '需要登录后才能购买套餐，请先去个人中心登录',
              confirmText: '去登录',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.switchTab({
                    url: '/pages/profile/profile'
                  });
                }
              }
            });
          }, 500);
          return;
        }
        // ✅ 2. 已登录 → 请求支付参数
        wx.cloud.callFunction({
          name: 'createPayment',
          data: { packageType: this.data.packageType },
          success: payRes => {
            console.log('✅ createPayment 返回:', payRes)
            
            if (!payRes.result.success) {
              wx.showModal({ title: '提示', content: payRes.result.message, showCancel: false });
              this.setData({ isLoading: false });
              return;
            }
            
            const p = payRes.result.data;
            console.log('✅ 支付参数:', p)
            console.log('📱 前端实际支付参数（手机扫码前）:', p)  // 新增这行
            
            // ✅ 3. 调起微信支付
            wx.requestPayment({
              ...p,
              success: () => {
                wx.showToast({ title: '支付成功', icon: 'success' });
                setTimeout(() => wx.navigateBack(), 2000);
              },
              fail: err => {
                console.log('❌ 支付调起失败', err);
                wx.showToast({ title: '支付取消', icon: 'none' });
              },
              complete: () => this.setData({ isLoading: false })
            });
          },
          fail: err => {
            console.error('❌ createPayment 调用失败', err);
            this.setData({ isLoading: false });
          }
        });
      },
      fail: err => {
        console.error('getUserInfo 调用失败', err);
        this.setData({ isLoading: false });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});