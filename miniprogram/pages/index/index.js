Page({
  data: {
    powerList: [
      {
        title: '智能Listing-SOP生成',
        tip: '为您的产品生成专业的深度营销内容文章',
        type: 'sop',
        isAI: true
      },
      {
        title: '智能广告数据分析', 
        tip: '只需上传数据，为您生成深度洞察策略报告',
        type: 'ads',
        isAI: true
      }
    ]
  },

  onLoad() {
    console.log('=== 首页加载 ===');
    console.log('审核模式:', wx.getStorageSync('isReviewEnv'));
  },

  // SOP生成 - 直接跳转
  onSOPButtonClick() {
    console.log('SOP按钮点击 - 直接跳转');
    wx.navigateTo({
      url: '/pages/create/create?type=sop'
    });
  },

  // 广告分析 - 直接跳转
  onAdButtonClick() {
    console.log('广告分析按钮点击 - 直接跳转');
    wx.navigateTo({
      url: '/pages/create/create?type=ads'
    });
  }
})