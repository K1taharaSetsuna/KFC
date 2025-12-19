const app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    codeBtnText: '获取验证码',
    counting: false,
    canGetCode: false,
    canLogin: false,
    isAgreed: false
  },

  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone,
      canGetCode: /^1\d{10}$/.test(phone)
    });
    this.checkLoginStatus();
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value });
    this.checkLoginStatus();
  },

  toggleAgree() {
    this.setData({ isAgreed: !this.data.isAgreed });
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const { phone, code, isAgreed } = this.data;
    const canLogin = /^1\d{10}$/.test(phone) && code.length >= 4 && isAgreed;
    this.setData({ canLogin });
  },

  getVerificationCode() {
    if (!this.data.canGetCode || this.data.counting) return;

    wx.showToast({ title: '验证码已发送', icon: 'none' });
    
    // 倒计时
    this.setData({ counting: true });
    let seconds = 60;
    
    this.timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(this.timer);
        this.setData({
          counting: false,
          codeBtnText: '获取验证码'
        });
      } else {
        this.setData({
          codeBtnText: `${seconds}s`
        });
      }
    }, 1000);
  },

  handleLogin() {
    if (!this.data.canLogin) return;

    wx.showLoading({ title: '登录中...' });

    // 模拟验证码登录，实际可以传 phone 和 code 给后端
    // 这里依然复用 userId=1 的模拟登录
    const that = this;
    wx.request({
      url: 'http://localhost:8080/user/login?userId=1', 
      method: 'GET',
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data) {
          app.globalData.user = res.data;
          // 更新手机号显示 (模拟)
          if(app.globalData.user) {
              app.globalData.user.phone = that.data.phone;
          }
          
          wx.showToast({ title: '登录成功', icon: 'success' });
          
          // 返回首页或我的页面
          // 这里使用 switchTab 确保跳转到底部导航页
          // 也可以 navigateBack 2层
          wx.navigateBack({ delta: 2 }).catch(() => {
             wx.switchTab({ url: '/pages/me/me' });
          });
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

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  }
})
