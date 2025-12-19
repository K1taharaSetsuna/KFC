const app = getApp()

Page({
  data: {
    categories: [],
    products: [], // 现在的 products 将只用于搜索结果显示
    menuData: [], // 新增：用于存储 {category, products[]} 的结构
    allProducts: [],
    activeCategory: null,
    toView: '', // 用于 scroll-into-view
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

  onShow() {
    this.fetchCartList();
  },

  // 获取购物车列表
  fetchCartList() {
    const user = app.globalData.user;
    if (!user) return; // 未登录暂不处理

    const that = this;
    wx.request({
      url: `http://localhost:8080/shoppingCart/list?userId=${user.id}`,
      success(res) {
        if (res.statusCode === 200 && res.data) {
          // 映射后端数据结构到前端 cartList
          const list = res.data.map(item => ({
            cartId: item.id,
            id: item.productId,
            name: item.name,
            price: item.amount, // 注意：后端存的是单价还是总价？通常是单价，Entity定义为BigDecimal。假设是单价。
            image: item.image,
            quantity: item.number,
            specString: item.dishFlavor || '',
            selectedFlavors: [] // 无法还原，但 specString 够用了
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

      // 2.1 检查是否有"未分类"商品 (categoryId 不在 categories 列表中)
      const categoryIds = categories.map(c => c.id);
      const uncategorizedProducts = allProducts.filter(p => !categoryIds.includes(p.categoryId));
      
      if (uncategorizedProducts.length > 0) {
        // 创建一个虚拟分类 "其他美味"
        const otherCategory = {
          id: 999999, // 虚拟 ID
          name: '其他美味',
          products: uncategorizedProducts
        };
        menuData.push(otherCategory);
        
        // 同时把这个虚拟分类加到左侧导航里
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
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  // 切换分类 (点击左侧)
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeCategory) return;
    
    this.setData({ 
      activeCategory: id,
      toView: `cat-${id}` // 滚动到对应 ID
    });
  },

  goBack() {
    wx.navigateBack();
  },

  // 搜索功能 (后端搜索 + 防抖)
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

  fetchAllProductsAndFilter(keyword) {
     // 已弃用，直接使用 allProducts
  },

  filterProducts(keyword) {
    // 已弃用，逻辑移入 onSearchInput
  },

  // --- 规格弹窗逻辑 ---

  // 打开规格弹窗
  showSpec(e) {
    const item = e.currentTarget.dataset.item;
    
    // 解析 flavors
    let parsedFlavors = [];
    if (item.flavors && item.flavors.length > 0) {
      parsedFlavors = item.flavors.map(f => {
        let options = [];
        try {
          options = JSON.parse(f.value); // 解析 JSON 字符串 ["微辣", "中辣"]
        } catch (e) {
          console.error('解析规格失败', e);
          options = [];
        }
        return {
          name: f.name,
          options: options,
          selected: options.length > 0 ? options[0] : '' // 默认选中第一个
        };
      });
    }

    // 如果没有规格，直接加入购物车
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

  // 关闭规格弹窗
  closeSpec() {
    this.setData({ showSpecModal: false });
  },

  // 选择规格选项
  selectFlavor(e) {
    const { findex, opt } = e.currentTarget.dataset;
    const key = `currentProduct.parsedFlavors[${findex}].selected`;
    this.setData({
      [key]: opt
    });
  },

  // 确认规格并加入购物车
  confirmSpec() {
    const product = this.data.currentProduct;
    
    // 生成规格字符串，例如 "百事可乐, 微辣"
    const specList = product.parsedFlavors.map(f => f.selected);
    const specString = specList.join(', ');

    this.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      specString: specString,
      // 可以在这里保留详细的规格选择信息，以便传给后端
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
       // 也可以在这里触发自动登录
       return;
    }

    const that = this;
    const cartItem = {
      userId: user.id,
      productId: product.id,
      name: product.name,
      image: product.image,
      amount: product.price, // 存入单价
      dishFlavor: product.specString || ''
    };

    wx.request({
      url: 'http://localhost:8080/shoppingCart/add',
      method: 'POST',
      data: cartItem,
      success(res) {
        if (res.statusCode === 200) {
          // 加购成功，刷新列表
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
        that.fetchCartList(); // Should return empty list
        that.setData({ showCartDetail: false });
      }
    });
  },

  increaseCart(e) {
    const index = e.currentTarget.dataset.index; // 使用 index 更方便，因为可能有重复 ID 但不同规格
    const cart = this.data.cartList;
    
    // 注意：这里我们修改 WXML 传 index 会更准确，或者传唯一标识
    // 为了兼容旧代码，这里先假设传的是 index
    // 但 WXML 之前传的是 id。如果传 id，对于多规格商品会有问题（删哪个？）
    // 建议修改 WXML 传 index
    // 暂时用 id 查找，如果有多个相同 id，可能会操作错误。
    // 我们必须修改 WXML 让它传递 index
  },
  
  // 修正后的购物车增减逻辑，使用 index (调用后端)
  increaseCartByIndex(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.cartList[index];
    if (!item) return;

    // 复用 addToCart 逻辑
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
  
  // 保持旧的方法名兼容，但在 WXML 中我们需要改成传递 index
  increaseCart(e) {
    // 检查是否有 index
    if (e.currentTarget.dataset.index !== undefined) {
      this.increaseCartByIndex(e);
      return;
    }
    // Fallback: 如果只有 ID (旧逻辑)，可能会有问题，但先保留
    const id = e.currentTarget.dataset.id;
    const cart = this.data.cartList;
    const item = cart.find(c => c.id === id);
    if (item) {
      item.quantity += 1;
      this.setData({ cartList: cart });
      this.calculateTotal();
    }
  },

  decreaseCart(e) {
    if (e.currentTarget.dataset.index !== undefined) {
      this.decreaseCartByIndex(e);
      return;
    }
    const id = e.currentTarget.dataset.id;
    let cart = this.data.cartList;
    const index = cart.findIndex(c => c.id === id);
    if (index > -1) {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1);
      }
      this.setData({ cartList: cart });
      this.calculateTotal();
      if (cart.length === 0) {
        this.setData({ showCartDetail: false });
      }
    }
  },

  // 去结算
  goToPay() {
    const that = this;
    const user = app.globalData.user;
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

    // 构造订单数据（字段名与后端 Orders 实体一致）
    const orderData = {
      userId: user.id,
      amount: parseFloat(this.data.totalPrice),
      shopId: shop ? shop.id : 1
    };

    wx.request({
      url: 'http://localhost:8080/order/create',
      method: 'POST',
      data: orderData,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          // 下单成功，解析订单ID并支付
          const responseMsg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const match = responseMsg.match(/(\d+)/);
          
          if (match) {
            const orderId = match[0];
            that.payOrder(orderId);
          } else {
            // 如果没解析到ID，就只提示成功
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
        console.error('下单失败', err);
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
