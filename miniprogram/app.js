// app.js - 完整修复版
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

    // 🆕【核心修复】完善的登录状态管理
    this.initLoginState();
  },

  onShow: function () {
    // 🆕 冷启动兜底：检查session状态
    this.checkSessionState();
  },

  // 🆕 新增：检查session状态
  checkSessionState: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    if (!isLoggedIn) {
      wx.checkSession({
        success: () => {
          console.log('✅ session有效，重新登录');
          this.triggerWechatLogin();
        },
        fail: () => {
          console.log('⚠️ session失效，需要重新登录');
          this.triggerWechatLogin();
        }
      });
    }
  },

  // 🆕 修复：初始化登录状态
  initLoginState: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    this.globalData.isLoggedIn = isLoggedIn || false;
    console.log('🔐 初始化登录状态:', this.globalData.isLoggedIn);
    
    if (!this.globalData.isLoggedIn) {
      this.triggerWechatLogin();
    }
  },

  // 🆕【核心修复】新增微信登录方法
  triggerWechatLogin: function() {
    console.log('🔐 触发微信登录获取用户身份');
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('✅ 获取到登录code');
          // 静默调用get_user_info创建用户记录
          wx.cloud.callFunction({
            name: 'get_user_info',
            success: (cloudRes) => {
              console.log('✅ 用户身份初始化成功');
              if (cloudRes.result && cloudRes.result.success) {
                // 🆕 关键修复：存储登录状态
                wx.setStorageSync('isLoggedIn', true);
                this.globalData.isLoggedIn = true;
                this.globalData.userInfo = cloudRes.result.data;
                console.log('✅ 登录状态已保存');
              }
            },
            fail: (err) => {
              console.error('❌ 用户初始化失败:', err);
              wx.setStorageSync('isLoggedIn', false);
              this.globalData.isLoggedIn = false;
            }
          });
        }
      },
      fail: (err) => {
        console.error('❌ wx.login失败:', err);
        wx.setStorageSync('isLoggedIn', false);
        this.globalData.isLoggedIn = false;
      }
    });
  },

  // 🆕 新增：完整退出登录
  realLogout: function() {
    return new Promise((resolve) => {
      wx.setStorageSync('isLoggedIn', false);
      this.globalData.isLoggedIn = false;
      this.globalData.userInfo = null;
      // 清除缓存
      wx.removeStorageSync('cachedUserCredits');
      console.log('✅ 已完全退出登录');
      resolve();
    });
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

  onHide: function () {
    // 可以留空
  },

  onError: function (msg) {
    console.error('App全局错误:', msg);
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false  // 🆕 新增全局登录状态
  }
});