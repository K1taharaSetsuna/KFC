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

    const that = this;
    
    // 1. 请求后端发送验证码
    wx.request({
      url: `${app.globalData.baseUrl}/user/sendMsg`,
      method: 'POST',
      data: {
        phone: that.data.phone
      },
      success(res) {
        if (res.data.code === 1) {
            // === 开发便利性优化：如果后端返回了验证码，直接弹窗提示 ===
            if (res.data.map && res.data.map.validateCode) {
                wx.showModal({
                    title: '验证码 (测试模式)',
                    content: '当前验证码为：' + res.data.map.validateCode,
                    showCancel: false,
                    confirmText: '一键填入',
                    success: (mRes) => {
                        if (mRes.confirm) {
                            that.setData({ code: res.data.map.validateCode });
                            that.checkLoginStatus();
                        }
                    }
                });
            } else {
                wx.showToast({ title: '验证码已发送', icon: 'none' });
            }
            
            // === 关键修复：保存 Session Cookie ===
            // 微信小程序不会自动管理 Cookie，必须手动保存
            let cookie = res.header['Set-Cookie'] || res.header['set-cookie'];
            if (cookie) {
                // 有时候 cookie 是数组，有时候是字符串，如果是数组取第一个包含 JSESSIONID 的
                if (Array.isArray(cookie)) {
                    cookie = cookie.find(s => s.includes('JSESSIONID')) || cookie[0];
                }
                // 处理一下可能的分号，确保格式正确 (虽然后端通常能识别乱糟糟的)
                // 简单起见直接存
                wx.setStorageSync('session_cookie', cookie);
                console.log('【Debug】Session Cookie 已保存:', cookie);
            }

            // 倒计时逻辑
            that.setData({ counting: true });
            let seconds = 60;
            that.timer = setInterval(() => {
              seconds--;
              if (seconds <= 0) {
                clearInterval(that.timer);
                that.setData({
                  counting: false,
                  codeBtnText: '获取验证码'
                });
              } else {
                that.setData({
                  codeBtnText: `${seconds}s`
                });
              }
            }, 1000);
            
        } else {
            wx.showToast({ title: res.data.msg || '发送失败', icon: 'none' });
        }
      },
      fail() {
          wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  handleLogin() {
    if (!this.data.canLogin) return;

    wx.showLoading({ title: '登录中...' });
    const that = this;

    // 2. 请求后端验证码登录
    wx.request({
      url: `${app.globalData.baseUrl}/user/loginByPhone`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'Cookie': wx.getStorageSync('session_cookie') // === 关键修复：带上 Cookie ===
      },
      data: {
          phone: that.data.phone,
          code: that.data.code
      },
      success(res) {
        wx.hideLoading();
        // 兼容 R 对象结构
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          const user = res.data.data;
          app.globalData.user = user;
          
          // === 修复：同步保存到本地缓存 ===
          // 这样 'me.js' 的 onShow 才能读取到最新状态
          wx.setStorageSync('userInfo', user);
          wx.setStorageSync('token', user.id); // 简单起见使用 id 作为 token

          wx.showToast({ title: '登录成功', icon: 'success' });
          
          // 延迟跳转
          setTimeout(() => {
              wx.navigateBack({ delta: 2 }).catch(() => {
                 wx.switchTab({ url: '/pages/me/me' });
              });
          }, 500);

        } else {
          wx.showToast({ title: res.data.msg || '验证码错误', icon: 'none' });
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
