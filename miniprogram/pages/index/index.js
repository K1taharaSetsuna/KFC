const app = getApp()

Page({
  data: {
    // 👇 1. 这里换成了你的本地图片路径
    banners: [
      { id: 1, image: 'https://placehold.co/600x300/d62f35/ffffff?text=KFC+Banner+1' },
      { id: 2, image: 'https://placehold.co/600x300/d62f35/ffffff?text=KFC+Banner+2' }
    ],
    
    // 店铺信息 (保持不变)
    shopInfo: {
      name: 'KFC 肯德基 (校园实训店)',
      status: 1,
      address: '正在获取定位...',
      openHours: '07:00-23:00',
      image: '' 
    }
  },

  onLoad() {
    this.fetchBanners();
    this.fetchShopInfo();
  },

  fetchBanners() {
    const that = this;
    if (!app.globalData.baseUrl) return;
    
    // 尝试从后端获取，如果失败或者没数据，就自动使用上面的本地图片兜底
    wx.request({
      url: `${app.globalData.baseUrl}/banner/list`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          // 如果后端有数据，这里可以覆盖；或者你决定暂时只用本地图，这行可以注释掉
           that.setData({ banners: res.data });
        }
      }
    });
  },

  fetchShopInfo() {
    const that = this;
    if (!app.globalData.baseUrl) return;

    wx.request({
      url: `${app.globalData.baseUrl}/shop/status`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ shopInfo: res.data });
          if (app.globalData) app.globalData.shop = res.data;
        }
      },
      fail() {
        app.globalData.shop = { id: 1, name: '默认店铺' };
        that.setData({
          'shopInfo.address': '常用收货地址附近',
          'shopInfo.name': 'KFC 肯德基 (默认店)'
        });
      }
    });
  },

  goToMenu() {
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  goToMe() {
    wx.switchTab({ url: '/pages/me/me' })
  }
});