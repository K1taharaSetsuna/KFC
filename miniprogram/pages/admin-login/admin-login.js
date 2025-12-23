Page({
  data: {
    password: ''
  },

  onInputPwd(e) {
    this.setData({
      password: e.detail.value
    });
  },

  handleLogin() {
    const pwd = this.data.password;
    
    // ✨✨✨ 简单密码校验 (你可以改成任意密码) ✨✨✨
    if (pwd === '123456') {
      wx.showToast({ title: '登录成功', icon: 'success' });
      
      // 延迟 1 秒后跳转到管理端
      setTimeout(() => {
        // 使用 reLaunch 关闭所有页面，防止通过左上角返回键退回到登录页
        wx.reLaunch({
          url: '/pages/manager-dashboard/manager-dashboard'
        });
      }, 1000);
      
    } else {
      wx.showToast({ title: '密码错误', icon: 'error' });
    }
  }
})