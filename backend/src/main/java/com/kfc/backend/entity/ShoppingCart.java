package com.kfc.backend.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("shopping_cart")
public class ShoppingCart {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String name;
    private String image;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long productId;
    private Integer number;
    private BigDecimal amount;
    private String dishFlavor; // 记录顾客选的规格
    private LocalDateTime createTime;

    // --- 手动 Getter/Setter ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDishFlavor() { return dishFlavor; }
    public void setDishFlavor(String dishFlavor) { this.dishFlavor = dishFlavor; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}