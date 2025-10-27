// pages/history/history.js - 最终稳定版（无async/await）
const db = wx.cloud.database();
const HISTORY_COLLECTION = 'generation_history'; 

Page({
  data: {
    historyList: [],
    isLoading: true,
  },
  
  onLoad: function (options) {
    console.log('历史记录页面 - 加载数据');
    this.fetchHistory();
  },

  onShow: function() {
    this.fetchHistory();
  },

  // 【✅ 核心功能：获取历史记录 - 使用回调方式】
  fetchHistory: function() {
    this.setData({ isLoading: true });
    
    db.collection(HISTORY_COLLECTION)
      .orderBy('createdTime', 'desc')
      .limit(50)
      .get()
      .then(res => {
        console.log('✅ 历史记录加载成功', res.data.length);
        
        const formattedList = res.data.map(item => {
          const date = item.createdTime ? new Date(item.createdTime) : new Date();
          return {
            ...item,
            createdTime: date.toLocaleString('zh-CN', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            }).replace(/\//g, '-'),
            contentPreview: this.truncateContent(item.reportContent)
          };
        });

        this.setData({
          historyList: formattedList,
          isLoading: false
        });
      })
      .catch(e => {
        console.error('❌ 历史记录加载失败', e);
        this.setData({ 
          historyList: [],
          isLoading: false 
        });
        wx.showToast({ 
          title: '记录加载失败', 
          icon: 'none' 
        });
      });
  },
  
  // 截断内容，用于预览
  truncateContent: function(content) {
    if (!content) return '无内容';
    
    try {
      const parsed = JSON.parse(content);
      if (parsed.x_output) {
        return parsed.x_output.substring(0, 80) + '...';
      }
      return JSON.stringify(parsed).substring(0, 80) + '...';
    } catch (e) {
      if (typeof content === 'string') {
        return content.length > 80 ? content.substring(0, 80) + '...' : content;
      }
      return '无内容';
    }
  },

  // 点击历史记录项，跳转到结果页
  goToResult: function(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    
    wx.navigateTo({
      url: `/pages/result/result?report=${encodeURIComponent(item.reportContent || '')}&type=${item.workflowType || 'unknown'}`
    });
  },

  // 【✅ 核心功能：删除记录 - 使用回调方式】
  deleteRecord: function(e) {
    const id = e.currentTarget.dataset.id;
    e.stopPropagation();
    
    if (!id) {
      wx.showToast({ 
        title: '删除失败：记录ID不存在', 
        icon: 'none' 
      });
      return;
    } 
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection(HISTORY_COLLECTION).doc(id).remove()
            .then(() => {
              wx.showToast({ 
                title: '删除成功', 
                icon: 'success' 
              });
              // 立即刷新列表
              this.fetchHistory(); 
            })
            .catch(e => {
              console.error('❌ 删除操作失败', e);
              wx.showToast({ 
                title: '删除失败，请重试', 
                icon: 'none' 
              });
            });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.fetchHistory();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
})