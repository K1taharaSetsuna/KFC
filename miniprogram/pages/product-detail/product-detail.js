const app = getApp();
Page({
  data: {
    product: null
  },
  onLoad() {
    const product = app.globalData.currentProduct;
    if (product) {
      // 如果有口味但未解析，尝试解析
      if (product.flavors && typeof product.parsedFlavors === 'undefined') {
          product.parsedFlavors = this.parseFlavors(product.flavors);
      }
      this.setData({ product });
    }
  },
  parseFlavors(flavors) {
    if (!flavors || flavors.length === 0) return [];
    return flavors.map(f => {
      let options = [];
      try {
        options = JSON.parse(f.value);
      } catch (e) { options = []; }
      return {
        name: f.name,
        options: options,
        selected: options.length > 0 ? options[0] : ''
      };
    });
  },
  selectFlavor(e) {
    const { findex, opt } = e.currentTarget.dataset;
    this.setData({
      [`product.parsedFlavors[${findex}].selected`]: opt
    });
  },
  addToCart() {
    const product = this.data.product;
    const user = app.globalData.user;
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const specString = product.parsedFlavors ? product.parsedFlavors.map(f => f.selected).join(', ') : '';
    
    wx.request({
      url: `${app.globalData.baseUrl}/shoppingCart/add`,
      method: 'POST',
      data: {
        userId: user.id,
        productId: product.id,
        name: product.name,
        image: product.image,
        amount: product.isVipUser ? product.vipPrice : product.price,
        dishFlavor: specString
      },
      success(res) {
        if (res.statusCode === 200) {
          wx.showToast({ title: '已加入购物车', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 800);
        }
      }
    });
  }
});