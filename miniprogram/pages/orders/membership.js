// pages/orders/membership.js - 纯净版
Page({
  data: {
    creditsDisplay: '加载中...'
  },

  onLoad(options) {
    this.getUserInfo();
  },

  onShow() {
    this.getUserInfo();
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_user_info'
      });
      
      const userData = res.result.data || {};
      console.log('我的页面用户数据:', userData);
      
      let creditsDisplay = '';
      const remainingTrials = userData.remainingTrials || 0;
      const paidCredits = userData.paidCredits || 0;
      
      if (userData.isMember && userData.expireDate && new Date(userData.expireDate) > new Date()) {
        creditsDisplay = '会员 (无限)';
      } else if (remainingTrials > 0 && paidCredits > 0) {
        creditsDisplay = `试用 ${remainingTrials} 次 | 付费 ${paidCredits} 次`;
      } else if (remainingTrials > 0) {
        creditsDisplay = `试用 ${remainingTrials} 次`;
      } else if (paidCredits > 0) {
        creditsDisplay = `付费 ${paidCredits} 次`;
      } else {
        creditsDisplay = '0 次 (请升级)';
      }

      this.setData({
        creditsDisplay: creditsDisplay
      });

    } catch (error) {
      console.error('获取用户信息失败:', error);
      this.setData({
        creditsDisplay: '加载失败'
      });
    }
  },

  // 跳转到套餐页面
  goToPremium() {
    wx.navigateTo({
      url: '/pages/premium/packages/packages' // 🆕 修正为正确的套餐页面路径
    });
  },

  // 查看历史记录
  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage();
          wx.reLaunch({
            url: '/pages/home/home'
          });
        }
      }
    });
  }
});