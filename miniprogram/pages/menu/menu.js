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
      const allProducts = products.map(item => item);
      
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

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value;
    
    if (!keyword) {
      // 如果清空搜索，显示全部
      this.setData({
        products: [], // 清空搜索结果
        currentCategoryName: this.data.categories.length > 0 ? this.data.categories[0].name : ''
      });
      return;
    }

    // 从 allProducts 中筛选
    const results = this.data.allProducts.filter(p => 
      p.name.includes(keyword) || (p.description && p.description.includes(keyword))
    );
    
    this.setData({
      products: results,
      currentCategoryName: `搜索结果 ("${keyword}")`,
      activeCategory: null // 取消左侧分类选中状态
    });
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
        specString: '',
        selectedFlavors: {}
      });
      wx.showToast({ title: '已加入购物车', icon: 'none' });
      return;
    }

    this.setData({
      currentProduct: {
        ...item,
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

  // --- 购物车逻辑 ---

  addToCart(product) {
    let cart = this.data.cartList;
    
    // 查找是否已存在相同商品且规格相同
    const index = cart.findIndex(c => c.id === product.id && c.specString === product.specString);
    
    if (index > -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        specString: product.specString, // 规格描述
        image: product.image || '',
        selectedFlavors: product.selectedFlavors || [],
        quantity: 1
      });
    }
    
    this.setData({ cartList: cart });
    this.calculateTotal();
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
    this.setData({
      cartList: [],
      cartCount: 0,
      totalPrice: 0,
      showCartDetail: false
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
  
  // 修正后的购物车增减逻辑，使用 index
  increaseCartByIndex(e) {
    const index = e.currentTarget.dataset.index;
    const cart = this.data.cartList;
    if (cart[index]) {
      cart[index].quantity += 1;
      this.setData({ cartList: cart });
      this.calculateTotal();
    }
  },

  decreaseCartByIndex(e) {
    const index = e.currentTarget.dataset.index;
    let cart = this.data.cartList;
    
    if (cart[index]) {
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
    if (this.data.cartList.length === 0) return;

    const that = this;
    wx.showLoading({ title: '正在提交订单...' });

    // 构造订单数据
    // 注意：后端目前只接收 customerName 和 totalPrice，更复杂的如商品明细需要后端升级 Order 实体
    const orderData = {
      customerName: "微信用户", // 暂时写死，以后可以从用户信息取
      totalPrice: parseFloat(this.data.totalPrice)
    };

    wx.request({
      url: 'http://localhost:8080/order/create',
      method: 'POST',
      data: orderData,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          // 下单成功
          wx.showModal({
            title: '下单成功',
            content: res.data || '您的订单已提交，厨房正在制作中！',
            showCancel: false,
            success() {
              // 清空购物车
              that.clearCart();
            }
          });
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
  }
})
