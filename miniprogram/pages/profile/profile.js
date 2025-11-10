// pages/profile/profile.js - 终极修复版
const UserPermission = require('../../utils/userPermission');

Page({
  data: {
    showQuotaPopup: false,
    quotaData: null,
    userProfile: {
      nickname: '途胜用户',
      credits: '加载中...',
      isMember: false,
      packageInfo: ''
    },
    isCreditsLoaded: false,
    showLoginButton: false,
    isLoggedIn: false,
    userType: 'guest',
    remainingCount: 0
  },

  onLoad: function (options) {
    console.log('个人中心页面加载');
    this.checkLoginState();
  },
    
  onShow: function() {
    this.checkLoginState();
  },

  checkLoginState: function() {
    const app = getApp();
    const isLoggedIn = app.globalData.isLoggedIn;
    
    this.setData({ 
      isLoggedIn: isLoggedIn,
      showLoginButton: !isLoggedIn 
    });

    if (isLoggedIn) {
      this.getUserRealDataSafe();
    } else {
      const guestData = UserPermission.getGuestState();
      const displayText = UserPermission.getCreditsDisplay(guestData);
      this.setData({
        userType: guestData.userType,
        remainingCount: guestData.remainingTrials || 0,
        'userProfile.nickname': '未登录用户',
        'userProfile.credits': displayText,
        'userProfile.packageInfo': displayText,
        isCreditsLoaded: true
      });
    }
  },

  getUserRealDataSafe: function() {
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        console.log('✅ 用户数据获取成功:', res);
        if (res.result && res.result.success) {
          const userData = UserPermission.calculateUserData(res.result.data, true);
          this.updateUserProfile(userData);
          this.setData({ showLoginButton: false });
        } else {
          console.error('❌ 云函数返回失败:', res.result);
          this.setData({ showLoginButton: true });
        }
      },
      fail: (err) => {
        console.log('⚠️ 用户数据获取失败:', err);
        this.setData({ showLoginButton: true });
      }
    });
  },

  // ✅ 统一显示：所有文本走 getCreditsDisplay()
  updateUserProfile: function(userData) {
    if (!userData) return;
    
    const displayText = UserPermission.getCreditsDisplay(userData);
    
    this.setData({
      userType: userData.userType,
      remainingCount: userData.totalCredits,
      'userProfile.nickname': userData.phoneNumber ? '用户' + userData.phoneNumber.slice(-4) : '途胜用户',
      'userProfile.credits': displayText,
      'userProfile.isMember': userData.isMember,
      'userProfile.packageInfo': displayText, // ✅ 统一
      isCreditsLoaded: true
    });
  },

  handleLogin: function() {
    console.log('🔐 用户点击登录');
    wx.showLoading({ title: '登录中...' });
    
    const app = getApp();
    app.triggerWechatLogin(
      () => {
        wx.hideLoading();
        this.checkLoginState();
        wx.showToast({ title: '登录成功', icon: 'success' });
      },
      () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    );
  },

  onCreditCardTap: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    wx.showActionSheet({
      itemList: ['额度明细', '开通记录', '会员说明', '使用统计'],
      success: (res) => {
        const tapIndex = res.tapIndex;
        if (tapIndex === 0) {
          this.onQuotaDetailTap();
        } else if (tapIndex === 1) {
          wx.navigateTo({ url: '/pages/premium/orderHistory/orderHistory' });
        } else if (tapIndex === 2) {
          wx.showModal({
            title: '会员说明',
            content: '会员享受无限次AI分析、高级报告等功能，详情请查看套餐页面。',
            showCancel: false,
            confirmText: '知道了'
          });
        } else if (tapIndex === 3) {
          wx.showModal({
            title: '使用统计',
            content: '使用统计功能开发中...',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }
    });
  },

  onQuotaDetailTap: function() {
    console.log('🔍 开始查询额度明细');
    
    wx.showLoading({ title: '加载中...', mask: true });
    
    wx.cloud.callFunction({ 
      name: 'getUserQuota'
    }).then(res => {
      wx.hideLoading();
      console.log('✅ 额度查询结果:', res);
      
      if (res.result && res.result.code === 200 && res.result.data) {
        const quotaData = this.formatQuotaData(res.result.data);
        console.log('📊 格式化后的额度数据:', quotaData);
        
        this.setData({
          showQuotaPopup: true,
          quotaData: quotaData
        });
      } else {
        wx.showToast({
          title: res.result?.msg || '查询失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('❌ 额度查询错误:', err);
      wx.showToast({
        title: '网络错误，请检查网络后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // ✅ 统一格式化额度数据
  formatQuotaData: function(quotaData) {
    if (!quotaData) return null;
    
    const processedData = UserPermission.calculateUserData({
      trialUsed: quotaData.trialUsed || 0,
      paidCredits: quotaData.paidCredits || 0,
      isMember: quotaData.isMember || false,
      expireDate: quotaData.expireDate,
      trialTotal: quotaData.trialTotal || 2 // ✅ 数据库应存储总次数
    }, true);

    return {
      totalCredits: processedData.totalCredits,
      remainingTrials: processedData.remainingTrials,
      paidCredits: processedData.paidCredits,
      trialUsed: processedData.trialUsed,
      trialTotal: processedData.trialTotal,
      userType: processedData.userType,
      packageType: processedData.isMember ? '会员无限' : (processedData.paidCredits > 0 ? '付费套餐' : '试用套餐'),
      isMember: processedData.isMember,
      displayText: UserPermission.getCreditsDisplay(processedData) // ✅ 统一显示
    };
  },

  onCloseQuotaPopup: function() {
    this.setData({ showQuotaPopup: false });
  },

  goToMembership: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/premium/packages/packages' });
  },

  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          if (app.realLogout) {
            app.realLogout().then(() => {
              this.checkLoginState();
              wx.showToast({ title: '已退出登录', icon: 'success' });
            });
          } else {
            wx.setStorageSync('isLoggedIn', false);
            app.globalData.isLoggedIn = false;
            app.globalData.userInfo = null;
            this.checkLoginState();
            wx.showToast({ title: '已退出登录', icon: 'success' });
          }
        }
      }
    });
  },

  goToHistory: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToGuide: function() {
    wx.navigateTo({ url: '/pages/guide/guide' });
  },

  contactCustomerService: function() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：tusheng-helper\n工作时间：9:00-18:00\n邮箱：38313536@qq.com',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});