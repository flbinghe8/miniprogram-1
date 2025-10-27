// app.js (最终隐私合规优化版)
App({
  onLaunch: function () {
    // --------------------------------------------------------
    // 【隐私协议处理：官方推荐的异步监听方式】
    // --------------------------------------------------------
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve, event) => {
        console.log('触发隐私授权需求，接口/组件:', event.apiName || '未知');
        // 显示自定义的隐私协议弹窗
        this.showPrivacyAgreement(resolve);
      });
    }

    // ----------------------------------------------------
    // 【云开发环境初始化】
    // ----------------------------------------------------
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-3gmvjm85ca2c2d5c', 
        traceUser: true,
      })
      console.log('✅ 云开发环境初始化成功！');
    }

    // ----------------------------------------------------
    // 【初始化用户数据】
    // ----------------------------------------------------
    this.initUserData();
  },

  // 【初始化用户数据方法】
  initUserData() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        // 首次使用，初始化用户数据
        const initialUserData = {
          remainingCount: 3,
          isRegistered: false,
          phoneNumber: '',
          isPremium: false,
          firstUseTime: new Date().getTime()
        };
        wx.setStorageSync('userInfo', initialUserData);
        console.log('✅ 用户数据初始化完成，剩余次数: 3');
      } else {
        console.log('✅ 用户数据已存在，剩余次数:', userInfo.remainingCount || 3);
      }
    } catch (error) {
      console.error('初始化用户数据失败:', error);
    }
  },

  // 【✅ 核心方法：显示隐私协议弹窗】
  showPrivacyAgreement(resolve) {
    wx.showModal({
      title: '用户隐私保护提示',
      content: '我们需要使用云服务和访问您的文件数据（仅限广告分析功能）。请阅读并同意《用户隐私保护指引》。',
      confirmText: '同意',
      cancelText: '拒绝',
      success: (res) => {
        if (res.confirm) {
          resolve({
            buttonId: 'agree-btn',
            event: 'agree'
          });
          console.log('用户同意隐私协议');
        } else {
          wx.showToast({
            title: '需要同意才能使用文件和云功能',
            icon: 'none'
          });
        }
      },
      // 🆕 优化：失败时也调用resolve避免阻塞
      fail: (err) => {
        console.error('隐私弹窗显示失败:', err);
        if (resolve && typeof resolve === 'function') {
          resolve({
            buttonId: 'default-btn',
            event: 'cancel'
          });
        }
      }
    });
  },

  onShow: function (options) {
    // 可以留空
  },

  onHide: function () {
    // 可以留空
  },

  onError: function (msg) {
    // 🆕 优化：添加全局错误监控
    console.error('App全局错误:', msg);
  },



  globalData: {
    userInfo: null
  }
});