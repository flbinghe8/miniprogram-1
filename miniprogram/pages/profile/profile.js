// pages/profile/profile.js - 完整修复版
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
    isCardTapping: false
  },

  onLoad: function (options) {
    console.log('🔄 个人中心页面加载');
    this.checkLoginState();
    
    // 调试：检查页面初始状态和事件绑定
    console.log('📊 页面初始数据:', {
      showQuotaPopup: this.data.showQuotaPopup,
      isLoggedIn: this.data.isLoggedIn,
      onCreditCardTap: typeof this.onCreditCardTap,
      onQuotaDetailTap: typeof this.onQuotaDetailTap
    });
  },
    
  onShow: function() {
    this.checkLoginState();
  },

  checkLoginState: function() {
    const app = getApp();
    const isLoggedIn = app.globalData.isLoggedIn;
    
    console.log('🔐 当前登录状态:', isLoggedIn);
    
    this.setData({ 
      isLoggedIn: isLoggedIn,
      showLoginButton: !isLoggedIn 
    });

    if (isLoggedIn) {
      this.getUserRealDataSafe();
    } else {
      this.setData({
        'userProfile.nickname': '未登录用户',
        'userProfile.credits': '请先登录',
        'userProfile.packageInfo': '登录后享受3次免费试用',
        isCreditsLoaded: true
      });
    }
  },

  handleLogin: function() {
    console.log('🔐 用户点击登录');
    wx.showLoading({ title: '登录中...' });
    
    const app = getApp();
    app.triggerWechatLogin();
    
    setTimeout(() => {
      wx.hideLoading();
      this.checkLoginState();
      if (getApp().globalData.isLoggedIn) {
        wx.showToast({ title: '登录成功', icon: 'success' });
      }
    }, 2000);
  },

  onCreditCardTap: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    console.log('🎯 点击头像，显示ActionSheet');
    
    wx.showActionSheet({
      itemList: ['额度明细', '开通记录', '会员说明', '使用统计'],
      success: (res) => {
        const tapIndex = res.tapIndex;
        console.log('✅ 用户选择了:', ['额度明细', '开通记录', '会员说明', '使用统计'][tapIndex]);
        
        if (tapIndex === 0) {
          // 额度明细 - 显示弹窗
          console.log('📊 调用额度明细弹窗');
          this.onQuotaDetailTap();
        } else if (tapIndex === 1) {
          // 开通记录 - 跳转到对应页面
          wx.navigateTo({
            url: '/pages/premium/orderHistory/orderHistory'
          });
        } else if (tapIndex === 2) {
          // 会员说明 - 显示说明
          wx.showModal({
            title: '会员说明',
            content: '会员享受无限次AI分析、高级报告等功能，详情请查看套餐页面。',
            showCancel: false,
            confirmText: '知道了'
          });
        } else if (tapIndex === 3) {
          // 使用统计
          wx.showModal({
            title: '使用统计',
            content: '使用统计功能开发中...',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      },
      fail: (err) => {
        console.log('用户取消选择:', err);
      }
    });
  },

  onQuotaDetailTap: function() {
    console.log('🔍 开始查询额度明细');
    
    wx.showLoading({ 
      title: '加载中...',
      mask: true
    });
    
    wx.cloud.callFunction({ 
      name: 'getUserQuota',
      timeout: 8000
    }).then(res => {
      wx.hideLoading();
      console.log('✅ 额度查询结果:', res);
      
      if (res.result && res.result.code === 200) {
        this.setData({
          showQuotaPopup: true,
          quotaData: res.result.data
        });
        console.log('🎯 弹窗状态已设置为显示');
      } else {
        console.error('❌ 查询失败:', res.result);
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

  // 关闭弹窗
  onCloseQuotaPopup: function() {
    console.log('🔙 关闭额度明细弹窗');
    this.setData({
      showQuotaPopup: false
    });
  },

  goToMembership: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    console.log('🚀 跳转到套餐页面');
    wx.navigateTo({
      url: '/pages/premium/packages/packages'
    });
  },

  // 退出登录方法
  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('✅ 执行退出登录');
          const app = getApp();
          
          if (app.realLogout) {
            app.realLogout().then(() => {
              this.setData({ 
                showLoginButton: true,
                isLoggedIn: false,
                'userProfile.nickname': '未登录用户',
                'userProfile.credits': '请先登录',
                'userProfile.packageInfo': '登录后享受3次免费试用'
              });
              
              wx.showToast({
                title: '已退出登录',
                icon: 'success'
              });
            });
          } else {
            // 备用方案
            wx.setStorageSync('isLoggedIn', false);
            app.globalData.isLoggedIn = false;
            app.globalData.userInfo = null;
            wx.removeStorageSync('cachedUserCredits');
            
            this.setData({ 
              showLoginButton: true,
              isLoggedIn: false,
              'userProfile.nickname': '未登录用户',
              'userProfile.credits': '请先登录',
              'userProfile.packageInfo': '登录后享受3次免费试用'
            });
            
            wx.showToast({ 
              title: '已退出登录', 
              icon: 'success' 
            });
          }
        }
      }
    });
  },

  getUserRealDataSafe: function() {
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        console.log('✅ 用户数据获取成功:', res);
        if (res.result && res.result.success) {
          this.updateUserProfile(res.result.data);
          this.setData({ showLoginButton: false });
        }
      },
      fail: (err) => {
        console.log('⚠️ 用户数据获取失败:', err);
        this.setData({ showLoginButton: true });
      }
    });
  },

  updateUserProfile: function(userData) {
    if (!userData) return;
    
    const totalCredits = userData.totalCredits || 0;
    const isMember = userData.isMember || false;
    
    let creditsDisplay = totalCredits + ' 次';
    let packageInfo = '';
    
    if (isMember) {
      creditsDisplay = '会员 (无限)';
      packageInfo = '会员套餐';
    } else if (totalCredits === 0) {
      creditsDisplay = '0 次 (请升级)';
      packageInfo = '试用已用完';
    } else {
      packageInfo = '试用 ' + (userData.remainingTrials || 0) + ' 次 + 付费 ' + (userData.paidCredits || 0) + ' 次';
    }
    
    this.setData({
      'userProfile.nickname': userData.phoneNumber ? '用户' + userData.phoneNumber.slice(-4) : '途胜用户',
      'userProfile.credits': creditsDisplay,
      'userProfile.isMember': isMember,
      'userProfile.packageInfo': packageInfo,
      isCreditsLoaded: true
    });
  },

  goToHistory: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
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
  }
});