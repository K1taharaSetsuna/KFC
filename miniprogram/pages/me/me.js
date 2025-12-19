const app = getApp();

Page({
  data: {
    userInfo: null,
    orders: [],
    vouchers: [],
    activeTab: 0,
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
      this.fetchOrders(user.id);
      this.fetchVouchers(user.id);
    } else {
      this.setData({ userInfo: null, orders: [], vouchers: [], vipExpireText: '' });
    }
  },

  login() {
    wx.showLoading({ title: '登录中...' });
    app.login(); 
    
    // 简单延时等待登录完成
    setTimeout(() => {
      wx.hideLoading();
      this.checkLogin();
    }, 1500);
  },

  logout() {
    app.globalData.user = null;
    this.setData({ userInfo: null, orders: [], vouchers: [], vipExpireText: '' });
    wx.showToast({ title: '已退出', icon: 'none' });
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToVip() {
    wx.switchTab({
      url: '/pages/vip/vip'
    });
  },

  switchTab(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.idx) });
  },

  fetchOrders(userId) {
    const that = this;
    wx.request({
      url: `http://localhost:8080/order/user/list?userId=${userId}`,
      success(res) {
        if(res.data) that.setData({ orders: res.data });
      }
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
