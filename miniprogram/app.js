App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'my-env-id',
        traceUser: true,
      })
    }

    this.globalData = {
      user: null
    }

    // 自动登录
    this.login();
  },

  login() {
    const that = this;
    // 模拟登录 (userId=1)
    wx.request({
      url: 'http://localhost:8080/user/login?userId=1',
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          console.log('登录成功:', res.data);
          that.globalData.user = res.data;
          
          // 如果当前在菜单页，可能需要刷新一下数据以显示会员价
          // 这里简单处理，用户可以在进入菜单页时获取
        }
      },
      fail(err) {
        console.error('登录失败', err);
      }
    });
  }
})