// pages/profile/profile.js - 完全安全版本
Page({
  data: {
    userProfile: {
      nickname: '途胜用户',
      credits: '3 次试用',
      isMember: false,
      packageInfo: '试用套餐'
    },
    isCreditsLoaded: true,
  },

  onLoad: function (options) {
    console.log('个人中心加载 - 使用本地数据');
    // 完全使用本地静态数据，避免云函数调用
    this.setData({
      userProfile: {
        nickname: '途胜用户',
        credits: '3 次试用',
        isMember: false,
        packageInfo: '试用套餐'
      },
      isCreditsLoaded: true
    });
    
    // 安全地尝试获取用户数据（不阻塞页面）
    this.getUserRealDataSafe();
  },
    
  onShow: function() {
    // 安全刷新
    this.getUserRealDataSafe();
  },

  // 安全版本 - 使用回调，避免 async/await
  getUserRealDataSafe: function() {
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        console.log('✅ 用户数据获取成功:', res);
        if (res.result && res.result.success) {
          this.updateUserProfile(res.result.data);
        }
      },
      fail: (err) => {
        console.log('⚠️ 用户数据获取失败，使用本地数据:', err);
        // 失败时保持默认数据不变
      }
    });
  },

  // 更新用户信息（仅在云函数成功时调用）
  updateUserProfile: function(userData) {
    if (!userData) return;
    
    const totalCredits = userData.totalCredits || 0;
    const isMember = userData.isMember || false;
    const phoneNumber = userData.phoneNumber || '';
    
    let creditsDisplay = `${totalCredits} 次`;
    let packageInfo = '';
    
    if (isMember) {
      creditsDisplay = '会员 (无限)';
      packageInfo = '会员套餐';
    } else if (totalCredits === 0) {
      creditsDisplay = '0 次 (请升级)';
      packageInfo = '试用已用完';
    } else {
      packageInfo = `试用 ${userData.remainingTrials || 0} 次 + 付费 ${userData.paidCredits || 0} 次`;
    }
    
    this.setData({
      'userProfile.credits': creditsDisplay,
      'userProfile.isMember': isMember,
      'userProfile.packageInfo': packageInfo,
      isCreditsLoaded: true
    });
  },

  goToMembership: function() {
    wx.navigateTo({
      url: '/pages/premium/packages/packages'
    });
  },

  goToHistory: function() {
    wx.navigateTo({
      url: '/pages/history/history' 
    });
  },

  goToGuide: function() {
    wx.navigateTo({
      url: '/pages/guide/guide' 
    });
  },

  contactCustomerService: function() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：tusheng-helper\n工作时间：9:00-18:00\n邮箱：38313536@qq.com',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击确定，执行退出');
        }
      }
    });
  }
});