const app = getApp();

Page({
  data: {
    orders: []
  },

  onShow() {
    this.checkLoginAndFetch();
  },

  checkLoginAndFetch() {
    const user = app.globalData.user;
    if (user) {
      this.fetchOrders(user.id);
    } else {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  fetchOrders(userId) {
    const that = this;
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: `http://localhost:8080/order/user/list?userId=${userId}`,
      success(res) {
        wx.hideLoading();
        if(res.data) {
          // 格式化时间
          const list = res.data.map(item => {
            if(item.orderTime) item.orderTime = item.orderTime.replace('T', ' ');
            return item;
          });
          that.setData({ orders: list });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
})
