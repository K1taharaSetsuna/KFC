const app = getApp()

Page({
  data: {
    shop: {
      name: 'KFC 肯德基 (默认店)',
      address: '请在首页开启定位获取门店',
      distance: '未知'
    },
    statusBarHeight: 20,

    // 数据源
    categories: [],
    products: [],
    menuData: [],
    allProducts: [],

    // 左右联动控制
    activeCategory: null,
    toView: '',
    currentCategoryName: '',
    categoryHeights: [],
    isClicking: false,

    // 购物车
    cartList: [],
    cartCount: 0,
    totalPrice: 0,
    showCartDetail: false,

    // 规格弹窗
    showSpecModal: false,
    currentProduct: null,

    // AI 助手
    showAI: false,
    aiQuery: '',
    chatHistory: [],
    aiLoading: false,
    toViewMsg: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    this.initData();
    this.fetchCartList();
  },

  onShow() {
    if (app.globalData.shop) {
      this.setData({
        shop: app.globalData.shop
      });
    }
    // 每次显示页面刷新购物车，防止在其他页面加购后不同步
    this.fetchCartList();
  },

  // ✨✨✨ 1. 核心：计算右侧每个分类的高度 ✨✨✨
  calculateCategoryHeights() {
    const that = this;
    const query = wx.createSelectorQuery();
    query.selectAll('.cat-header').boundingClientRect();
    query.select('.content').scrollOffset();

    query.exec(function (res) {
      const headers = res[0];
      const scrollView = res[1];

      if (!headers || headers.length === 0) return;

      let heights = [];
      headers.forEach(header => {
        heights.push({
          id: parseInt(header.id.split('-')[1]),
          top: header.top + scrollView.scrollTop - that.data.statusBarHeight - 150
        });
      });

      that.setData({
        categoryHeights: heights
      });
    });
  },

  // ✨✨✨ 2. 核心：监听右侧滚动，反向高亮左侧 ✨✨✨
  onRightScroll(e) {
    if (this.data.isClicking) return;

    const scrollTop = e.detail.scrollTop;
    const heights = this.data.categoryHeights;

    if (heights.length === 0) return;

    let activeId = heights[0].id;

    for (let i = heights.length - 1; i >= 0; i--) {
      if (scrollTop + 50 >= heights[i].top) {
        activeId = heights[i].id;
        break;
      }
    }

    if (activeId !== this.data.activeCategory) {
      this.setData({
        activeCategory: activeId
      });
    }
  },

  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeCategory) return;

    this.setData({
      activeCategory: id,
      toView: `cat-${id}`,
      isClicking: true
    });

    setTimeout(() => {
      this.setData({
        isClicking: false
      });
    }, 500);
  },

  // --- 数据初始化 (修复版：自动拆解 R 对象) ---
  initData() {
    const that = this;
    wx.showLoading({
      title: '更新菜单...'
    });

    // 1. 获取分类
    const p1 = new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/category/list`,
        success: (res) => {
          // ✨ 拆包逻辑：如果是 R 对象，取 data.data
          if (res.data && res.data.code === 1) {
            resolve(res.data.data || []);
          } else {
            resolve(res.data || []);
          }
        },
        fail: reject
      });
    });

    // 2. 获取商品
    const p2 = new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/product/list`,
        success: (res) => {
          // ✨ 拆包逻辑
          if (res.data && res.data.code === 1) {
            resolve(res.data.data || []);
          } else {
            resolve(res.data || []);
          }
        },
        fail: reject
      });
    });

    Promise.all([p1, p2]).then(([categories, products]) => {
      wx.hideLoading();

      const user = app.globalData.user;
      const isVip = user && user.isVip === 1;

      // 3. 处理商品数据
      const allProducts = products.map(item => {
        return {
          ...item,
          categoryId: String(item.categoryId || item.category_id), // 兼容字段名
          isVipUser: isVip,
          vipPrice: (item.price * 0.6).toFixed(1)
        };
      });

      // 4. 按分类归纳
      const menuData = categories.map(cat => ({
        ...cat,
        id: String(cat.id),
        products: allProducts.filter(p => p.categoryId === String(cat.id))
      }));

      // 5. 渲染
      that.setData({
        categories,
        allProducts,
        menuData,
        activeCategory: categories.length > 0 ? categories[0].id : null,
        currentCategoryName: categories.length > 0 ? categories[0].name : ''
      }, () => {
        setTimeout(() => {
          that.calculateCategoryHeights();
        }, 500);
      });

    }).catch(err => {
      wx.hideLoading();
      console.error('加载失败', err);
      // wx.showToast({ title: '连接服务器失败', icon: 'none' });
    });
  },

  // --- 购物车与搜索 (修复版) ---
  fetchCartList() {
    const user = app.globalData.user;
    if (!user) return;
    const that = this;
    wx.request({
      url: `${app.globalData.baseUrl}/shoppingCart/list?userId=${user.id}`,
      success(res) {
        // ✨ 拆包逻辑：兼容 R 对象
        let cartData = [];
        if (res.data && res.data.code === 1) {
          cartData = res.data.data || [];
        } else if (Array.isArray(res.data)) {
          cartData = res.data;
        }

        const list = cartData.map(item => ({
          cartId: item.id,
          id: item.productId,
          name: item.name,
          price: item.amount,
          image: item.image,
          quantity: item.number,
          specString: item.dishFlavor || '',
          selectedFlavors: []
        }));
        that.setData({
          cartList: list
        });
        that.calculateTotal();
      }
    });
  },

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
        url: `${app.globalData.baseUrl}/product/list?name=${keyword}`,
        success(res) {
          // ✨ 拆包逻辑
          let searchResults = [];
          if (res.data && res.data.code === 1) {
            searchResults = res.data.data || [];
          } else {
            searchResults = res.data || [];
          }

          that.setData({
            products: searchResults,
            currentCategoryName: `搜索结果 ("${keyword}")`,
            activeCategory: null
          });
        }
      });
    }, 500);
  },

  toggleThinking(e) {
    const index = e.currentTarget.dataset.index;
    const history = this.data.chatHistory;
    if (history[index]) {
      history[index].showThinking = !history[index].showThinking;
      this.setData({ chatHistory: history });
    }
  },

  showTempToast() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    });
  },

  // --- AI 助手 ---
  showAIModal() {
    this.setData({ showAI: true });
  },
  closeAI() {
    this.setData({ showAI: false });
  },
  onAIInput(e) {
    this.setData({ aiQuery: e.detail.value });
  },
  toggleThinking(e) {
    const index = e.currentTarget.dataset.index;
    const history = this.data.chatHistory;
    if (history[index]) {
      history[index].showThinking = !history[index].showThinking;
      this.setData({ chatHistory: history });
    }
  },

  sendAIRequest() {
    const query = this.data.aiQuery;
    if (!query || !query.trim()) return;

    // 1. 记录用户提问
    const history = this.data.chatHistory;
    history.push({ role: 'user', content: query });
    
    this.setData({
      chatHistory: history,
      aiQuery: '', // 清空输入框
      aiLoading: true,
      toViewMsg: 'ai-bottom-anchor' // 滚动到底部锚点
    });

    const that = this;
    // 2. 调用后端 AI 接口
    wx.request({
      url: `${app.globalData.baseUrl}/ai/recommend`,
      method: 'POST',
      data: { query: query },
      success(res) {
        if (res.statusCode !== 200) {
           history.push({ role: 'assistant', content: `请求失败 (Status: ${res.statusCode})。请确保后端已重启。` });
           that.setData({
             chatHistory: history,
             aiLoading: false,
             toViewMsg: 'ai-bottom-anchor'
           });
           return;
        }

        let reply = 'AI 似乎开小差了...';
        let reasoning = '';

        if (res.data && res.data.code === 1) {
          const rawText = res.data.data;
          try {
            // 尝试提取 JSON 部分：寻找第一个 { 和最后一个 }
            const firstOpen = rawText.indexOf('{');
            const lastClose = rawText.lastIndexOf('}');
            
            if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                let jsonStr = rawText.substring(firstOpen, lastClose + 1);
                const aiObj = JSON.parse(jsonStr);
                
                if (aiObj.answer) {
                    reply = aiObj.answer;
                    reasoning = aiObj.reasoning || '';
                } else {
                    // 如果 JSON 结构不对，当做普通文本
                    reply = rawText;
                }
            } else {
                // 没找到 JSON 结构
                reply = rawText;
            }
          } catch (e) {
            console.error("解析 AI JSON 失败", e);
            reply = rawText;
          }
        } else if (res.data && res.data.msg) {
          reply = `错误: ${res.data.msg}`;
        } else {
           // 兜底显示完整响应，方便调试
           reply = `未知错误: ${JSON.stringify(res.data)}`;
        }

        history.push({ 
            role: 'assistant', 
            content: reply, 
            reasoning: reasoning, 
            showThinking: false 
        });
        
        that.setData({
          chatHistory: history,
          aiLoading: false,
          toViewMsg: 'ai-bottom-anchor'
        });
      },
      fail(err) {
        history.push({ role: 'assistant', content: `网络连接失败: ${err.errMsg}。请检查后端是否启动。` });
        that.setData({
                chatHistory: history,
                aiLoading: false,
                toViewMsg: 'ai-bottom-anchor'
              });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  // --- 规格与加购 ---
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
      wx.showToast({
        title: '已加入购物车',
        icon: 'none'
      });
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
    this.setData({
      showSpecModal: false
    });
  },
  selectFlavor(e) {
    const {
      findex,
      opt
    } = e.currentTarget.dataset;
    this.setData({
      [`currentProduct.parsedFlavors[${findex}].selected`]: opt
    });
  },
  confirmSpec() {
    const product = this.data.currentProduct;
    const specString = product.parsedFlavors.map(f => f.selected).join(', ');
    this.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      specString,
      selectedFlavors: product.parsedFlavors
    });
    this.setData({
      showSpecModal: false
    });
    wx.showToast({
      title: '已加入购物车',
      icon: 'none'
    });
  },

  addToCart(product) {
    const user = app.globalData.user;
    if (!user) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
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
      url: `${app.globalData.baseUrl}/shoppingCart/add`,
      method: 'POST',
      data: cartItem,
      success(res) {
        // 兼容 R 对象的 code=1
        if (res.statusCode === 200) {
          that.fetchCartList();
        }
      }
    });
  },

  calculateTotal() {
    const cart = this.data.cartList;
    let total = 0,
      count = 0;
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
    if (this.data.cartCount > 0) this.setData({
      showCartDetail: !this.data.showCartDetail
    });
  },
  hideCart() {
    this.setData({
      showCartDetail: false
    });
  },
  clearCart() {
    const user = app.globalData.user;
    const that = this;
    wx.request({
      url: `${app.globalData.baseUrl}/shoppingCart/clean?userId=${user.id}`,
      method: 'DELETE',
      success() {
        that.fetchCartList();
        that.setData({
          showCartDetail: false
        });
      }
    });
  },
  increaseCart(e) {
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
  decreaseCart(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.cartList[index];
    if (!item) return;
    const user = app.globalData.user;
    const that = this;
    wx.request({
      url: `${app.globalData.baseUrl}/shoppingCart/sub`,
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

  goToPay() {
    const that = this;
    const user = app.globalData.user;
    const shop = app.globalData.shop;
    if (!user) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    if (this.data.cartList.length === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({
      title: '正在提交订单...'
    });
    const orderData = {
      userId: user.id,
      amount: parseFloat(this.data.totalPrice),
      shopId: shop ? shop.id : 1
    };
    wx.request({
      url: `${app.globalData.baseUrl}/order/create`,
      method: 'POST',
      data: orderData,
      success(res) {
        wx.hideLoading();
        // ✨ 兼容 R 对象判断
        if (res.statusCode === 200) {
          let responseData = res.data;
          // 如果返回的是 R 对象
          if (responseData && responseData.code === 1) {
            responseData = responseData.data;
          }

          const responseMsg = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
          // 提取订单ID (假设返回字符串包含数字ID)
          const match = responseMsg.match(/(\d+)/);
          if (match) {
            that.payOrder(match[0]);
          } else {
            wx.showModal({
              title: '下单成功',
              content: responseMsg,
              showCancel: false,
              success() {
                that.clearCart();
              }
            });
          }
        } else {
          wx.showToast({
            title: '下单失败',
            icon: 'none'
          });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
  payOrder(orderId) {
    const that = this;
    wx.showLoading({
      title: '正在支付...'
    });
    wx.request({
      url: `${app.globalData.baseUrl}/order/pay?orderId=${orderId}`,
      method: 'POST',
      success() {
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
      fail() {
        wx.hideLoading();
        wx.showToast({
          title: '支付请求失败',
          icon: 'none'
        });
      }
    });
  }
})