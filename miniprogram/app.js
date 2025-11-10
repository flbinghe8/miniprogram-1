App({
  onLaunch: function () {
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.showPrivacyAgreement(resolve);
      });
    }

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-3gmvjm85ca2c2d5c', 
        traceUser: true,
      });
      console.log('✅ 云开发环境初始化成功！');
    }

    this.initUserState();
  },

  onShow: function () {
    this.checkSessionState();
  },

  initGuestState: function() {
    let guestState = wx.getStorageSync('guestState');
    if (!guestState) {
      guestState = {
        userType: 'guest',
        totalTrials: 1,
        remainingTrials: 1,
        trialUsed: 0,
        createdTime: Date.now(),
        isGuest: true
      };
      wx.setStorageSync('guestState', guestState);
    }
    this.globalData.guestState = guestState;
    console.log('🎯 初始化游客状态:', guestState);
  },

  checkSessionState: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    if (isLoggedIn) {
      wx.checkSession({
        success: () => {
          console.log('✅ session有效');
          this.globalData.isLoggedIn = true;
        },
        fail: () => {
          console.log('⚠️ session失效，退回游客状态');
          wx.setStorageSync('isLoggedIn', false);
          this.globalData.isLoggedIn = false;
          this.initGuestState();
        }
      });
    }
  },

  initUserState: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    
    const now = Date.now();
    const createdTime = wx.getStorageSync('guestCreatedTime');
    if (!createdTime || now - createdTime > 24 * 3600 * 1000) {
      wx.removeStorageSync('guestState');
      wx.setStorageSync('guestCreatedTime', now);
    }

    this.globalData.isLoggedIn = isLoggedIn || false;

    if (isLoggedIn) {
      wx.checkSession({
        success: () => {
          console.log('✅ 登录session有效');
        },
        fail: () => {
          console.log('⚠️ session失效，退回游客');
          this.globalData.isLoggedIn = false;
          wx.setStorageSync('isLoggedIn', false);
          this.initGuestState();
        }
      });
    } else {
      this.initGuestState();
    }
  },

  triggerWechatLogin: function(onSuccess, onFail) {
    console.log('🔐 用户触发微信登录');
    
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.cloud.callFunction({
            name: 'get_user_info',
            data: {},
            success: (freshRes) => {
              if (freshRes.result && freshRes.result.success) {
                this.globalData.userInfo = freshRes.result.data;  // ✅ 改成 freshRes
                this.globalData.isLoggedIn = true;
                wx.setStorageSync('isLoggedIn', true);
                console.log('✅ 登录成功:', freshRes.result.data);  // ✅ 改成 freshRes
                onSuccess && onSuccess(freshRes.result.data);
              } else {
                onFail && onFail('登录失败');
              }
            },
            fail: (err) => {
              console.error('❌ 用户初始化失败:', err);
              onFail && onFail('网络错误');
            }
          });
        } else {
          onFail && onFail('获取登录码失败');
        }
      },
      fail: (err) => {
        console.error('❌ wx.login失败:', err);
        onFail && onFail('登录请求失败');
      }
    });
  },

  

  realLogout: function() {
    return new Promise((resolve) => {
      wx.setStorageSync('isLoggedIn', false);
      this.globalData.isLoggedIn = false;
      this.globalData.userInfo = null;
      wx.removeStorageSync('guestState');
      this.globalData.guestState = null;
      console.log('✅ 用户已退出登录');
      resolve();
    });
  },

  showPrivacyAgreement: function(resolve) {
    wx.showModal({
      title: '用户隐私保护提示',
      content: '我们需要使用云服务和访问您的文件数据（仅限广告分析功能）。请阅读并同意《用户隐私保护指引》。',
      confirmText: '同意',
      cancelText: '拒绝',
      success: (res) => {
        if (res.confirm) {
          resolve({ buttonId: 'agree-btn', event: 'agree' });
          console.log('用户同意隐私协议');
        } else {
          wx.showToast({ title: '需要同意才能使用文件和云功能', icon: 'none' });
        }
      }
    });
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    guestState: null,
    isFirstVisit: true
  }
});