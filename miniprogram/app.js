// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
      })
    }

    this.globalData = {
      userInfo: null,
      user: null,      
      shop: null,      
      baseUrl: 'http://localhost:8080' 
    }

    // 自动登录
    this.login();
  },

  login() {
    const that = this;
    // 模拟登录 (userId=1)
    wx.request({
      url: `${this.globalData.baseUrl}/user/login?userId=1`,
      method: 'GET',
      success(res) {
        // ✨✨✨ 修复点：这里要兼容 R 对象结构 (code=1) ✨✨✨
        // 你的后端现在返回的是 R<User>，所以数据在 res.data.data 里
        
        let userData = null;
        if (res.data && res.data.code === 1) {
            userData = res.data.data;
        } else if (res.data && res.data.id) {
            // 兼容旧接口直接返回对象的情况
            userData = res.data;
        }

        if (userData) {
          console.log('✅ App自动登录成功:', userData);
          that.globalData.user = userData;
          
          // ✨✨✨ 关键修复：把“通行证”存入缓存！✨✨✨
          // 如果后端没返回专门的 token 字段，通常这个简单的项目里 ID 就是 token
          const token = userData.token || userData.id; 
          wx.setStorageSync('token', token); // <--- 这一步之前漏了！
          
          if (userData.isVip === 1) {
            console.log('👑 尊贵的大神卡用户');
          }
        }
      },
      fail(err) {
        console.error('❌ 登录失败 (请检查后端是否启动)', err);
      }
    });
  }
})