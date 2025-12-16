const app = getApp()

Page({
  data: {
    // 模拟数据
    categories: [
      { id: 0, name: '人气热卖', icon: '🔥' },
      { id: 1, name: '帕尼尼' },
      { id: 2, name: '现熬好粥' },
      { id: 3, name: '大饼' },
      { id: 4, name: '吐司' },
      { id: 5, name: '发面小笼' },
      { id: 6, name: '多人餐' },
      { id: 7, name: '金奖豆' }
    ],
    menuData: [
      {
        id: 0,
        category: '人气热卖',
        items: [
          { id: 101, name: 'K记发面小笼包', sub: '豆浆二件套', price: 14.0, originalPrice: 20.0, image: '', tag: '大神卡¥8.4起' },
          { id: 102, name: '大饼卷黑椒牛肉蛋', sub: '豆浆二件套', price: 19.0, originalPrice: 25.0, image: '', tag: '大神卡¥11.4起' },
          { id: 103, name: '6元随心配', sub: '6元随心配', price: 6.0, originalPrice: 13.0, image: '', tag: '' }
        ]
      },
      {
        id: 1,
        category: '帕尼尼',
        items: [
          { id: 201, name: '芝士猪柳帕尼尼', sub: '两件套', price: 9.6, originalPrice: 26.0, image: '', tag: '' }
        ]
      }
      // 更多数据...
    ],
    activeCategory: 0,
    toView: 'category-0',
    cartCount: 0,
    totalPrice: 0,
    cartList: [],
    showCartDetail: false
  },

  onLoad() {
  },

  fetchProducts() {
    console.log('开始请求后端接口: http://localhost:8080/product/list'); 
    const that = this;
    wx.request({
      url: 'http://localhost:8080/product/list',
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          const products = res.data;
          
          // 初始化分类数据结构 (保持和 data.categories 一致的顺序)
          // 0: 人气热卖, 1: 帕尼尼(主食), 2: 现熬好粥(饮料/粥), 3: 大饼...
          let categorizedMenu = that.data.categories.map(cat => ({
            id: cat.id,
            category: cat.name,
            items: []
          }));

          // 简单的关键词分类逻辑
          products.forEach(item => {
            const product = {
              id: item.id,
              name: item.name,
              sub: '', 
              price: item.price,
              originalPrice: item.price, 
              image: item.image || '', 
              tag: ''
            };

            // 规则匹配
            if (item.name.includes('堡') || item.name.includes('帕尼尼') || item.name.includes('卷')) {
              categorizedMenu[1].items.push(product); // 放入 "帕尼尼" (当作主食类)
            } else if (item.name.includes('乐') || item.name.includes('拿铁') || item.name.includes('浆') || item.name.includes('粥')) {
              categorizedMenu[2].items.push(product); // 放入 "现熬好粥" (当作饮料类)
            } else {
              categorizedMenu[0].items.push(product); // 其他放入 "人气热卖"
            }
          });

          // 如果某个分类没有商品，前端是否隐藏？目前先保留空分类
          that.setData({
            menuData: categorizedMenu
          });
          
          console.log('分类处理完成:', categorizedMenu);
        }
      },
      fail(err) {
        console.error('请求彻底失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  onShow() {
    // 每次显示页面时都拉取最新数据
    this.fetchProducts();

    // 隐藏系统导航栏，因为 Image 2 显示了自定义头部（搜索框等）
    // 实际开发通常使用 navigationStyle: custom
  },

  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      activeCategory: index,
      toView: `category-${index}`
    });
  },

  goBack() {
    wx.navigateBack();
  },

  // 选规格（目前模拟为直接加入购物车）
  showSpec(e) {
    const item = e.currentTarget.dataset.item;
    this.addToCart(item);
    
    wx.showToast({
      title: `已加入: ${item.name}`,
      icon: 'none',
      duration: 500
    });
  },

  // 切换购物车详情显示
  toggleCart() {
    if (this.data.cartCount > 0) {
      this.setData({
        showCartDetail: !this.data.showCartDetail
      });
    }
  },

  // 隐藏购物车详情
  hideCart() {
    this.setData({
      showCartDetail: false
    });
  },

  // 清空购物车
  clearCart() {
    this.setData({
      cartList: [],
      cartCount: 0,
      totalPrice: 0,
      showCartDetail: false
    });
  },

  // 增加商品数量（在购物车详情中）
  increaseCart(e) {
    const id = e.currentTarget.dataset.id;
    const cart = this.data.cartList;
    const item = cart.find(c => c.id === id);
    if (item) {
      item.quantity += 1;
      this.setData({ cartList: cart });
      this.calculateTotal();
    }
  },

  // 减少商品数量（在购物车详情中）
  decreaseCart(e) {
    const id = e.currentTarget.dataset.id;
    let cart = this.data.cartList;
    const index = cart.findIndex(c => c.id === id);
    
    if (index > -1) {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1); // 移除商品
      }
      
      this.setData({ cartList: cart });
      this.calculateTotal();
      
      // 如果购物车空了，关闭详情
      if (cart.length === 0) {
        this.setData({ showCartDetail: false });
      }
    }
  },

  // 加入购物车逻辑
  addToCart(product) {
    let cart = this.data.cartList;
    const index = cart.findIndex(c => c.id === product.id);

    if (index > -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }

    this.setData({
      cartList: cart
    });

    this.calculateTotal();
  },

  // 计算总价和总数量
  calculateTotal() {
    const cart = this.data.cartList;
    let total = 0;
    let count = 0;

    cart.forEach(item => {
      total += item.price * item.quantity;
      count += item.quantity;
    });

    this.setData({
      totalPrice: total.toFixed(2), // 保留两位小数
      cartCount: count
    });
  },

  // 去结算
  goToPay() {
    if (this.data.cartCount === 0) return;
    
    wx.showToast({
      title: '跳转结算页...',
      icon: 'loading'
    });
    // 实际场景：wx.navigateTo({ url: '/pages/order/confirm' });
  }
});