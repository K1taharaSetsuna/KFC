const app = getApp();

Page({
  data: {
    userInfo: null,
    vouchers: [],
    vipExpireText: ''
  },

  onShow() {
    this.checkLogin();
  },

  checkLogin() {
    const user = app.globalData.user;
    if (user) {
      const text = user.vipExpireTime ? user.vipExpireTime.split('T')[0] : '';
      this.setData({ userInfo: user, vipExpireText: text });
      this.fetchVouchers(user.id);
    } else {
      this.setData({ userInfo: null, vouchers: [], vipExpireText: '' });
    }
  },

  login() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  logout() {
    app.globalData.user = null;
    this.setData({ userInfo: null, vouchers: [], vipExpireText: '' });
    wx.showToast({ title: '已退出', icon: 'none' });
  },

  goToAddress() {
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToOrders() {
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  },

  goToVip() {
    wx.switchTab({
      url: '/pages/vip/vip'
    });
  },

  fetchVouchers(userId) {
    const that = this;
    wx.request({
      url: `http://localhost:8080/user/voucher/list?userId=${userId}`,
      success(res) {
        if(res.data) that.setData({ vouchers: res.data });
      }
    });
  }
})
