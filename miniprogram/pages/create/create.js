// pages/create/create.js (已集成灰度开关 + 埋点 + 次数扣减)
Page({
  data: {
    // 核心状态
    workflowType: null,
    isLoading: false,
    remainingCount: 0,
    isFeatureDisabled: false, // 🆕 灰度开关状态

    // 付费引导弹窗 - 默认false
    showPremiumDialog: false,
    hasPhone: false,
    phoneNumber: '',

    // 广告分析所需数据
    businessGoal: '',
    rawData: '',
    fileName: '',

    // SOP所需数据
    productName: '',
    productFunctions: '',
    targetAudience: '',
    material: '',
    batteryLife: '',
    dimensions: '',
    weight: '',
    waterproofRating: ''
  },

  // 页面加载时，接收从首页传来的参数
  onLoad(options) {
    console.log('页面加载开始');
    this.setData({
      showPremiumDialog: false
    });
    
    if (options && options.type) {
      this.setData({
        workflowType: options.type
      });
    }
    
    this.getRealUserCredits();
  },

  // 🆕 优化：添加了标准的 goBack 方法
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: (err) => {
        console.log('返回失败，尝试其他方式:', err);
        // 备用方案：跳转到首页
        wx.switchTab({
          url: '/pages/home/home'
        });
      }
    });
  },

  // 从后端获取真实用户次数 (🆕 已集成灰度开关)
  async getRealUserCredits() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_user_info'
      });
      const userData = res.result.data || {};
      console.log('后端用户数据:', userData);

      // ------------------------------------
      // 🆕 灰度开关检查
      // ------------------------------------
      if (userData.featureOff === true) {
        this.setData({ 
          isFeatureDisabled: true, 
          isLoading: false, 
          remainingCount: 0 
        });
        wx.showModal({ 
          title: '提示', 
          content: '功能维护中，请稍后重试', 
          showCancel: false 
        });
        return; // 终止后续逻辑
      }
      // ------------------------------------

      const remainingTrials = userData.remainingTrials || 0;
      const paidCredits = userData.paidCredits || 0;
      const totalCredits = remainingTrials + paidCredits;
      
      this.setData({
        remainingCount: totalCredits,
        hasPhone: !!userData.phoneNumber,
        isFeatureDisabled: false // 确保功能开启
      });
      
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = userData;
      }
      
      console.log('真实剩余次数:', totalCredits);
      
    } catch (error) {
      console.error('获取用户次数失败:', error);
      try {
        const localUserInfo = wx.getStorageSync('userInfo');
        if (localUserInfo) {
          this.setData({
            remainingCount: localUserInfo.remainingCount || 0
          });
        }
      } catch (e) {
        console.error('读取本地存储失败:', e);
      }
    }
  },

  onShow() {
    this.setData({
      showPremiumDialog: false
    });
    if (this.data.remainingCount === 0 && !this.data.isFeatureDisabled) {
      this.getRealUserCredits();
    }
  },

  // 检查用户次数
  async checkUserCredits() {
    await this.getRealUserCredits();
    const { remainingCount } = this.data;
    
    console.log('检查用户次数:', remainingCount);
    
    if (remainingCount > 0) {
      return { success: true, remainingCount: remainingCount };
    } else {
      return { 
        success: false, 
        hasPhone: this.data.hasPhone,
        reason: 'no_credits' 
      };
    }
  },

  // 显示付费引导弹窗
  showPremiumGuide(hasPhone) {
    console.log('显示付费引导，hasPhone:', hasPhone);
    this.setData({
      showPremiumDialog: true,
      hasPhone: hasPhone || false,
      phoneNumber: ''
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value });
  },

  // 注册并跳转付费
  async registerAndGoToPay() {
    const { phoneNumber } = this.data;
    if (!phoneNumber) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '注册中...' });
      const res = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          phoneNumber: phoneNumber
        }
      });
      console.log('注册成功:', res);
      
      this.setData({
        hasPhone: true
      });
      
      await this.getRealUserCredits();
      
      wx.hideLoading();
      
      setTimeout(() => {
        this.goToPayPage();
      }, 500);
    } catch (error) {
      wx.hideLoading();
      console.error('注册失败:', error);
      wx.showToast({ title: '注册失败，请重试', icon: 'none' });
    }
  },

  // 跳转付费页面
  goToPayPage() {
    console.log('跳转到套餐页面');
    this.setData({ showPremiumDialog: false });
    wx.navigateTo({
      url: '/pages/premium/packages/packages',
      success: () => console.log('跳转成功'),
      fail: (err) => {
        console.log('跳转失败:', err);
        wx.showToast({ 
          title: '跳转失败，请稍后重试', 
          icon: 'none' 
        });
      }
    });
  },

  // 关闭弹窗
  onCancelDialog() {
    this.setData({ 
      showPremiumDialog: false,
      phoneNumber: ''
    });
  },

  // 统一的提交前检查 (🆕 已集成埋点)
  async checkBeforeSubmit() {
    const checkResult = await this.checkUserCredits();

    // ------------------------------------
    // 🆕 优化：添加埋点 (Fire and Forget)
    // ------------------------------------
    try {
      wx.cloud.callFunction({ 
        name: 'analytics', 
        data: { 
          event: 'check_credit', 
          hasCredit: checkResult.success,
          workflow: this.data.workflowType // 额外记录是哪个功能触发的
        } 
      });
      // 注意：这里不需要 await，让它异步执行即可
      // 我们不希望埋点失败时阻塞用户的核心流程
    } catch (e) {
      console.error('Analytics call failed', e); // 仅记录错误，不打断用户
    }
    // ------------------------------------
    
    if (!checkResult.success) {
      this.showPremiumGuide(checkResult.hasPhone);
      return false;
    }
    
    return true;
  },

  // 🆕 核心修复：扣减用户次数
  async deductUserCredits() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'update_user_credits',
        data: {
          type: 'use'
        }
      });
      console.log('✅ 次数扣减成功:', res);
      return { success: true };
    } catch (error) {
      console.error('❌ 次数扣减失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 优化：统一的错误处理
  handleApiError(error) {
    console.error('API错误:', error);
    if (error.errMsg && error.errMsg.includes('network')) {
      wx.showToast({ title: '网络连接失败，请检查网络', icon: 'none' });
    } else if (error.errMsg && error.errMsg.includes('timeout')) {
      wx.showToast({ title: '请求超时，请重试', icon: 'none' });
    } else {
      wx.showToast({ title: '服务暂时不可用', icon: 'none' });
    }
  },

  // 在页面卸载时清理大数据
  onUnload() {
    this.setData({
      rawData: '',
      fileName: '',
      businessGoal: '',
      productName: '',
      productFunctions: '',
      targetAudience: '',
      isLoading: false
    });
    console.log('页面卸载，清理数据完成');
  },

  // 在页面隐藏时也可以清理
  onHide() {
    this.setData({
      isLoading: false,
      showPremiumDialog: false
    });
  },

  // 返回功能选择
  goBackToSelect() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  // --- SOP 输入处理 ---
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

  // --- SOP 逻辑 --- (🆕 已集成灰度开关 + 次数扣减)
  async handleSopSubmit(e) {
    // 🆕 灰度开关检查
    if (this.data.isFeatureDisabled) {
      wx.showModal({ title: '提示', content: '功能维护中，请稍后重试', showCancel: false });
      return;
    }
    
    console.log('SOP提交，检查次数...');
    const canProceed = await this.checkBeforeSubmit();
    if (!canProceed) {
      console.log('次数不足，阻止提交');
      return;
    }

    console.log('次数充足，继续提交逻辑');
    
    const { 
      productName, 
      productFunctions, 
      targetAudience,
      material,
      batteryLife, 
      dimensions,
      weight,
      waterproofRating
    } = this.data;
    if (!productName || !productFunctions || !targetAudience) {
      wx.showToast({ title: '请填写所有必填项', icon: 'none' });
      return;
    }

    const formatStringToArray = (str) => {
      if (!str) return [];
      return str.replace(/，/g, ',').replace(/、/g, ',').replace(/\n/g, ',').replace(/\//g, ',')
               .split(',')
               .map(item => item.trim())
               .filter(item => item);
    };
    
    const productFunctionsArray = formatStringToArray(productFunctions);
    const targetAudienceArray = formatStringToArray(targetAudience);

    if (productFunctionsArray.length === 0 || targetAudienceArray.length === 0) {
      wx.showToast({ title: '核心卖点与目标用户不能为空', icon: 'none' });
      return;
    }
    
    this.setData({ isLoading: true });
    
    let loadingActive = true;
    wx.showLoading({ 
      title: 'SOP生成中，通常需要1分钟，请耐心等待...',
      mask: true
    });
    
    const productParameters = {
      material: material || '',
      batteryLife: batteryLife || '',
      dimensions: dimensions || '',
      weight: weight || '',
      waterproofRating: waterproofRating || ''
    };

    const safeHideLoading = () => {
      if (loadingActive) {
        loadingActive = false;
        this.setData({ isLoading: false });
        wx.hideLoading();
      }
    };
    
    const loadingTimeout = setTimeout(() => {
      safeHideLoading();
      wx.showToast({ 
        title: '请求超时，请重试', 
        icon: 'none'
      });
    }, 90000);
    
    wx.cloud.callFunction({
      name: 'coze-proxy-new',
      data: {
        workflowType: 'sop',
        productName: productName,
        productFunctions: productFunctionsArray, 
        targetAudience: targetAudienceArray,
        productParameters: productParameters
      },
      success: async (res) => {
        clearTimeout(loadingTimeout);
        
        // 🆕 核心修复：AI调用成功后扣减次数
        const deductResult = await this.deductUserCredits();
        if (!deductResult.success) {
          safeHideLoading();
          wx.showToast({ title: '次数扣减失败，请重试', icon: 'none' });
          return;
        }
        
        safeHideLoading();
        
        if (res.result && res.result.success && res.result.result) {
          let finalReportContent = '';
          
          if (res.result.result.final_report) {
            finalReportContent = res.result.result.final_report;
            
            if (finalReportContent.startsWith('{') && finalReportContent.includes('listing_copy')) {
              try {
                const parsed = JSON.parse(finalReportContent);
                finalReportContent = parsed.listing_copy || finalReportContent;
              } catch (e) {}
            }
            
            wx.navigateTo({
               url: `/pages/result/result?report=${encodeURIComponent(finalReportContent)}&type=sop`
            });
            return;
          }
        }

        wx.showModal({
          title: '生成失败',
          content: '未能获取到有效的结果，请稍后重试',
          showCancel: false,
          confirmText: '确定'
        });
      },
      fail: (err) => {
        clearTimeout(loadingTimeout);
        safeHideLoading();
        this.handleApiError(err);
      }
    });
  },

  // ==================== 广告分析模块 ====================
  
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
        showCancel: false, 
        confirmText: '我明白了' 
      }) 
    });
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1, 
      type: 'file', 
      extension: ['csv', 'txt'],
      success: res => {
        const file = res.tempFiles[0];
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: file.path, 
          encoding: 'utf8',
          success: readRes => {
            const fileContent = readRes.data;
            if (this.validateData(fileContent)) {
              this.setData({ fileName: file.name, rawData: fileContent });
              wx.showToast({ title: '文件校验通过!', icon: 'success' });
            } else {
              this.setData({ fileName: '', rawData: '' });
            }
          },
          fail: () => wx.showToast({ title: '文件读取失败', icon: 'none' })
        });
      },
      fail: () => {
        wx.showToast({ title: '文件选择失败', icon: 'none' });
      }
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
    
    const firstLine = lines[0].replace(/\r/g, '').trim();
    if (firstLine !== expectedHeaders) {
      wx.showModal({ 
        title: '格式错误', 
        content: '文件第一行的表头与模板不符。请用记事本以UTF-8格式保存。', 
        showCancel: false, 
        confirmText: '好的' 
      });
      return false;
    }
    
    const dataLine = lines[1].split(',');
    if (dataLine.length < 5) {
      wx.showToast({ title: '数据格式不正确，请检查列数', icon: 'none' });
      return false;
    }
    
    if (!dataLine[0] || !dataLine[1] || !dataLine[2]) {
      wx.showToast({ title: '请填写日期、广告活动和广告组信息', icon: 'none' });
      return false;
    }
    
    return true;
  },

  async startAnalysis() {
    // 🆕 灰度开关检查
    if (this.data.isFeatureDisabled) {
      wx.showModal({ title: '提示', content: '功能维护中，请稍后重试', showCancel: false });
      return;
    }

    console.log('广告分析提交，检查次数...');
    
    const canProceed = await this.checkBeforeSubmit();
    if (!canProceed) {
      console.log('次数不足，阻止提交');
      return;
    }

    console.log('次数充足，继续分析逻辑');
    const { businessGoal, rawData } = this.data;
    
    if (!businessGoal) {
      wx.showToast({ title: '请输入业务目标', icon: 'none' });
      return;
    }
    
    if (!rawData) {
      wx.showToast({ title: '请上传数据文件', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    
    let loadingActive = true;
    wx.showLoading({ 
      title: '数据AI分析中，通常需要1分钟，请耐心等待...',
      mask: true
    });
    
    const safeHideLoading = () => {
      if (loadingActive) {
        loadingActive = false;
        this.setData({ isLoading: false });
        wx.hideLoading();
      }
    };
    
    const loadingTimeout = setTimeout(() => {
      safeHideLoading();
      wx.showToast({ 
        title: '请求超时，请重试', 
        icon: 'none'
      });
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
        
        // 🆕 核心修复：AI调用成功后扣减次数
        const deductResult = await this.deductUserCredits();
        if (!deductResult.success) {
          safeHideLoading();
          wx.showToast({ title: '次数扣减失败，请重试', icon: 'none' });
          return;
        }
        
        safeHideLoading();
        
        if (res.result && res.result.success && res.result.result && res.result.result.final_report) {
          wx.navigateTo({ 
            url: `/pages/result/result?report=${encodeURIComponent(res.result.result.final_report)}&type=ads` 
          });
        } else {
          const result = res.result || {};
          let errorDetails = result.details || result.error || 'AI服务返回了未知的错误内容';
          if (typeof errorDetails === 'object') {
            errorDetails = JSON.stringify(errorDetails, null, 2);
          }
          wx.showModal({
            title: '分析失败',
            content: `原因: ${errorDetails}`,
            showCancel: false,
            confirmText: '我明白了'
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
    this.setData({ 
      fileName: '', 
      rawData: '' 
    });
    wx.showToast({ title: '已清除文件', icon: 'success' });
  }
});