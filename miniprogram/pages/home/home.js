// pages/home/home.js - 完整修复版
Page({
  data: {
    showTimeTip: false,
    userCredits: '加载中...',
    isVip: false,
    isCreditsLoaded: false
  },

  onLoad: function () {
    console.log('首页加载');
    // 🆕 添加本地缓存兜底
    const cachedCredits = wx.getStorageSync('cachedUserCredits');
    if (cachedCredits) {
      this.setData({ userCredits: cachedCredits });
    }
    
    this.getUserCreditSafe();
  },

  onShow: function () {
    this.getUserCreditSafe();
  },

  getUserCreditSafe: function () {
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        console.log('✅ 云函数调用成功:', res);
        if (res.result && res.result.success) {
          this.updateUserDisplay(res.result.data);
        } else {
          this.setData({
            userCredits: '获取失败',
            isCreditsLoaded: true
          });
        }
      },
      fail: (err) => {
        console.log('⚠️ 云函数调用失败:', err);
        this.setData({
          userCredits: '网络错误', 
          isCreditsLoaded: true
        });
      }
    });
  },

  // 🆕【核心修复】修正额度显示逻辑
  updateUserDisplay: function (userData) {
    if (!userData) return;
    
    let creditsDisplay = '';
    let isVip = userData.isMember && userData.expireDate && new Date(userData.expireDate) > new Date();

    if (isVip) {
      creditsDisplay = '会员 (无限)';
    } else {
      const remainingTrials = userData.remainingTrials || 0;
      const paidCredits = userData.paidCredits || 0;
      
      // 🆕 关键修复：正确的显示顺序
      if (remainingTrials > 0 && paidCredits > 0) {
        creditsDisplay = '试用 ' + remainingTrials + ' 次 | 付费 ' + paidCredits + ' 次';
      } else if (remainingTrials > 0) {
        creditsDisplay = '试用 ' + remainingTrials + ' 次';  // ✅ 新用户会显示这里
      } else if (paidCredits > 0) {
        creditsDisplay = '付费 ' + paidCredits + ' 次';
      } else {
        creditsDisplay = '0 次 (请升级)';
      }
    }

    this.setData({
      userCredits: creditsDisplay,
      isVip: isVip,
      isCreditsLoaded: true
    });
    
    // 🆕 缓存额度信息
    wx.setStorageSync('cachedUserCredits', creditsDisplay);
  },

  // 🆕 您原有的所有其他方法完全保持不变
  handleStart: function (e) {
    const workflowType = e.currentTarget.dataset.type;
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
        wx.showToast({
          title: '该功能暂不可用',
          icon: 'none'
        });
        return;
    }

    this.setData({
      showTimeTip: workflowType === 'sop'
    });

    if (targetPath) {
      wx.navigateTo({
        url: targetPath
      });
    }
  }
});