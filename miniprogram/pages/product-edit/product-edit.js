const app = getApp();

Page({
  data: {
    id: null,
    name: '',
    category: '',
    price: '',
    description: '',
    image: '', 
    categories: ['主食', '小食', '甜品/饮料', '套餐'] 
  },

  onLoad(options) {
    // 1. 如果有 id，说明是编辑模式
    if (options.id) {
      // 2. 尝试获取传过来的完整数据
      if (options.product) {
        try {
          const product = JSON.parse(decodeURIComponent(options.product));
          
          this.setData({
            id: product.id,
            name: product.name,
            category: product.category || product.categoryName, // 兼容字段
            price: product.price,
            description: product.description,
            // 如果图片是 http 开头的网络图才显示，本地路径或者无效路径不显示
            image: (product.image && product.image.startsWith('http')) ? product.image : '' 
          });
          
          wx.setNavigationBarTitle({ title: '编辑菜品' });
        } catch (e) {
          console.error('解析菜品数据失败', e);
        }
      }
    } else {
      wx.setNavigationBarTitle({ title: '新增菜品' });
    }
  },

  // 输入事件绑定
  onInputName(e) { this.setData({ name: e.detail.value }) },
  onInputPrice(e) { this.setData({ price: e.detail.value }) },
  onInputDesc(e) { this.setData({ description: e.detail.value }) },
  
  // 分类选择
  onCategoryChange(e) {
    this.setData({
      category: this.data.categories[e.detail.value]
    })
  },

  // 选择图片
  chooseImage() {
    const that = this;
    wx.chooseImage({
      count: 1, 
      sizeType: ['compressed'], 
      sourceType: ['album', 'camera'], 
      success(res) {
        const tempPath = res.tempFilePaths[0];
        console.log('📸 已选择图片:', tempPath);
        
        // 立即上传图片
        that.uploadImage(tempPath);
      }
    })
  },

  // 上传图片到服务器
  uploadImage(filePath) {
    const that = this;
    const token = wx.getStorageSync('admin_token');
    const baseUrl = app.globalData.baseUrl;

    wx.showLoading({ title: '上传中...' });

    wx.uploadFile({
      url: `${baseUrl}/common/upload`, 
      filePath: filePath,
      name: 'file',
      header: {
        'token': token // 携带管理员Token
      },
      success(res) {
        wx.hideLoading();
        console.log('📤 上传结果:', res);
        
        if (res.statusCode === 200) {
          // 后端返回的是 R<String>，body 是 JSON 字符串
          const data = JSON.parse(res.data);
          
          if (data.code === 1) {
            // 拼接完整访问路径
            const fullUrl = `${baseUrl}/images/${data.data}`;
            that.setData({ image: fullUrl });
            console.log('✅ 图片路径已更新:', fullUrl);
          } else {
            wx.showToast({ title: data.msg || '上传失败', icon: 'none' });
          }
        } else {
            if (res.statusCode === 401) {
                wx.showToast({ title: '登录过期，请重登', icon: 'none' });
                setTimeout(() => {
                    wx.redirectTo({ url: '/pages/admin-login/admin-login' });
                }, 1500);
            } else {
                wx.showToast({ title: '上传出错', icon: 'none' });
            }
        }
      },
      fail(err) {
        wx.hideLoading();
        console.error('上传请求失败', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // ✨✨✨ 核心修复：提交保存 ✨✨✨
  submitForm() {
    const { id, name, category, price, description, image } = this.data;

    if (!name || !price || !category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const formData = {
      id: id,
      name: name,
      category: category,
      price: parseFloat(price),
      description: description,
      image: image 
    };

    // 🚨🚨🚨 关键修改：取 admin_token (管理员令牌)，而不是普通 token 🚨🚨🚨
    const token = wx.getStorageSync('admin_token');
    
    // 如果没有管理员 Token，说明登录过期，踢回登录页
    if (!token) {
        wx.showToast({ title: '登录过期，请重登', icon: 'none' });
        setTimeout(() => {
            // 使用 redirectTo 避免层级叠加
            wx.redirectTo({ url: '/pages/admin-login/admin-login' });
        }, 1500);
        return;
    }

    const baseUrl = app.globalData.baseUrl;
    // 有 id 调更新接口(PUT)，没 id 调新增接口(POST)
    // ✨✨✨ 适配后端 RESTful 接口：统一用 /product，区分方法 ✨✨✨
    const url = `${baseUrl}/product`;
    const method = id ? 'PUT' : 'POST';

    console.log(`🚀 正在提交到: ${url}, 方法: ${method}`);
    console.log('📦 携带管理员Token:', token);

    wx.request({
      url: url,
      method: method, 
      data: formData,
      // ✨✨✨ 把真正的管理员 Token 给后端 ✨✨✨
      header: { 
          'content-type': 'application/json',
          'token': token 
      }, 
      success(res) {
        // 如果后端铁面无私还是报 401
        if (res.statusCode === 401) {
             wx.showToast({ title: '权限不足，请重新登录', icon: 'none' });
             setTimeout(() => {
                wx.redirectTo({ url: '/pages/admin-login/admin-login' });
             }, 1500);
             return;
        }

        if (res.statusCode === 200) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack(); // 保存成功后自动返回上一页
          }, 1500);
        } else {
          console.error('保存失败:', res);
          wx.showToast({ title: '保存失败', icon: 'error' });
        }
      },
      fail(err) {
        console.error(err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});