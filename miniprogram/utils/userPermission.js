class UserPermission {
  static USER_TYPES = {
    GUEST: 'guest',
    TRIAL: 'trial', 
    PAID: 'paid',
    MEMBER: 'member'
  };

  // ✅ 修复：游客1次，登录2次（独立）
  static calculateUserData(rawUserData, isLoggedIn) {
    if (!isLoggedIn) {
      // 游客模式：从Storage读取
      const trialUsed = wx.getStorageSync('guest_trial_used') || 0;
      return {
        userType: 'guest',
        isMember: false,
        remainingTrials: Math.max(0, 1 - trialUsed),
        paidCredits: 0,
        totalCredits: Math.max(0, 1 - trialUsed),
        trialUsed: trialUsed,
        trialTotal: 1,
        isGuest: true
      };
    }

    if (!rawUserData) {
      // 登录用户但无数据：返回2次
      return {
        userType: 'trial',
        isMember: false,
        remainingTrials: 2,
        paidCredits: 0,
        totalCredits: 2,
        trialUsed: 0,
        trialTotal: 2
      };
    }

    // 登录用户有数据：使用云函数返回
    const trialUsed = Math.min(rawUserData.trialUsed || 0, 2);
    const remainingTrials = Math.max(0, 2 - trialUsed);
    const totalCredits = remainingTrials + (rawUserData.paidCredits || 0);
    
    let userType = 'trial';
    let isMember = false;
    
    if (rawUserData.isMember && rawUserData.expireDate) {
      const expireDate = new Date(rawUserData.expireDate);
      isMember = expireDate > new Date();
      if (isMember) userType = 'member';
    } else if (rawUserData.paidCredits > 0) {
      userType = 'paid';
    }

    return {
      userType,
      isMember,
      remainingTrials,
      paidCredits: rawUserData.paidCredits || 0,
      totalCredits,
      trialUsed,
      trialTotal: 2,
      expireDate: rawUserData.expireDate,
      openid: rawUserData._openid
    };
  }

  // ✅ 保留所有旧方法（不删）
  static getGuestState() {
    const trialUsed = wx.getStorageSync('guest_trial_used') || 0;
    return {
      userType: 'guest',
      remainingTrials: Math.max(0, 1 - trialUsed),
      trialUsed,
      isGuest: true
    };
  }

  static recordGuestUsage() {
    const trialUsed = wx.getStorageSync('guest_trial_used') || 0;
    if (trialUsed < 1) {
      wx.setStorageSync('guest_trial_used', trialUsed + 1);
    }
    return this.getGuestState();
  }

  static async fetchUserData() {
    try {
      const res = await wx.cloud.callFunction({ name: 'get_user_info' });
      return res.result.success ? res.result.data : null;
    } catch (e) {
      console.error('获取用户信息失败:', e);
      return null;
    }
  }

  static getCreditsDisplay(userData) {
    if (!userData) return '加载中...';
    if (userData.userType === 'guest') {
      return userData.remainingTrials > 0 ? `试用${userData.remainingTrials}次` : '请登录获得更多试用';
    }
    if (userData.isMember) return '会员无限';
    const totalCredits = userData.totalCredits || 0;
    if (totalCredits === 0) return '0次 (请升级)';
    if (userData.remainingTrials > 0 && userData.paidCredits > 0) {
      return `试用${userData.remainingTrials}次 + 付费${userData.paidCredits}次`;
    } else if (userData.remainingTrials > 0) {
      return `试用${userData.remainingTrials}次`;
    } else if (userData.paidCredits > 0) {
      return `付费${userData.paidCredits}次`;
    }
    return '0次';
  }

  static checkUsagePermission(userData, workflowType) {
    if (!userData) return false;
    if (userData.isGuest || userData.userType === 'guest') {
      return (userData.remainingTrials || 0) > 0;
    }
    return (userData.totalCredits || 0) > 0;
  }

  static getDefaultTrialState() {
    return {
      userType: 'trial',
      isMember: false,
      remainingTrials: 2,
      paidCredits: 0,
      totalCredits: 2,
      trialUsed: 0,
      trialTotal: 2
    };
  }
}

module.exports = UserPermission;