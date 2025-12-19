const app = getApp()

Page({
  data: {
    userInfo: null,
    vipExpireText: ''
  },

  onShow() {
    const user = app.globalData.user
    if (user) {
      const text = user.vipExpireTime ? user.vipExpireTime.split('T')[0] : ''
      this.setData({
        userInfo: user,
        vipExpireText: text
      })
    } else {
      this.setData({
        userInfo: null,
        vipExpireText: ''
      })
    }
  },

  onBuy(e) {
    const type = parseInt(e.currentTarget.dataset.type, 10)
    const user = app.globalData.user
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const that = this
    wx.showLoading({ title: '请求中...' })
    wx.request({
      url: `http://localhost:8080/user/buyVip?userId=${user.id}&type=${type}`,
      method: 'POST',
      success(res) {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data) {
          app.globalData.user = res.data
          const updated = res.data
          const text = updated.vipExpireTime ? updated.vipExpireTime.split('T')[0] : ''
          that.setData({
            userInfo: updated,
            vipExpireText: text
          })
          wx.showToast({ title: '开通成功', icon: 'success' })
        } else {
          wx.showToast({ title: '开通失败', icon: 'none' })
        }
      },
      fail() {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})

