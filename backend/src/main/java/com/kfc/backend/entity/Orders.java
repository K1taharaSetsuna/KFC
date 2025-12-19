package com.kfc.backend.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("orders")
public class Orders {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String number;    // 订单号
    private Integer status;   // 1:待付款 2:待接单 3:已配送 4:已完成 5:已取消
    private Long userId;      // 下单用户ID
    private Long addressBookId;
    private LocalDateTime orderTime; // 下单时间
    private LocalDateTime checkoutTime;
    private BigDecimal amount;       // 实收金额
    private String remark;
    private String phone;
    private String address;
    private String consignee;

    // ... 原有字段 ...
    private Long shopId; // 👈 新增：所属店铺ID

    // ... 原有 Get/Set ...

    // 👇 新增的 Get/Set
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    // --- 手动 Getter/Setter (防报错) ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getAddressBookId() { return addressBookId; }
    public void setAddressBookId(Long addressBookId) { this.addressBookId = addressBookId; }
    public LocalDateTime getOrderTime() { return orderTime; }
    public void setOrderTime(LocalDateTime orderTime) { this.orderTime = orderTime; }
    public LocalDateTime getCheckoutTime() { return checkoutTime; }
    public void setCheckoutTime(LocalDateTime checkoutTime) { this.checkoutTime = checkoutTime; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getConsignee() { return consignee; }
    public void setConsignee(String consignee) { this.consignee = consignee; }
}