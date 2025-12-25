const app = getApp();

Page({
  data: {
    keyword: '',
    historyList: [],
    resultList: [],
    hasSearched: false
  },

  onLoad() {
    const history = wx.getStorageSync('search_history') || [];
    this.setData({ historyList: history });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
    if (!e.detail.value) {
      this.setData({ hasSearched: false });
    }
  },

  clearKeyword() {
    this.setData({ 
        keyword: '',
        hasSearched: false
    });
  },

  onCancel() {
    wx.navigateBack();
  },

  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;

    this.saveHistory(keyword);
    this.doSearchRequest(keyword);
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.saveHistory(keyword); // 更新历史顺序
    this.doSearchRequest(keyword);
  },

  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    // 传递给详情页
    app.globalData.currentProduct = item;
    wx.navigateTo({
      url: '/pages/product-detail/product-detail'
    });
  },

  saveHistory(keyword) {
    let history = this.data.historyList;
    // Remove if exists
    history = history.filter(k => k !== keyword);
    // Add to front
    history.unshift(keyword);
    // Limit to 10
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    this.setData({ historyList: history });
    wx.setStorageSync('search_history', history);
  },

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ historyList: [] });
          wx.removeStorageSync('search_history');
        }
      }
    });
  },

  doSearchRequest(keyword) {
    wx.showLoading({ title: '搜索中...' });
    
    wx.request({
      url: `${app.globalData.baseUrl}/product/list`,
      data: { name: keyword },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 1) {
          // Process images
          const list = (res.data.data || []).map(item => {
             let img = item.image;
             if (img && !img.startsWith('http') && !img.startsWith('cloud://')) {
                 img = `${app.globalData.baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
             }
             return { ...item, image: img };
          });
          
          this.setData({
            resultList: list,
            hasSearched: true
          });
        } else {
             wx.showToast({ title: '没有找到相关菜品', icon: 'none' });
             this.setData({
                resultList: [],
                hasSearched: true
             });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '搜索失败', icon: 'none' });
      }
    });
  }
});