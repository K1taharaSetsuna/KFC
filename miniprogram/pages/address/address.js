const app = getApp()

Page({
  data: {
    addressList: [],
    showForm: false,
    form: {
      consignee: '',
      phone: '',
      detail: '',
      label: '家'
    }
  },

  onShow() {
    this.loadAddressList()
  },

  loadAddressList() {
    const user = app.globalData.user
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const that = this
    wx.request({
      url: `http://localhost:8080/addressBook/list?userId=${user.id}`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ addressList: res.data })
        }
      }
    })
  },

  openForm() {
    this.setData({
      showForm: true,
      form: {
        consignee: '',
        phone: '',
        detail: '',
        label: '家'
      }
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const form = this.data.form
    form[field] = value
    this.setData({ form })
  },

  saveAddress() {
    const user = app.globalData.user
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const form = this.data.form
    if (!form.consignee || !form.phone || !form.detail) {
      wx.showToast({ title: '请完整填写信息', icon: 'none' })
      return
    }
    const that = this
    wx.request({
      url: 'http://localhost:8080/addressBook/add',
      method: 'POST',
      data: {
        userId: user.id,
        consignee: form.consignee,
        phone: form.phone,
        detail: form.detail,
        label: form.label,
        isDefault: 0
      },
      success(res) {
        if (res.statusCode === 200) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          that.setData({ showForm: false })
          that.loadAddressList()
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      },
      fail() {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onSetDefault(e) {
    const user = app.globalData.user
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const item = e.currentTarget.dataset.item
    const payload = Object.assign({}, item, { userId: user.id, isDefault: 1 })
    const that = this
    wx.request({
      url: 'http://localhost:8080/addressBook/default',
      method: 'PUT',
      data: payload,
      success(res) {
        if (res.statusCode === 200) {
          wx.showToast({ title: '设置成功', icon: 'success' })
          that.loadAddressList()
        } else {
          wx.showToast({ title: '设置失败', icon: 'none' })
        }
      },
      fail() {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})

