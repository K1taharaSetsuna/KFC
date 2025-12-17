const app = getApp()

Page({
  data: {
    banners: []
  },

  onLoad() {
    this.fetchBanners();
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
    wx.navigateTo({
      url: '/pages/menu/menu'
    })
  }
});


