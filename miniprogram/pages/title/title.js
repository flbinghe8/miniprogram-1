// pages/title/title.js - 最终修复版 (已将 workflowType 统一为 'seo')

Page({
  data: {
      isLoading: false,
      // 对应 AI 接口所需输入
      productName: '',
      productFeatures: '',
      coreKeywords: '',
      targetAudience: '',
      longTailKeywords: '',
      brandName: '',
  },

  onLoad: function(options) {
      // 确保如果有参数，也会被处理，这里暂时只打印
      console.log('Title Page Loaded with options:', options);
  },

  // 返回首页方法 (用于WXML中的返回按钮)
  goBackToSelect() {
      wx.switchTab({
          url: '/pages/home/home'
      });
  },

  // --- 输入处理函数 ---
  onInput(e) {
      const field = e.currentTarget.dataset.field;
      this.setData({
          [field]: e.detail.value
      });
  },

  // --- 辅助函数：格式化字符串为数组 ---
  formatStringToArray(str) {
      if (!str) return [];
      return str.replace(/，/g, ',').replace(/、/g, ',').replace(/\n/g, ',').replace(/\//g, ',')
          .split(',')
          .map(item => item.trim())
          .filter(item => item);
  },

  // --- 提交按钮逻辑 ---
  handleSubmit() {
      const { productName, productFeatures, coreKeywords, targetAudience, longTailKeywords, brandName } = this.data;

      // 1. 验证必填项
      if (!productName || !productFeatures || !coreKeywords || !targetAudience) {
          wx.showToast({ title: '请填写所有必填项', icon: 'none' });
          return;
      }

      // 2. 格式化数据
      const formattedData = {
          product_name: productName.trim(),
          product_features: this.formatStringToArray(productFeatures),
          core_keywords: this.formatStringToArray(coreKeywords),
          target_audience: this.formatStringToArray(targetAudience),
          long_tail_keywords: this.formatStringToArray(longTailKeywords),
          brand_name: brandName.trim(),
      };
      if (formattedData.product_features.length === 0 || formattedData.core_keywords.length === 0 || formattedData.target_audience.length === 0) {
          wx.showToast({ title: '核心卖点、关键词和目标用户不能为空', icon: 'none' });
          return;
      }

      this.setData({ isLoading: true });
      
      // 4. 显示 Loading 提示
      wx.showLoading({ title: 'AI生成中，请等待...', mask: true });
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

      // 5. 调用云函数（核心修复点：使用 'seo'）
      wx.cloud.callFunction({
          name: 'coze-proxy-new', 
          data: {
              workflowType: 'seo', // 【最终修复点：使用 'seo' 匹配云函数】
              ...formattedData
          },
          success: (res) => {
              clearTimeout(loadingTimeout);
              safeHideLoading();
              
              // 注意：这里仍然使用 'title' 作为 result 页面的 type，便于展示
              const resultType = 'title'; 

              if (res.result && res.result.success && res.result.result && res.result.result.final_report) {
                  const finalReportContent = res.result.result.final_report;
                  wx.navigateTo({
                      url: `/pages/result/result?report=${encodeURIComponent(finalReportContent)}&type=${resultType}`
                  });
              } else {
                  console.error("无法提取报告内容:", res);
                  wx.showModal({
                      title: '生成失败',
                      content: '未能获取到有效的结果，请稍后重试',
                      showCancel: false
                  });
              }
          },
          fail: (err) => {
              clearTimeout(loadingTimeout);
              safeHideLoading();
              console.error('云函数调用失败:', err);
              wx.showToast({ title: '网络错误，请重试', icon: 'none' });
          }
      });
  }
});