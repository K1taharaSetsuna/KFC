const app = getApp()

Page({
  data: {
    // 1. 用户状态 (默认为 null)
    user: null,

    // 2. 轮播图 (本地图片兜底)
    banners: [
      { id: 1, image: 'https://placehold.co/600x300/d62f35/ffffff?text=KFC+Banner+1' },
      { id: 2, image: 'https://placehold.co/600x300/d62f35/ffffff?text=KFC+Banner+2' }
    ],

    // 3. 店铺信息 (默认值)
    shopInfo: {
      name: 'KFC 肯德基 (校园实训店)',
      status: 1, // 1:营业中
      address: '正在获取定位...',
      openHours: '07:00-23:00',
      image: '' 
    }
  },

  onLoad() {
    this.fetchBanners();
    this.fetchShopInfo();
  },

  // ✨✨✨ 核心修复：全能名字解析逻辑 ✨✨✨
  onShow() {
    const globalUser = app.globalData.user;
    
    // 调试：你可以在控制台看到后端到底给了啥
    console.log('【首页】全局User对象:', globalUser);

    if (globalUser) {
      // 1. 暴力查找：把所有可能的字段名都试一遍，谁有值用谁
      let finalName = '肯德基用户'; // 默认值

      if (globalUser.nickName) {
        finalName = globalUser.nickName;
      } else if (globalUser.nickname) { //有些后端喜欢全小写
        finalName = globalUser.nickname;
      } else if (globalUser.userName) {
        finalName = globalUser.userName;
      } else if (globalUser.username) {
        finalName = globalUser.username;
      } else if (globalUser.name) {
        finalName = globalUser.name;
      } else if (globalUser.realName) {
        finalName = globalUser.realName;
      } else if (globalUser.phone) {
        finalName = globalUser.phone; // 实在没名字，用手机号顶替
      }

      // 2. 重新组装数据，确保页面只用 {{user.displayName}} 就能显示
      const displayUser = {
        ...globalUser,       // 保留原有的 points, balance, isVip 等
        displayName: finalName 
      };

      this.setData({ 
        user: displayUser 
      });
    } else {
      this.setData({ user: null });
    }
  },

  // 获取轮播图
  fetchBanners() {
    const that = this;
    if (!app.globalData.baseUrl) return;
    
    wx.request({
      url: `${app.globalData.baseUrl}/banner/list`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
           that.setData({ banners: res.data });
        }
      }
    });
  },

  // 获取店铺信息
  fetchShopInfo() {
    const that = this;
    if (!app.globalData.baseUrl) return;

    wx.request({
      url: `${app.globalData.baseUrl}/shop/status`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ shopInfo: res.data });
          if (app.globalData) app.globalData.shop = res.data;
        }
      },
      fail() {
        app.globalData.shop = { id: 1, name: '默认店铺' };
        that.setData({
          'shopInfo.address': '常用收货地址附近',
          'shopInfo.name': 'KFC 肯德基 (默认店)'
        });
      }
    });
  },

  goToMenu() {
    wx.switchTab({ url: '/pages/menu/menu' })
  },

  goToMe() {
    wx.switchTab({ url: '/pages/me/me' })
  }
});