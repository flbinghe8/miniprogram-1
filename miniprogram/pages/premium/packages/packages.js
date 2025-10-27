// pages/premium/packages/packages.js
Page({
  data: {
    selectedPackage: '',
    touchPackage: ''
  },

  onLoad() {
    console.log('套餐页面加载');
  },

  goBack() {
    wx.navigateBack();
  },

  selectPackage(e) {
    this.setData({ selectedPackage: e.currentTarget.dataset.id });
  },

  onCardTouchStart(e) {
    this.setData({ touchPackage: e.currentTarget.dataset.id });
  },

  onCardTouchEnd() {
    this.setData({ touchPackage: '' });
  },

  buyPackage(e) {
    console.log('>>> buyPackage 被点击', e.currentTarget.dataset.id);
    const packageId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/payment/payment?packageType=${packageId}`
    });
  }
});