const app = getApp()

Page({
  data: {
    // 1. 用户状态 (默认为 null)
    user: null,

    // 2. 轮播图 (✨✨✨ 修改：默认使用本地图片兜底，防止接口不通时裂图 ✨✨✨)
    banners: [
      { id: 1, image: '/images/banner1.jpg' },
      { id: 2, image: '/images/banner2.jpg' } // 如果你有第二张图的话
    ],

    // 3. 店铺信息 (支持定位状态)
    shopInfo: {
      name: 'KFC 肯德基 (默认店)',
      status: 1, // 1:营业中
      address: '点击开启定位...', // ✨ 初始状态提示文字
      openHours: '07:00-23:00',
      hasLocation: false, // ✨ 新增：标记是否已成功定位
      image: '' 
    },
    baseUrl: app.globalData.baseUrl // ✨ 供 WXML 拼接图片地址
  },

  onLoad() {
    // 0. 初始化默认轮播图地址 (防止本地图片被删除后裂图)
    if (app.globalData.baseUrl) {
        this.setData({
            banners: [
                { id: 1, image: `${app.globalData.baseUrl}/images/banner1.jpg` },
                { id: 2, image: `${app.globalData.baseUrl}/images/banner2.jpg` }
            ]
        });
    }

    // 1. 获取轮播图
    this.fetchBanners();
    // 2. 获取后端店铺状态
    this.fetchShopInfo();
    // 3. 尝试自动定位
    this.initLocation();
  },

  onShow() {
    const globalUser = app.globalData.user;
    
    console.log('【首页】全局User对象:', globalUser);

    if (globalUser) {
      // 1. 暴力查找名字
      let finalName = '肯德基用户';

      if (globalUser.nickName) finalName = globalUser.nickName;
      else if (globalUser.nickname) finalName = globalUser.nickname;
      else if (globalUser.userName) finalName = globalUser.userName;
      else if (globalUser.username) finalName = globalUser.username;
      else if (globalUser.name) finalName = globalUser.name;
      else if (globalUser.realName) finalName = globalUser.realName;
      else if (globalUser.phone) finalName = globalUser.phone;

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

  // ✨✨✨ 定位权限检查与初始化 ✨✨✨
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

  // ✨✨✨ 获取经纬度并更新地址 ✨✨✨
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

            // ✨✨✨ 3. 同步到全局变量，让点餐页也能拿到！✨✨✨
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

  // ✨✨✨ 引导打开权限设置 ✨✨✨
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

  // ✨✨✨ 修改版：获取轮播图 (带详细日志和兼容处理) ✨✨✨
  fetchBanners() {
    const that = this;
    if (!app.globalData.baseUrl) return;
    
    console.log('正在请求轮播图接口...'); 

    wx.request({
      url: `${app.globalData.baseUrl}/banner/list`,
      method: 'GET',
      success(res) {
        console.log('轮播图接口返回:', res); 
        
        // 情况A：后端返回了标准的 R 对象 (code === 1)
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
           const list = res.data.data;
           if (list && list.length > 0) {
               that.setData({ banners: list });
           }
        } 
        // 情况B：后端直接返回了数组 (兼容旧写法)
        else if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
            that.setData({ banners: res.data });
        }
      },
      fail(err) {
        console.error('轮播图请求失败:', err);
        // 失败了也不怕，因为 data.banners 里已经有 /images/banner1.jpg 兜底了
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
          const newInfo = res.data;
          
          // 如果还没有定位成功，才使用后端的默认名字
          if (!that.data.shopInfo.hasLocation) {
             that.setData({
                'shopInfo.name': newInfo.name,
                'shopInfo.status': newInfo.status,
                'shopInfo.openHours': newInfo.openHours
             });
          }
          
          if (app.globalData) app.globalData.shop = res.data;
        }
      },
      fail() {
        // 如果后端挂了，兜底
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