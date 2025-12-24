// pages/admin-login/admin-login.js
const app = getApp();

Page({
  data: {
    username: '',
    password: ''
  },

  // 输入账号 (对应 wxml 中的 bindinput="onInputUsername")
  onInputUsername(e) { 
    this.setData({ username: e.detail.value }) 
  },

  // 输入密码 (对应 wxml 中的 bindinput="onInputPwd")
  onInputPwd(e) { 
    this.setData({ password: e.detail.value }) 
  },

  // 点击登录按钮
  handleLogin() {
    const { username, password } = this.data;
    
    console.log('⚡️ 正在尝试管理员登录:', username, password);

    if (!username || !password) {
      wx.showToast({ title: '请输入账号密码', icon: 'none' });
      return;
    }

    // 建议：直接写死本地地址，防止 globalData 没配置导致 undefined
    const loginUrl = 'http://localhost:8080/admin/employee/login';
    
    console.log(`🚀 发送请求到: ${loginUrl}`);

    wx.showLoading({ title: '登录中...' });

    wx.request({
      url: loginUrl, 
      method: 'POST',
      data: {
        username: username,
        password: password
      },
      success: (res) => {
        wx.hideLoading();
        console.log('📦 后端返回:', res); 

        // 兼容性判断：只要状态码是 200 且业务码是 1，就算成功
        if (res.statusCode === 200 && res.data.code === 1) {
          
          const adminData = res.data.data; // 通常用户信息在 data 字段里
          
          console.log('👑 管理员登录成功, 数据:', adminData);

          // ⚠️注意：把管理员信息单独存，不要覆盖普通用户的 userInfo
          wx.setStorageSync('adminInfo', adminData);
          
          // ✨✨✨ 核心修复：取出后端返回的 Token 并存入本地 ✨✨✨
          // 之前的代码注释掉了这行，导致没有存 Token
          if (adminData.token) {
             wx.setStorageSync('admin_token', adminData.token);
             console.log('🔑 管理员Token已存储:', adminData.token);
          } else {
             console.error('❌ 后端未返回Token，后续请求可能会报401');
          }
          
          wx.showToast({ title: '登录成功', icon: 'success' });
          
          // 延迟跳转到管理端仪表盘
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/manager-dashboard/manager-dashboard',
              fail: (err) => {
                // 如果没有仪表盘页面，提示一下
                console.error("跳转失败，可能是页面路径不对", err);
                wx.showToast({ title: '跳转失败，请检查路径', icon: 'none' });
              }
            });
          }, 1000);

        } else {
          // 登录失败
          const errorMsg = res.data.msg || '账号或密码错误';
          console.error('❌ 登录失败详情:', res.data);
          
          wx.showModal({
            title: '登录失败',
            content: `错误信息: ${errorMsg}`,
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('❌ 网络请求失败:', err);
        wx.showToast({ title: '服务器连接失败', icon: 'none' });
      }
    });
  }
});