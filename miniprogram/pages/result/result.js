// pages/result/result.js - 完整美化版，支持所有工作流
const db = wx.cloud.database();
const HISTORY_COLLECTION = 'generation_history';

Page({
  data: {
    reportContent: '',
    workflowType: '',
    pageTitle: 'AI 生成结果',
    schemes: [], // 存储所有方案
    activeTab: 0,
    rawData: null
  },

  onLoad: function (options) {
    if (options.report && options.type) {
      const decodedReport = decodeURIComponent(options.report);
      const type = options.type;

      let title = '';
      switch (type) {
        case 'sop': title = '专家级Listing SOP 报告'; break;
        case 'title': title = '标题五点描述撰写报告'; break;
        case 'ads': title = '智能广告分析报告'; break;
        default: title = 'AI 生成结果';
      }

      this.setData({
        reportContent: decodedReport,
        workflowType: type,
        pageTitle: title
      });

      wx.setNavigationBarTitle({ title: title });

      // 解析报告数据
      this.parseReport(decodedReport, type);
      
      // 保存历史记录
      this.saveHistory(decodedReport, type);
    } else {
      wx.showToast({ title: '报告内容丢失', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500); 
    }
  },

  // 解析报告数据
  parseReport(report, type) {
    try {
      console.log('🔍 开始解析报告，类型:', type);
      
      if (type === 'title') {
        this.parseTitleReport(report);
      } else if (type === 'sop') {
        this.parseSOPReport(report);
      } else if (type === 'ads') {
        this.parseADSReport(report);
      } else {
        this.setData({
          schemes: [{
            name: '生成结果',
            content: report
          }]
        });
      }
    } catch (error) {
      console.error('解析报告失败:', error);
      this.setData({
        schemes: [{
          name: '原始结果',
          content: report
        }]
      });
    }
  },

  // 解析标题报告
  parseTitleReport(report) {
    try {
      console.log('📊 原始报告数据:', report);
      
      const outerData = JSON.parse(report);
      console.log('📊 外层解析结果:', outerData);
      
      if (outerData.sx_output) {
        const innerData = JSON.parse(outerData.sx_output);
        console.log('📊 内层解析结果:', innerData);
        
        const schemes = [];
        
        if (innerData.listing_options && Array.isArray(innerData.listing_options)) {
          innerData.listing_options.forEach((option, index) => {
            schemes.push({
              name: `方案${index + 1}`,
              title_zh: this.cleanText(option.title_zh),
              title_en: this.cleanText(option.title_en),
              bullet_points_zh: this.formatBulletPoints(option.bullet_points_zh),
              bullet_points_en: this.formatBulletPoints(option.bullet_points_en)
            });
          });
        }
        
        if (schemes.length > 0) {
          this.setData({
            schemes: schemes,
            activeTab: 0,
            rawData: innerData
          });
          return;
        }
      }
      
      this.setData({
        schemes: [{
          name: '完整结果',
          content: report
        }]
      });

    } catch (error) {
      console.error('解析标题报告失败:', error);
      this.setData({
        schemes: [{
          name: '原始结果',
          content: report
        }]
      });
    }
  },

  // 解析SOP报告
  parseSOPReport(report) {
    try {
      console.log('📊 解析SOP报告:', report);
      
      const parsedData = JSON.parse(report);
      const schemes = [];
      
      // 解析主图
      if (parsedData.main_images && parsedData.main_images.length > 0) {
        schemes.push({
          name: '7个主图',
          type: 'sop_images',
          images: parsedData.main_images
        });
      }
      
      // 解析A+图
      if (parsedData.aplus_images && parsedData.aplus_images.length > 0) {
        schemes.push({
          name: '10个A+图',
          type: 'sop_images', 
          images: parsedData.aplus_images
        });
      }
      
      if (schemes.length > 0) {
        this.setData({
          schemes: schemes,
          activeTab: 0,
          rawData: parsedData
        });
      } else {
        this.setData({
          schemes: [{
            name: '完整结果',
            content: report
          }]
        });
      }

    } catch (error) {
      console.error('解析SOP报告失败:', error);
      this.setData({
        schemes: [{
          name: '原始结果',
          content: report
        }]
      });
    }
  },

  // 解析广告报告
  parseADSReport(report) {
    try {
      console.log('📊 解析广告报告:', report);
      
      const parsedData = JSON.parse(report);
      const schemes = [];
      
      // 核心业绩概览
      if (parsedData.executive_summary) {
        schemes.push({
          name: '业绩概览',
          type: 'ads_summary',
          summary: parsedData.executive_summary
        });
      }
      
      // 深度分析
      if (parsedData.key_insights) {
        schemes.push({
          name: '深度分析',
          type: 'ads_insights', 
          insights: parsedData.key_insights
        });
      }
      
      // 行动方案
      if (parsedData.action_plan && parsedData.action_plan.length > 0) {
        schemes.push({
          name: '行动方案',
          type: 'ads_actions',
          actions: parsedData.action_plan
        });
      }
      
      // 风险提示
      if (parsedData.risks && parsedData.risks.length > 0) {
        schemes.push({
          name: '风险提示',
          type: 'ads_risks',
          risks: parsedData.risks
        });
      }
      
      if (schemes.length > 0) {
        this.setData({
          schemes: schemes,
          activeTab: 0,
          rawData: parsedData
        });
      } else {
        this.setData({
          schemes: [{
            name: '完整结果',
            content: report
          }]
        });
      }

    } catch (error) {
      console.error('解析广告报告失败:', error);
      this.setData({
        schemes: [{
          name: '原始结果', 
          content: report
        }]
      });
    }
  },

  // 清理文本
  cleanText(text) {
    if (typeof text !== 'string') return text || '';
    return text.replace(/W"/g, '')
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/：/g, '：')
              .trim();
  },

  // 格式化五点描述
  formatBulletPoints(points) {
    if (!points) return [];
    
    if (Array.isArray(points)) {
      return points.map(point => this.cleanText(point));
    } else if (typeof points === 'string') {
      return points.split('\n')
        .map(item => this.cleanText(item))
        .filter(item => item.trim());
    }
    return [];
  },

  // 切换标签页
  onTabChange: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      activeTab: index
    });
  },

  // 复制内容
  copyContent: function(e) {
    const content = e.currentTarget.dataset.content;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 复制所有五点描述
  copyAllBulletPoints: function(e) {
    const bulletPoints = e.currentTarget.dataset.bulletPoints;
    if (bulletPoints && Array.isArray(bulletPoints)) {
      const content = bulletPoints.join('\n');
      wx.setClipboardData({
        data: content,
        success: () => {
          wx.showToast({
            title: '已复制全部要点',
            icon: 'success'
          });
        }
      });
    }
  },

  // 复制图片内容
  copyImageContent: function(e) {
    const imageData = e.currentTarget.dataset.image;
    const content = `${imageData.headline}\n${imageData.subtext}`;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制图片内容',
          icon: 'success'
        });
      }
    });
  },

  // 保存历史记录
  saveHistory: async function(content, type) {
    try {
      await db.collection(HISTORY_COLLECTION).add({
        data: {
          workflowType: type,
          reportContent: content,
          createdTime: db.serverDate(), 
        }
      });
      console.log('✅ 历史记录保存成功');
    } catch (e) {
      console.error('❌ 历史记录保存失败', e);
    }
  },

  // 返回首页
  goBackToHome: function() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  // 复制功能
  copyReport: function() {
    wx.setClipboardData({ 
      data: this.data.reportContent, 
      success: () => { 
        wx.showToast({ title: '已复制报告全文', icon: 'success' }); 
      } 
    });
  },

  // 编辑功能
  editInput: function() {
    let targetUrl = '';
    switch(this.data.workflowType) {
      case 'sop':
      case 'ads': targetUrl = `/pages/create/create?type=${this.data.workflowType}`; break;
      case 'title': targetUrl = '/pages/title/title'; break;
      default: return this.goBackToHome();
    }
    wx.redirectTo({ url: targetUrl });
  }
});