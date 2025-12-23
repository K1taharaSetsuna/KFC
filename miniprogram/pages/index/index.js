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

    // 3. 店铺信息 (支持定位状态)
    shopInfo: {
      name: 'KFC 肯德基 (默认店)',
      status: 1, // 1:营业中
      address: '点击开启定位...', // ✨ 初始状态提示文字
      openHours: '07:00-23:00',
      hasLocation: false, // ✨ 新增：标记是否已成功定位
      image: '' 
    }
  },

  onLoad() {
    this.fetchBanners();
    // 这里的 fetchShopInfo 获取的是后端店铺状态
    this.fetchShopInfo();
    // ✨✨✨ 页面加载时，尝试自动定位 ✨✨✨
    this.initLocation();
  },

  // ✨✨✨ 核心名字解析逻辑 (完全保留你的版本) ✨✨✨
  onShow() {
    const globalUser = app.globalData.user;
    
    console.log('【首页】全局User对象:', globalUser);

    if (globalUser) {
      // 1. 暴力查找
      let finalName = '肯德基用户';

      if (globalUser.nickName) {
        finalName = globalUser.nickName;
      } else if (globalUser.nickname) {
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
        finalName = globalUser.phone;
      }

      // 2. 组装数据
      const displayUser = {
        ...globalUser,
        displayName: finalName 
      };

      this.setData({ user: displayUser });
    } else {
      this.setData({ user: null });
    }
  },

  // ✨✨✨ 新增：定位权限检查与初始化 ✨✨✨
  initLocation() {
    const that = this;
    wx.getSetting({
      success(res) {
        // 如果没有授权过，发起授权请求
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success() {
              that.getLocation(); // 同意了，去定位
            },
            fail() {
              console.log('用户拒绝了定位授权');
            }
          })
        } else {
          // 已经有权限了，直接定位
          that.getLocation();
        }
      }
    })
  },

  // ✨✨✨ 新增：获取经纬度并更新地址 ✨✨✨
  getLocation() {
    const that = this;
    wx.showLoading({ title: '正在寻找附近门店...' });

    wx.getLocation({
      type: 'gcj02',
      success(res) {
        console.log('获取经纬度成功:', res.latitude, res.longitude);
        
        // 🚀 模拟：假装调用了后端接口，找到了最近的实训中心店
        setTimeout(() => {
            // 1. 构造一个完整的店铺对象 (包含距离 distance)
            const newShop = {
                name: 'KFC 肯德基 (海大路校园店)',
                address: '麻章区湖光镇海大路1号校内商业中心', 
                status: 1,
                openHours: '07:00-23:00',
                hasLocation: true,
                distance: '50m' // ✨ 加个距离给点餐页用
            };

            // 2. 更新首页显示
            that.setData({
                shopInfo: newShop
            });

            // ✨✨✨ 3. 关键修改：同步到全局变量，让点餐页也能拿到！✨✨✨
            if (app.globalData) {
                app.globalData.shop = newShop;
                console.log('【首页】已将店铺同步到全局变量');
            }

            wx.hideLoading();
            wx.showToast({ title: '已定位', icon: 'success' });
        }, 800);
      },
      fail(err) {
        wx.hideLoading();
        console.log('定位失败', err);
        // 如果是因为未授权导致的失败，引导去设置
        if (err.errMsg.indexOf('auth') !== -1) {
            that.showOpenSettingModal();
        } else {
            wx.showToast({ title: '定位失败', icon: 'none' });
        }
      }
    })
  },

  // ✨✨✨ 新增：引导打开权限设置 ✨✨✨
  showOpenSettingModal() {
    wx.showModal({
      title: '定位服务未开启',
      content: '请在设置中打开位置权限，以便为您推荐附近的肯德基',
      confirmText: '去设置',
      success(res) {
        if (res.confirm) wx.openSetting();
      }
    })
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

  // 获取店铺信息 (后端状态)
  fetchShopInfo() {
    const that = this;
    if (!app.globalData.baseUrl) return;

    wx.request({
      url: `${app.globalData.baseUrl}/shop/status`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          // 注意：这里不要直接覆盖整个 shopInfo，以免把定位状态覆盖掉
          // 我们只更新 name, status, openHours
          const newInfo = res.data;
          
          // 如果还没有定位成功，才使用后端的默认名字
          if (!that.data.shopInfo.hasLocation) {
             that.setData({
                'shopInfo.name': newInfo.name,
                'shopInfo.status': newInfo.status,
                'shopInfo.openHours': newInfo.openHours
             });
          }
          
          // 更新全局状态 (会被后面的 getLocation 覆盖，这是正常的)
          if (app.globalData) app.globalData.shop = res.data;
        }
      },
      fail() {
        app.globalData.shop = { id: 1, name: '默认店铺' };
        // 如果后端挂了，这里只是兜底，不影响定位显示的地址
        that.setData({
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