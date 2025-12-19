const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    canLogin: false
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
    this.checkLoginStatus();
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const { username, password } = this.data;
    const canLogin = username.length > 0 && password.length > 0;
    this.setData({ canLogin });
  },

  handleLogin() {
    if (!this.data.canLogin) return;

    wx.showLoading({ title: '登录中...' });

    wx.request({
      url: 'http://localhost:8080/auth/login',
      method: 'POST',
      data: {
        username: this.data.username,
        password: this.data.password
      },
      success(res) {
        wx.hideLoading();
        const result = res.data;
        
        if (typeof result === 'string' && !result.startsWith('登录失败')) {
          // 保存 Token
          wx.setStorageSync('token', result);
          app.globalData.token = result;

          wx.showToast({ title: '登录成功', icon: 'success' });
          
          setTimeout(() => {
             // 跳转到店长端首页
             wx.navigateTo({
               url: '/pages/manager-dashboard/manager-dashboard'
             });
          }, 1500);
        } else {
          wx.showToast({ title: '账号或密码错误', icon: 'none' });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
})
