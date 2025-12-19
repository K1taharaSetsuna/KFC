const app = getApp()

Page({
  data: {
    isEdit: false, // 标记是否为编辑模式
    categories: [], // 分类列表
    categoryIndex: -1, // 选中的分类索引

    // 表单数据
    formData: {
      id: null,
      name: '',
      categoryId: '',
      price: '',
      image: '/images/banner1.jpg', // 默认给一张图，方便测试
      description: '',
      status: 1
    }
  },

  onLoad(options) {
    // 1. 先加载分类列表 (因为下拉框要用)
    this.loadCategories().then(() => {
      // 2. 如果页面参数里有 id，说明是编辑模式
      if (options.id) {
        wx.setNavigationBarTitle({
          title: '编辑菜品'
        });
        this.setData({
          isEdit: true
        });
        this.loadProductDetail(options.id);
      } else {
        wx.setNavigationBarTitle({
          title: '新建菜品'
        });
      }
    });
  },

  // 加载分类 (✨已修复：兼容 R 对象拆包)
  loadCategories() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.baseUrl}/category/list`,
        success: (res) => {
          // 如果后端返回 R 对象 {code:1, data: [...]}
          if (res.data && res.data.code === 1) {
            this.setData({
              categories: res.data.data || []
            });
          } else {
            // 兼容旧接口
            this.setData({
              categories: res.data || []
            });
          }
          resolve();
        }
      });
    });
  },

  // 加载商品详情 (用于回显)
  loadProductDetail(id) {
    wx.showLoading({
      title: '加载详情...'
    });
    wx.request({
      url: `${app.globalData.baseUrl}/product/${id}`,
      success: (res) => {
        wx.hideLoading();
        // 兼容 R 对象
        let product = null;
        if (res.data && res.data.code === 1) {
          product = res.data.data;
        } else if (res.statusCode === 200) {
          product = res.data;
        }

        if (product) {
          // 找到当前分类的下标，为了让 picker 显示正确
          const index = this.data.categories.findIndex(c => String(c.id) === String(product.categoryId || product.category_id));

          this.setData({
            formData: {
              id: product.id,
              name: product.name,
              categoryId: product.categoryId || product.category_id,
              price: product.price,
              image: product.image,
              description: product.description,
              status: product.status
            },
            categoryIndex: index
          });
        }
      }
    });
  },

  // 输入框通用处理
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 分类选择处理
  onCategoryChange(e) {
    const index = e.detail.value;
    const selectedCat = this.data.categories[index];
    this.setData({
      categoryIndex: index,
      'formData.categoryId': selectedCat.id
    });
  },

  // ✨✨✨ 提交表单 (防呆版：无Token自动跳转) ✨✨✨
  submitForm() {
    const data = this.data.formData;
    
    // 1. ✨ 核心检查：有没有 Token？
    const token = wx.getStorageSync('token');
    
    if (!token) {
        console.warn('【提交失败】缓存中没有Token');
        wx.showModal({
            title: '未登录',
            content: '登录状态失效，请重新加载小程序以获取权限。',
            showCancel: false,
            confirmText: '去重新加载',
            success: (res) => {
                if(res.confirm) {
                    // 强制重启小程序，触发 app.js 的自动登录逻辑
                    wx.reLaunch({ url: '/pages/index/index' });
                }
            }
        });
        return;
    }

    // 2. 表单校验
    if (!data.name) return wx.showToast({
      title: '请填写菜名',
      icon: 'none'
    });
    if (!data.categoryId) return wx.showToast({
      title: '请选择分类',
      icon: 'none'
    });
    if (!data.price) return wx.showToast({
      title: '请填写价格',
      icon: 'none'
    });

    wx.showLoading({
      title: '提交中...'
    });

    const method = this.data.isEdit ? 'PUT' : 'POST';
    const url = `${app.globalData.baseUrl}/product`;

    // 3. 发送请求 (带上 Token)
    wx.request({
      url: url,
      method: method,
      data: data,
      header: {
        'token': token
      },
      success: (res) => {
        wx.hideLoading();
        console.log('【提交结果】', res);

        // 4. 成功判断 (兼容 R 对象)
        const isSuccess = res.statusCode === 200 && (res.data.code === 1 || res.data === '操作成功' || res.data === true);

        if (isSuccess) {
          wx.showToast({
            title: '保存成功'
          });
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          // 失败详情
          let errorMsg = '操作失败';
          if(res.statusCode === 401) errorMsg = '权限不足 (401)';
          else if(res.data && res.data.msg) errorMsg = res.data.msg;
          else if(typeof res.data === 'string') errorMsg = res.data;

          wx.showModal({
            title: '保存失败',
            content: errorMsg,
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({
          title: '网络连不上',
          content: JSON.stringify(err),
          showCancel: false
        });
      }
    });
  }
})