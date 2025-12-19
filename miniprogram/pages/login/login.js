const app = getApp();

Page({
  data: {
    isAgreed: false
  },

  toggleAgree() {
    this.setData({ isAgreed: !this.data.isAgreed });
  },

  handleOneClickLogin() {
    if (!this.data.isAgreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });
    
    // 调用 app.js 中的 login 方法 (复用现有逻辑)
    // 但因为 app.login 是异步的但没返回 Promise，这里我们自己模拟一下或者改造 app.js
    // 简单起见，这里直接发起请求，或者假设 app.login 成功后会更新 globalData
    
    // 我们可以直接调用 app.login()，但为了更好的 UX，最好能知道何时结束
    // 这里简单拷贝 app.login 的逻辑过来，或者直接调用
    
    const that = this;
    wx.request({
      url: 'http://localhost:8080/user/login?userId=1', // 默认登录ID=1
      method: 'GET',
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data) {
          app.globalData.user = res.data;
          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  goToMobileLogin() {
    wx.navigateTo({
      url: '/pages/login-code/login-code'
    });
  },

  goToPasswordLogin() {
    wx.navigateTo({
      url: '/pages/login-password/login-password'
    });
  }
})
