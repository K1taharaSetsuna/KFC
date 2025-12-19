const app = getApp();

Page({
  data: {
    activeTab: 2, // 默认显示待接单
    orders: [],
    stats: {
      pending: 0,
      processing: 0,
      completed: 0
    },
    isRefreshing: false
  },

  onLoad() {
    this.refreshAll();
  },

  onShow() {
    // 每次显示页面时也刷新一下，保持数据最新
    this.refreshAll();
  },

  onRefresh() {
    this.setData({ isRefreshing: true });
    this.refreshAll().then(() => {
      this.setData({ isRefreshing: false });
    });
  },

  refreshAll() {
    return Promise.all([
      this.fetchStats(),
      this.fetchOrders(this.data.activeTab)
    ]);
  },

  switchTab(e) {
    const status = parseInt(e.currentTarget.dataset.status);
    this.setData({ activeTab: status });
    this.fetchOrders(status);
  },

  fetchStats() {
    // 这里为了演示，我们分别请求三个状态的数量
    // 实际项目中后端最好提供一个聚合接口
    const p1 = this.requestList(2);
    const p2 = this.requestList(3);
    const p3 = this.requestList(4);

    return Promise.all([p1, p2, p3]).then(results => {
      this.setData({
        stats: {
          pending: results[0].length,
          processing: results[1].length,
          completed: results[2].length
        }
      });
    });
  },

  requestList(status) {
    return new Promise((resolve) => {
      const token = wx.getStorageSync('token') || '';
      wx.request({
        url: `http://localhost:8080/order/admin/list?status=${status}`,
        header: {
          'token': token
        },
        dataType: 'text', //以此获取原始字符串，防止超长数字精度丢失
        success: (res) => {
          // 如果 token 失效
          if (res.statusCode === 401 || (typeof res.data === 'string' && res.data.includes('No Permission'))) {
             wx.showToast({ title: '登录已过期', icon: 'none' });
             setTimeout(() => {
               wx.reLaunch({ url: '/pages/login/login' });
             }, 1500);
             resolve([]);
             return;
          }

          try {
            // 手动处理超长数字：将 "id":12345... 替换为 "id":"12345..."
            // 匹配 "id": 后面跟着的 16位以上数字
            let rawData = res.data;
            // 简单处理：给所有id加引号（假设后端返回的标准JSON格式）
            // 注意：这里只针对 id 字段进行替换，防止误伤
            rawData = rawData.replace(/"id":(\d{16,})/g, '"id":"$1"');
            
            const list = JSON.parse(rawData);
            resolve(list || []);
          } catch(e) {
            console.error('解析订单数据失败', e);
            resolve([]);
          }
        },
        fail: () => resolve([])
      });
    });
  },

  fetchOrders(status) {
    wx.showLoading({ title: '加载中...' });
    return this.requestList(status).then(list => {
      wx.hideLoading();
      // 格式化时间
      list.forEach(item => {
        if(item.orderTime) {
          item.orderTimeFormatted = item.orderTime.replace('T', ' ').substring(5, 16); // MM-dd HH:mm
        }
      });
      this.setData({ orders: list });
    });
  },

  updateStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const that = this;
    
    let content = status === 3 ? '确认接单吗？' : '确认通知取餐吗？';
    
    wx.showModal({
      title: '提示',
      content: content,
      success(res) {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          const token = wx.getStorageSync('token') || '';
          wx.request({
            url: `http://localhost:8080/order/admin/status?orderId=${id}&status=${status}`,
            method: 'PUT',
            header: {
              'token': token
            },
            success(res) {
              wx.hideLoading();
              console.log('updateStatus response:', res);
              
              if (res.statusCode === 401 || (typeof res.data === 'string' && res.data.includes('No Permission'))) {
                wx.showToast({ title: '登录已过期', icon: 'none' });
                setTimeout(() => {
                  wx.reLaunch({ url: '/pages/login/login' });
                }, 1500);
                return;
              }

              if (res.data === '操作成功') {
                wx.showToast({ title: '操作成功', icon: 'success' });
                that.refreshAll();
              } else {
                // 显示具体的错误信息，方便调试
                const msg = (typeof res.data === 'string') ? res.data : '操作失败';
                wx.showToast({ title: msg, icon: 'none' });
              }
            },
            fail() {
              wx.hideLoading();
              wx.showToast({ title: '网络错误', icon: 'none' });
            }
          });
        }
      }
    });
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '详情功能开发中',
      content: `订单ID: ${id}\n后续可在此展示具体菜品明细`,
      showCancel: false
    });
    // 后续可以跳转到详情页: /pages/manager-order-detail/index?id=xxx
  }
})
