const app = getApp()

Page({
  data: {
    // ✨✨✨ 1. 合并点：补回店铺信息字段 (用于WXML头部显示) ✨✨✨
    shop: {
      name: 'KFC 肯德基 (默认店)',
      address: '请在首页开启定位获取门店',
      distance: '未知'
    },

    // --- 下面是你原来的业务数据 ---
    categories: [],
    products: [], 
    menuData: [], 
    allProducts: [],
    activeCategory: null,
    toView: '', 
    currentCategoryName: '',
    
    // 购物车
    cartList: [],
    cartCount: 0,
    totalPrice: 0,
    showCartDetail: false,

    // 规格弹窗
    showSpecModal: false,
    currentProduct: null
  },

  onLoad() {
    this.initData();
    // 每次进入页面加载购物车
    this.fetchCartList();
  },

  // ✨✨✨ 2. 合并点：onShow 中既要同步店铺，又要刷新购物车 ✨✨✨
  onShow() {
    // A. 同步店铺信息 (从首页定位过来的数据)
    if (app.globalData.shop) {
      console.log('【点餐页】同步店铺信息:', app.globalData.shop);
      this.setData({
        shop: app.globalData.shop
      });
    }

    // B. 刷新购物车 (你的后端逻辑)
    this.fetchCartList();
  },

  // 获取购物车列表
  fetchCartList() {
    const user = app.globalData.user;
    if (!user) return; 

    const that = this;
    wx.request({
      url: `http://localhost:8080/shoppingCart/list?userId=${user.id}`,
      success(res) {
        if (res.statusCode === 200 && res.data) {
          const list = res.data.map(item => ({
            cartId: item.id,
            id: item.productId,
            name: item.name,
            price: item.amount, 
            image: item.image,
            quantity: item.number,
            specString: item.dishFlavor || '',
            selectedFlavors: [] 
          }));
          
          that.setData({ cartList: list });
          that.calculateTotal();
        }
      }
    });
  },

  initData() {
    const that = this;
    wx.showLoading({ title: '加载菜单中...' });

    // 并行请求分类和所有商品
    const p1 = new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:8080/category/list',
        method: 'GET',
        success: (res) => resolve(res.data || []),
        fail: reject
      });
    });

    const p2 = new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:8080/product/list',
        method: 'GET',
        success: (res) => resolve(res.data || []),
        fail: reject
      });
    });

    Promise.all([p1, p2]).then(([categories, products]) => {
      wx.hideLoading();
      
      // 1. 处理商品数据
      const user = app.globalData.user;
      const isVip = user && user.isVip === 1;

      const allProducts = products.map(item => ({
        ...item,
        isVipUser: isVip,
        vipPrice: (item.price * 0.6).toFixed(1)
      }));
      
      // 2. 组装 menuData (分类 -> 商品列表)
      const menuData = categories.map(cat => {
        return {
          ...cat,
          products: allProducts.filter(p => p.categoryId === cat.id)
        };
      });

      // 2.1 检查是否有"未分类"商品
      const categoryIds = categories.map(c => c.id);
      const uncategorizedProducts = allProducts.filter(p => !categoryIds.includes(p.categoryId));
      
      if (uncategorizedProducts.length > 0) {
        const otherCategory = {
          id: 999999, 
          name: '其他美味',
          products: uncategorizedProducts
        };
        menuData.push(otherCategory);
        categories.push(otherCategory);
      }

      // 3. 设置数据
      that.setData({
        categories,
        allProducts,
        menuData,
        activeCategory: categories.length > 0 ? categories[0].id : null,
        currentCategoryName: categories.length > 0 ? categories[0].name : ''
      });

    }).catch(err => {
      wx.hideLoading();
      console.error('初始化数据失败', err);
      // 如果本地没有后端环境，这里的报错是正常的，建议实训展示时保证后端启动
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  // 切换分类 (点击左侧)
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeCategory) return;
    
    this.setData({ 
      activeCategory: id,
      toView: `cat-${id}` 
    });
  },

  goBack() {
    wx.navigateBack();
  },

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value;
    
    if (this.searchTimer) clearTimeout(this.searchTimer);

    if (!keyword) {
      this.setData({
        products: [],
        currentCategoryName: this.data.categories.length > 0 ? this.data.categories[0].name : ''
      });
      return;
    }

    const that = this;
    this.searchTimer = setTimeout(() => {
      wx.request({
        url: `http://localhost:8080/product/list?name=${keyword}`,
        success(res) {
          if (res.statusCode === 200) {
            that.setData({
              products: res.data,
              currentCategoryName: `搜索结果 ("${keyword}")`,
              activeCategory: null
            });
          }
        }
      });
    }, 500);
  },

  // --- 规格弹窗逻辑 ---

  showSpec(e) {
    const item = e.currentTarget.dataset.item;
    
    let parsedFlavors = [];
    if (item.flavors && item.flavors.length > 0) {
      parsedFlavors = item.flavors.map(f => {
        let options = [];
        try {
          options = JSON.parse(f.value); 
        } catch (e) {
          options = [];
        }
        return {
          name: f.name,
          options: options,
          selected: options.length > 0 ? options[0] : '' 
        };
      });
    }

    if (parsedFlavors.length === 0) {
      this.addToCart({
        ...item,
        price: item.isVipUser ? item.vipPrice : item.price,
        specString: '',
        selectedFlavors: {}
      });
      wx.showToast({ title: '已加入购物车', icon: 'none' });
      return;
    }

    this.setData({
      currentProduct: {
        ...item,
        price: item.isVipUser ? item.vipPrice : item.price,
        parsedFlavors
      },
      showSpecModal: true
    });
  },

  closeSpec() {
    this.setData({ showSpecModal: false });
  },

  selectFlavor(e) {
    const { findex, opt } = e.currentTarget.dataset;
    const key = `currentProduct.parsedFlavors[${findex}].selected`;
    this.setData({
      [key]: opt
    });
  },

  confirmSpec() {
    const product = this.data.currentProduct;
    const specList = product.parsedFlavors.map(f => f.selected);
    const specString = specList.join(', ');

    this.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      specString: specString,
      selectedFlavors: product.parsedFlavors
    });

    this.setData({ showSpecModal: false });
    wx.showToast({ title: '已加入购物车', icon: 'none' });
  },

  // --- 购物车逻辑 (后端同步) ---

  addToCart(product) {
    const user = app.globalData.user;
    if (!user) {
       wx.showToast({ title: '请先登录', icon: 'none' });
       return;
    }

    const that = this;
    const cartItem = {
      userId: user.id,
      productId: product.id,
      name: product.name,
      image: product.image,
      amount: product.price, 
      dishFlavor: product.specString || ''
    };

    wx.request({
      url: 'http://localhost:8080/shoppingCart/add',
      method: 'POST',
      data: cartItem,
      success(res) {
        if (res.statusCode === 200) {
          that.fetchCartList();
        } else {
          wx.showToast({ title: '加购失败', icon: 'none' });
        }
      },
      fail() {
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  calculateTotal() {
    const cart = this.data.cartList;
    let total = 0, count = 0;
    cart.forEach(item => { 
      total += item.price * item.quantity; 
      count += item.quantity; 
    });
    this.setData({ 
      totalPrice: total.toFixed(2), 
      cartCount: count 
    });
  },

  toggleCart() {
    if (this.data.cartCount > 0) {
      this.setData({ showCartDetail: !this.data.showCartDetail });
    }
  },

  hideCart() {
    this.setData({ showCartDetail: false });
  },

  clearCart() {
    const user = app.globalData.user;
    const that = this;
    
    wx.request({
      url: `http://localhost:8080/shoppingCart/clean?userId=${user.id}`,
      method: 'DELETE',
      success() {
        that.fetchCartList(); 
        that.setData({ showCartDetail: false });
      }
    });
  },

  // 购物车增减逻辑
  increaseCartByIndex(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.cartList[index];
    if (!item) return;

    this.addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        specString: item.specString
    });
  },

  decreaseCartByIndex(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.cartList[index];
    if (!item) return;

    const user = app.globalData.user;
    const that = this;

    wx.request({
      url: 'http://localhost:8080/shoppingCart/sub',
      method: 'POST',
      data: {
        userId: user.id,
        productId: item.id
      },
      success() {
        that.fetchCartList();
      }
    });
  },
  
  // 兼容逻辑
  increaseCart(e) {
    if (e.currentTarget.dataset.index !== undefined) {
      this.increaseCartByIndex(e);
      return;
    }
    // Fallback logic
    const id = e.currentTarget.dataset.id;
    const cart = this.data.cartList;
    const item = cart.find(c => c.id === id);
    if (item) {
        // 这里只是为了界面不报错，实际上应该走 index 逻辑
        console.warn('建议修改 WXML 使用 data-index');
    }
  },

  decreaseCart(e) {
    if (e.currentTarget.dataset.index !== undefined) {
      this.decreaseCartByIndex(e);
      return;
    }
  },

  // 去结算
  goToPay() {
    const that = this;
    const user = app.globalData.user;
    // ✨✨✨ 3. 这里使用 app.globalData.shop，确保下单门店正确 ✨✨✨
    const shop = app.globalData.shop;

    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (this.data.cartList.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在提交订单...' });

    // 构造订单数据
    const orderData = {
      userId: user.id,
      amount: parseFloat(this.data.totalPrice),
      shopId: shop ? shop.id : 1 // 如果没有定位，默认店ID为1
    };

    wx.request({
      url: 'http://localhost:8080/order/create',
      method: 'POST',
      data: orderData,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          const responseMsg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const match = responseMsg.match(/(\d+)/);
          
          if (match) {
            const orderId = match[0];
            that.payOrder(orderId);
          } else {
            wx.showModal({
              title: '下单成功',
              content: responseMsg,
              showCancel: false,
              success() { that.clearCart(); }
            });
          }
        } else {
          wx.showToast({ title: '下单失败', icon: 'none' });
        }
      },
      fail(err) {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 自动支付
  payOrder(orderId) {
    const that = this;
    wx.showLoading({ title: '正在支付...' });
    
    wx.request({
      url: `http://localhost:8080/order/pay?orderId=${orderId}`,
      method: 'POST',
      success(res) {
        wx.hideLoading();
        wx.showModal({
          title: '支付成功',
          content: '您的餐点正在制作中，请耐心等待！',
          showCancel: false,
          success() {
            that.clearCart();
          }
        });
      },
      fail(err) {
        wx.hideLoading();
        wx.showToast({ title: '支付请求失败', icon: 'none' });
      }
    });
  }
})