Page({
  data: {
    selectedPackage: '' // 默认没有选中
  },

  onLoad() {
    console.log('套餐页面加载');
  },

  goBack() {
    wx.navigateBack();
  },

  // 选择套餐
  selectPackage(e) {
    const packageId = e.currentTarget.dataset.id;
    this.setData({
      selectedPackage: packageId
    });
  },

  // 触摸开始效果
  onCardTouchStart(e) {
    const packageId = e.currentTarget.dataset.id;
    this.setData({
      touchPackage: packageId
    });
  },

  // 触摸结束效果
  onCardTouchEnd(e) {
    this.setData({
      touchPackage: ''
    });
  },

  buyPackage(e) {
    const packageId = e.currentTarget.dataset.id;
    const packages = {
      'basic': { name: '基础包', price: 9.9, credits: 10, days: 30 },
      'popular': { name: '热销包', price: 29, credits: 30, days: 60 },
      'unlimited': { name: '无限包', price: 99, credits: 100, days: 90 }
    };
    
    const selectedPackage = packages[packageId];
    
    wx.showModal({
      title: '确认购买' + selectedPackage.name,
      content: '¥' + selectedPackage.price + '，获得' + selectedPackage.credits + '次AI分析，' + selectedPackage.days + '天内有效',
      confirmText: '立即支付',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          this.processPayment(selectedPackage);
        }
      }
    });
  },

  processPayment(packageInfo) {
    wx.showLoading({ title: '准备支付...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      wx.requestPayment({
        timeStamp: String(Date.now()),
        nonceStr: '模拟随机字符串',
        package: 'prepay_id=模拟预支付ID',
        signType: 'MD5',
        paySign: '模拟签名',
        success: (res) => {
          wx.showToast({ 
            title: '购买成功！', 
            icon: 'success',
            success: () => {
              this.updateUserCredits(packageInfo.credits);
              
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        },
        fail: (err) => {
          wx.showToast({ 
            title: '支付取消', 
            icon: 'none' 
          });
        }
      });
    }, 1000);
  },

  // 🆕 修复后的函数
  updateUserCredits(credits) {
    wx.cloud.callFunction({
      name: 'update_user_credits',
      data: {
        credits: credits,
        type: 'add'
      },
      success: (res) => {
        console.log('用户次数更新成功:', res);
        
        // 显示购买成功信息
        if (res.result && res.result.success) {
          wx.showToast({
            title: '成功获得' + credits + '次额度',
            icon: 'success'
          });
        }
      },
      fail: (err) => {
        console.error('更新用户次数失败:', err);
        wx.showToast({
          title: '更新失败，请联系客服',
          icon: 'none'
        });
      }
    });
  }
});