package com.kfc.backend.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import java.math.BigDecimal;
import java.util.List;

/**
 * 修复版：手动加上了 Getter/Setter，防止 Lombok 不生效报错
 */
@TableName("product")
public class Product {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String name;
    private BigDecimal price;
    private String description;

    // --- 新增字段 ---

    // ✨✨✨ 核心修复：添加映射注解 ✨✨✨
    @TableField("category_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long categoryId; // 所属分类

    private String image;    // 图片
    private Integer status;  // 1:起售 0:停售

    // --- 扩展字段 ---
    @TableField(exist = false)
    private List<ProductFlavor> flavors; // 商品的口味列表

    // ==========================================
    // 👇 下面是手写的 Getter 和 Setter 方法 (保持不变)
    // ==========================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }

    public List<ProductFlavor> getFlavors() { return flavors; }
    public void setFlavors(List<ProductFlavor> flavors) { this.flavors = flavors; }
}