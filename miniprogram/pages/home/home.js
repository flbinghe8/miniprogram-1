const UserPermission = require('../../utils/userPermission');

Page({
  data: {
    showTimeTip: false,
    userCredits: '加载中...',
    isVip: false,
    isCreditsLoaded: false,
    userType: 'guest',
    userInfo: null
  },

  onLoad: function () {
    // ✅ 核心修复：显式绑定所有函数
    this.handleStart = this.handleStart.bind(this);
    this.handleWechatLogin = this.handleWechatLogin.bind(this);
    this.checkUserPermission = this.checkUserPermission.bind(this); 
    
    this.initUserState();
  },

  onShow: function () {
    this.initUserState();
  },

  // ❌ 删除重复的 onShow

  initUserState: function() {
    const app = getApp();
    if (app.globalData.isLoggedIn) {
      this.getUserCreditSafe();
    } else {
      const guestData = app.globalData.guestState;
      this.setData({
        userCredits: UserPermission.getCreditsDisplay(guestData),
        isVip: false,
        isCreditsLoaded: true,
        userType: guestData.userType,
        userInfo: guestData
      });
    }
  },

  getUserCreditSafe: function () {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      const guestData = app.globalData.guestState;
      this.setData({
        userCredits: UserPermission.getCreditsDisplay(guestData),
        isCreditsLoaded: true,
        userType: guestData.userType,
        userInfo: guestData
      });
      return;
    }
  
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        if (res.result && res.result.success) {
          const userData = res.result.data; // 直接用云函数返回的数据
          this.updateUserDisplay(userData);
        } else {
          this.setData({ userCredits: '获取失败', isCreditsLoaded: true });
        }
      },
      fail: (err) => {
        this.setData({ userCredits: '网络错误', isCreditsLoaded: true });
      }
    });
  },

  updateUserDisplay: function (userData) {
    this.setData({
      userCredits: UserPermission.getCreditsDisplay(userData),
      isVip: userData.isMember || false,
      isCreditsLoaded: true,
      userType: userData.userType,
      userInfo: userData
    });
  },

  handleStart: function (e) {
    const workflowType = e.currentTarget.dataset.type;
    if (!this.checkUserPermission(workflowType)) {
      return;
    }
    
    this.navigateToWorkflow(workflowType);
  },

  navigateToWorkflow: function(workflowType) {
    this.setData({ showTimeTip: workflowType === 'sop' });
    let targetPath = '';
    switch (workflowType) {
      case 'sop':
      case 'ads':
        targetPath = '/pages/create/create?type=' + workflowType;
        break;
      case 'title':
        targetPath = '/pages/title/title';
        break;
      default:
        wx.showToast({ title: '该功能暂不可用', icon: 'none' });
        return;
    }
    if (targetPath) wx.navigateTo({ url: targetPath });
  },

  checkUserPermission: function(workflowType) {
    const userData = this.data.userInfo;
    if (!userData) {
      console.log('❌ 用户数据未加载');
      return false;
    }
    
    if (userData.isGuest || userData.userType === 'guest') {
      const remainingTrials = userData.remainingTrials || 0;
      if (remainingTrials <= 0) {
        this.showLoginModal('游客体验次数已用完，登录可获得更多试用');
        return false;
      }
      return true;
    } else {
      const totalCredits = userData.totalCredits || 0;
      if (totalCredits <= 0) {
        wx.showModal({
          title: '额度不足',
          content: '您的使用次数已用完，请购买套餐继续使用',
          confirmText: '购买套餐',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) wx.navigateTo({ url: '/pages/premium/packages/packages' });
          }
        });
        return false;
      }
      return true;
    }
  },

  showLoginModal: function(message) {
    wx.showModal({
      title: '提示',
      content: message || '请先登录以使用完整功能',
      confirmText: '立即登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) this.handleWechatLogin();
      }
    });
  },

  handleWechatLogin: function() {
    console.log('🟡 用户点击微信登录');
    const app = getApp();
    
    wx.showLoading({ title: '登录中...', mask: true });

    const timer = setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '登录超时',
        content: '网络连接较慢，请检查网络后重试',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.handleWechatLogin();
        }
      });
    }, 8000);

    app.triggerWechatLogin(
      (userData) => {
        clearTimeout(timer);
        wx.hideLoading();
        
        app.handleUserRegister((mergedData) => {
          this.setData({ 
            userInfo: mergedData,
            userCredits: UserPermission.getCreditsDisplay(mergedData)
          });
          
          wx.showToast({ title: '登录成功', icon: 'success', duration: 2000 });
        });
      },
      () => {
        clearTimeout(timer);
        wx.hideLoading();
        wx.showToast({ title: '登录失败，请重试', icon: 'none', duration: 2000 });
      }
    );
  }
});