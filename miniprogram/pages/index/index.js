const app = getApp()

Page({
  data: {
    banners: [],
    shopInfo: null
  },

  onLoad() {
    this.fetchBanners();
    this.fetchShopInfo();
  },

  fetchShopInfo() {
    const that = this;
    wx.request({
      url: 'http://localhost:8080/shop/status',
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ shopInfo: res.data });
          // 存入全局，供下单使用
          if (app.globalData) {
            app.globalData.shop = res.data;
          }
        }
      },
      fail(err) {
        console.error('获取店铺信息失败', err);
      }
    });
  },

  fetchBanners() {
    const that = this;
    wx.request({
      url: 'http://localhost:8080/banner/list',
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ banners: res.data });
        }
      },
      fail(err) {
        console.error('获取轮播图失败', err);
      }
    });
  },

  goToMenu() {
    wx.switchTab({
      url: '/pages/menu/menu'
    })
  },

  goToMe() {
    wx.switchTab({
      url: '/pages/me/me'
    })
  }
});

