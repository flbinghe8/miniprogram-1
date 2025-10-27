// pages/home/home.js - 安全版本
Page({
  data: {
    showTimeTip: false,
    userCredits: '3 次试用',
    isVip: false,
    isCreditsLoaded: true,
  },

  onLoad() {
    console.log('首页加载');
    // 先显示默认值
    this.setData({
      userCredits: '3 次试用',
      isCreditsLoaded: true
    });
    
    // 安全地尝试获取用户数据
    this.getUserCreditSafe();
  },

  onShow() {
    // 可以安全刷新
    this.getUserCreditSafe();
  },

  getUserCreditSafe: function() {
    // 使用回调方式，避免 async/await 可能的问题
    wx.cloud.callFunction({
      name: 'get_user_info',
      data: {},
      success: (res) => {
        console.log('✅ 云函数调用成功:', res);
        if (res.result && res.result.success) {
          this.updateUserDisplay(res.result.data);
        }
      },
      fail: (err) => {
        console.log('⚠️ 云函数调用失败，使用本地数据:', err);
        // 失败时保持默认数据不变
      }
    });
  },

  updateUserDisplay: function(userData) {
    if (!userData) return;
    
    let creditsDisplay = '';
    let isVip = userData.isMember && userData.expireDate && new Date(userData.expireDate) > new Date();

    if (isVip) {
      creditsDisplay = '会员 (无限)';
    } else {
      const remainingTrials = userData.remainingTrials || 3;
      const paidCredits = userData.paidCredits || 0;
      
      if (remainingTrials > 0 && paidCredits > 0) {
        creditsDisplay = `试用 ${remainingTrials} 次 | 付费 ${paidCredits} 次`;
      } else if (remainingTrials > 0) {
        creditsDisplay = `试用 ${remainingTrials} 次`;
      } else if (paidCredits > 0) {
        creditsDisplay = `付费 ${paidCredits} 次`;
      } else {
        creditsDisplay = '0 次 (请升级)';
      }
    }

    this.setData({
      userCredits: creditsDisplay,
      isVip: isVip
    });
  },

  handleStart(e) {
    const workflowType = e.currentTarget.dataset.type;
    let targetPath = '';

    switch (workflowType) {
      case 'sop':
      case 'ads':
        targetPath = `/pages/create/create?type=${workflowType}`;
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