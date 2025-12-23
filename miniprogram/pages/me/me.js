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
      // 处理 VIP 过期时间显示 (截取 T 之前的部分)
      const text = user.vipExpireTime ? user.vipExpireTime.split('T')[0] : '';
      this.setData({ userInfo: user, vipExpireText: text });
      // 获取优惠券
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
    // 1. 清空全局数据
    app.globalData.user = null;
    app.globalData.token = null;
    
    // 2. 清空本地缓存 (建议加上这两句，更彻底)
    wx.removeStorageSync('user');
    wx.removeStorageSync('token');

    // 3. 重置页面数据
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

  // ✨✨✨ 补上这个缺失的方法，解决报错 ✨✨✨
  goToAdminLogin() {
    wx.navigateTo({
      url: '/pages/admin-login/admin-login'
    });
  },

  fetchVouchers(userId) {
    const that = this;
    // 使用全局 baseUrl 防止硬编码，如果没配则用 localhost
    const baseUrl = app.globalData.baseUrl || 'http://localhost:8080';
    
    wx.request({
      url: `${baseUrl}/user/voucher/list?userId=${userId}`,
      method: 'GET',
      success(res) {
        // 兼容处理：后端可能直接返回List，也可能返回 R 对象
        if (res.statusCode === 200) {
            // 如果返回的是标准 R 对象 (code, msg, data)
            if (res.data.code === 1) {
                that.setData({ vouchers: res.data.data });
            } 
            // 如果直接返回的是数组 (旧逻辑)
            else if (Array.isArray(res.data)) {
                that.setData({ vouchers: res.data });
            }
        }
      },
      fail(err) {
          console.error('获取卡券失败', err);
      }
    });
  }
});