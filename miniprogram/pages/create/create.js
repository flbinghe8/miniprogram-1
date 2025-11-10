const UserPermission = require('../../utils/userPermission');

Page({
  data: {
    workflowType: null,
    isLoading: false,
    userType: 'guest',
    remainingCount: 0,
    isFeatureDisabled: false,
    showPremiumDialog: false,
    hasPhone: false,
    phoneNumber: '',
    businessGoal: '',
    rawData: '',
    fileName: '',
    productName: '',
    productFunctions: '',
    targetAudience: '',
    material: '',
    batteryLife: '',
    dimensions: '',
    weight: '',
    waterproofRating: '',
    creditsDisplay: '加载中...'
  },

  onLoad: function(options) {
    console.log('页面加载开始');
    this.setData({ 
      showPremiumDialog: false,
      remainingCount: 0
    });
    
    if (options && options.type) {
      this.setData({ workflowType: options.type });
    }
    
    this.initUserState();
    
    // ✅ 核心修复：显式绑定所有异步函数
    this.handleSopSubmit = this.handleSopSubmit.bind(this);
    this.startAnalysis = this.startAnalysis.bind(this);
    this.consumeCreditAfterSuccess = this.consumeCreditAfterSuccess.bind(this);
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
      hasPhone: !!userData.phoneNumber,
      creditsDisplay: UserPermission.getCreditsDisplay(processedData)
    });
  },

  showLoginModal: function(message) {
    const guestState = UserPermission.getGuestState();
    const loginAfterText = UserPermission.getCreditsDisplay({...guestState, userType: 'trial'});
    
    wx.showModal({
      title: '提示',
      content: message || `游客体验次数已用完，${loginAfterText}`,
      confirmText: '立即登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) this.handleWechatLogin();
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

  // ✅ 添加：权限检查函数（插入在这里）
checkUserPermission: async function() {
  // 基于页面数据检查用户权限
  if (this.data.userType === 'guest') {
    if (this.data.remainingCount <= 0) {
      this.showLoginModal();
      return false;
    }
    return true;
  } else {
    // 登录用户
    if (this.data.remainingCount <= 0) {
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

  // ✅ 扣费逻辑：修复版
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
      this.getUserRealDataSafe(); // ✅ 核心：刷新数据
    }
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: (err) => {
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  },

  onShow() {
    this.setData({ showPremiumDialog: false });
  },

  handleApiError(error) {
    console.error('API错误:', error);
    if (error.errMsg?.includes('network')) {
      wx.showToast({ title: '网络连接失败', icon: 'none' });
    } else if (error.errMsg?.includes('timeout')) {
      wx.showToast({ title: '请求超时', icon: 'none' });
    } else {
      wx.showToast({ title: '服务暂时不可用', icon: 'none' });
    }
  },

  onUnload() {
    this.setData({
      rawData: '', fileName: '', businessGoal: '', productName: '',
      productFunctions: '', targetAudience: '', isLoading: false
    });
  },

  onHide() {
    this.setData({ isLoading: false, showPremiumDialog: false });
  },

  goBackToSelect() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  onProductNameInput(e) {
    this.setData({ productName: e.detail.value });
  },

  onProductFunctionsInput(e) {
    this.setData({ productFunctions: e.detail.value });
  },

  onTargetAudienceInput(e) {
    this.setData({ targetAudience: e.detail.value });
  },

  onMaterialInput(e) {
    this.setData({ material: e.detail.value });
  },

  onBatteryLifeInput(e) {
    this.setData({ batteryLife: e.detail.value });
  },

  onDimensionsInput(e) {
    this.setData({ dimensions: e.detail.value });
  },

  onWeightInput(e) {
    this.setData({ weight: e.detail.value });
  },

  onWaterproofRatingInput(e) {
    this.setData({ waterproofRating: e.detail.value });
  },

  async handleSopSubmit(e) {
    if (this.data.isFeatureDisabled) {
      wx.showModal({ title: '提示', content: '功能维护中', showCancel: false });
      return;
    }
    const canProceed = await this.checkUserPermission();
    if (!canProceed) return;

    const { productName, productFunctions, targetAudience, material, batteryLife, dimensions, weight, waterproofRating } = this.data;
    if (!productName || !productFunctions || !targetAudience) {
      wx.showToast({ title: '请填写所有必填项', icon: 'none' });
      return;
    }

    const formatArray = (str) => str.replace(/[，、\n\/]/g, ',').split(',').map(i => i.trim()).filter(i => i);
    const productFunctionsArray = formatArray(productFunctions);
    const targetAudienceArray = formatArray(targetAudience);

    if (productFunctionsArray.length === 0 || targetAudienceArray.length === 0) {
      wx.showToast({ title: '核心卖点与目标用户不能为空', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: 'SOP生成中，约需1分钟...', mask: true });

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
        workflowType: 'sop',
        productName,
        productFunctions: productFunctionsArray,
        targetAudience: targetAudienceArray,
        productParameters: {
          material: material || '',
          batteryLife: batteryLife || '',
          dimensions: dimensions || '',
          weight: weight || '',
          waterproofRating: waterproofRating || ''
        }
      },
      success: async (res) => {
        clearTimeout(loadingTimeout);
        
        try {
          if (res.result?.success && res.result.result) {
            await this.consumeCreditAfterSuccess();
            safeHideLoading();
            
            let finalReportContent = res.result.result.final_report || '';
            if (finalReportContent.startsWith('{') && finalReportContent.includes('listing_copy')) {
              try {
                const parsed = JSON.parse(finalReportContent);
                finalReportContent = parsed.listing_copy || finalReportContent;
              } catch {}
            }
            wx.navigateTo({
              url: '/pages/result/result?report=' + encodeURIComponent(finalReportContent) + '&type=sop'
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
          const finalReportContent = res.result?.result?.final_report || '';
          wx.navigateTo({
            url: '/pages/result/result?report=' + encodeURIComponent(finalReportContent) + '&type=sop'
          });
        }
      },
      fail: (err) => {
        clearTimeout(loadingTimeout);
        safeHideLoading();
        this.handleApiError(err);
      }
    });
  },

  onGoalInput(e) { 
    this.setData({ businessGoal: e.detail.value });
  },

  downloadTemplate() {
    const headers = "date,campaign,ad_group,keyword_or_target,match_type,sku,impressions,clicks,spend,orders,sales,cost_of_goods,amazon_fees";
    wx.setClipboardData({ 
      data: headers, 
      success: () => wx.showModal({ 
        title: '模板表头已复制', 
        content: '请将复制的内容粘贴到Excel或文本文件的第一行。', 
        showCancel: false 
      }) 
    });
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['csv', 'txt'],
      success: res => {
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: res.tempFiles[0].path, 
          encoding: 'utf8',
          success: readRes => {
            const fileContent = readRes.data;
            if (this.validateData(fileContent)) {
              this.setData({ fileName: res.tempFiles[0].name, rawData: fileContent });
              wx.showToast({ title: '文件校验通过!', icon: 'success' });
            } else {
              this.setData({ fileName: '', rawData: '' });
            }
          },
          fail: () => wx.showToast({ title: '文件读取失败', icon: 'none' })
        });
      },
      fail: () => wx.showToast({ title: '文件选择失败', icon: 'none' })
    });
  },

  validateData(csvContent) {
    const expectedHeaders = "date,campaign,ad_group,keyword_or_target,match_type,sku,impressions,clicks,spend,orders,sales,cost_of_goods,amazon_fees";
    if (!csvContent) {
      wx.showToast({ title: '文件内容为空', icon: 'none' });
      return false;
    }
    
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      wx.showToast({ title: '请至少填写一行数据', icon: 'none' });
      return false;
    }
    
    if (lines[0].replace(/\r/g, '').trim() !== expectedHeaders) {
      wx.showModal({ 
        title: '格式错误', 
        content: '文件第一行的表头与模板不符。请用记事本以UTF-8格式保存。', 
        showCancel: false 
      });
      return false;
    }
    
    const dataLine = lines[1].split(',');
    if (dataLine.length < 5 || !dataLine[0] || !dataLine[1] || !dataLine[2]) {
      wx.showToast({ title: '数据格式不正确，请检查列数和必填项', icon: 'none' });
      return false;
    }
    
    return true;
  },

  async startAnalysis() {
    if (this.data.isFeatureDisabled) {
      wx.showModal({ title: '提示', content: '功能维护中', showCancel: false });
      return;
    }
    const canProceed = await this.checkUserPermission();
    if (!canProceed) return;

    const { businessGoal, rawData } = this.data;
    if (!businessGoal || !rawData) {
      wx.showToast({ title: '请输入业务目标并上传数据文件', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: '数据AI分析中，约需1分钟...', mask: true });

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
        workflowType: 'ads',
        businessGoal: businessGoal,
        rawData: rawData
      },
      success: async (res) => {
        clearTimeout(loadingTimeout);
        
        try {
          if (res.result?.success && res.result.result?.final_report) {
            await this.consumeCreditAfterSuccess();
            safeHideLoading();
            
            wx.navigateTo({ 
              url: '/pages/result/result?report=' + encodeURIComponent(res.result.result.final_report) + '&type=ads' 
            });
          } else {
            safeHideLoading();
            const errorDetails = res.result?.details || res.result?.error || 'AI服务返回错误';
            wx.showModal({
              title: '分析失败',
              content: '原因: ' + (typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails),
              showCancel: false
            });
          }
        } catch (error) {
          safeHideLoading();
          console.error('🚨 生成流程中断:', error);
          wx.showToast({ title: '生成成功，但扣费失败', icon: 'none', duration: 3000 });
          wx.navigateTo({ 
            url: '/pages/result/result?report=' + encodeURIComponent(res.result.result.final_report) + '&type=ads' 
          });
        }
      },
      fail: (err) => {
        clearTimeout(loadingTimeout);
        safeHideLoading();
        this.handleApiError(err);
      }
    });
  },

  clearFile() {
    this.setData({ fileName: '', rawData: '' });
    wx.showToast({ title: '已清除文件', icon: 'success' });
  }
});
