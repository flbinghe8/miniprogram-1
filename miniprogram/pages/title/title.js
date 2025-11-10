// pages/title/title.js - 终极修复版（1次游客→登录2次）
const UserPermission = require('../../utils/userPermission');

Page({
  data: {
    isLoading: false,
    userType: 'guest',
    remainingCount: 0,
    creditsDisplay: '加载中...',
    
    // SEO输入字段
    productName: '',
    productFeatures: '',
    coreKeywords: '',
    targetAudience: '',
    longTailKeywords: '',
    brandName: '',
  },

  onLoad: function(options) {
    console.log('Title页面加载');
    this.initUserState();
  },

  initUserState: function() {
    const app = getApp();
    if (app.globalData.isLoggedIn) {
      this.getUserRealDataSafe();
    } else {
      const guestState = UserPermission.getGuestState();
      this.setData({ 
        userType: 'guest',
        remainingCount: guestState.remainingTrials,
        creditsDisplay: UserPermission.getCreditsDisplay(guestState)
      });
    }
  },

  getUserRealDataSafe: function() {
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        if (res.result && res.result.success) {
          this.updateUserDisplay(res.result.data);
        }
      },
      fail: (err) => {
        console.log('用户数据获取失败:', err);
      }
    });
  },

  updateUserDisplay: function(userData) {
    if (!userData) return;
    const processedData = UserPermission.calculateUserData(userData, true);
    this.setData({
      userType: processedData.userType,
      remainingCount: processedData.totalCredits,
      creditsDisplay: UserPermission.getCreditsDisplay(processedData)
    });
  },

  checkUserPermission: async function() {
    const app = getApp();
    
    if (!app.globalData.isLoggedIn) {
      const guestState = UserPermission.getGuestState();
      if (guestState.remainingTrials <= 0) {
        const loginAfterText = UserPermission.getCreditsDisplay({...guestState, userType: 'trial'});
        this.showLoginModal(`游客体验次数已用完，${loginAfterText}`);
        return false;
      }
      return true;
    }
    
    if (this.data.remainingCount <= 0) {
      this.showPremiumGuide();
      return false;
    }
    
    return true;
  },

  showLoginModal: function(message) {
    wx.showModal({
      title: '提示',
      content: message,
      confirmText: '立即登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          this.handleWechatLogin();
        }
      }
    });
  },

  showPremiumGuide: function() {
    wx.showModal({
      title: '额度不足',
      content: '您的使用次数已用完，请购买套餐继续使用',
      confirmText: '购买套餐',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/premium/packages/packages'
          });
        }
      }
    });
  },

  handleWechatLogin: function() {
    const app = getApp();
    wx.showLoading({ title: '登录中...' });
    
    app.triggerWechatLogin(
      () => {
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.getUserRealDataSafe();
      },
      () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    );
  },

  // ✅ 扣费逻辑
  async consumeCreditAfterSuccess() {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      UserPermission.recordGuestUsage();
      const newGuestState = UserPermission.getGuestState();
      this.setData({ 
        remainingCount: newGuestState.remainingTrials,
        creditsDisplay: UserPermission.getCreditsDisplay(newGuestState)
      });
    } else {
      await wx.cloud.callFunction({ name: 'consume_credit' });
      const newCount = Math.max(0, this.data.remainingCount - 1);
      const userData = UserPermission.calculateUserData({...app.globalData.userInfo, totalCredits: newCount}, true);
      this.setData({ 
        remainingCount: newCount,
        creditsDisplay: UserPermission.getCreditsDisplay(userData)
      });
    }
  },

  goBackToSelect() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  formatStringToArray(str) {
    if (!str) return [];
    return str.replace(/，/g, ',').replace(/、/g, ',').replace(/\n/g, ',').replace(/\//g, ',')
        .split(',')
        .map(item => item.trim())
        .filter(item => item);
  },

  async handleSubmit() {
    const { productName, productFeatures, targetAudience, brandName } = this.data;

    if (!productName || !productFeatures || !targetAudience) {
      wx.showToast({ title: '请填写所有必填项', icon: 'none' });
      return;
    }

    const canProceed = await this.checkUserPermission();
    if (!canProceed) return;

    const formattedData = {
      product_name: productName.trim(),
      product_features: this.formatStringToArray(productFeatures),
      target_audience: this.formatStringToArray(targetAudience),
      brand_name: brandName.trim(),
    };
    
    if (formattedData.product_features.length === 0 || formattedData.target_audience.length === 0) {
      wx.showToast({ title: '核心卖点和目标用户不能为空', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: 'AI生成中，请等待...', mask: true });

    let loadingActive = true;
    const safeHideLoading = () => {
        if (loadingActive) {
            loadingActive = false;
            this.setData({ isLoading: false });
            wx.hideLoading();
        }
    };
    const loadingTimeout = setTimeout(() => {
        safeHideLoading();
        wx.showToast({ title: '请求超时，请重试', icon: 'none' });
    }, 90000); 

    wx.cloud.callFunction({
        name: 'coze-proxy-new', 
        data: {
            workflowType: 'seo',
            ...formattedData
        },
        success: async (res) => {
            clearTimeout(loadingTimeout);
            
            // ✅ try/catch包裹
            try {
                if (res.result && res.result.success && res.result.result && res.result.result.final_report) {
                    await this.consumeCreditAfterSuccess();
                    safeHideLoading();
                    
                    wx.navigateTo({
                        url: `/pages/result/result?report=${encodeURIComponent(res.result.result.final_report)}&type=title`
                    });
                } else {
                    safeHideLoading();
                    wx.showModal({
                        title: '生成失败',
                        content: '未能获取到有效的结果，请稍后重试',
                        showCancel: false
                    });
                }
            } catch (error) {
                safeHideLoading();
                console.error('🚨 生成流程中断:', error);
                wx.showToast({ title: '生成成功，但扣费失败', icon: 'none', duration: 3000 });
                wx.navigateTo({
                    url: `/pages/result/result?report=${encodeURIComponent(res.result.result.final_report)}&type=title`
                });
            }
        },
        fail: (err) => {
            clearTimeout(loadingTimeout);
            safeHideLoading();
            console.error('云函数调用失败:', err);
            wx.showToast({ title: '网络错误，请重试', icon: 'none' });
        }
    });
  }
});