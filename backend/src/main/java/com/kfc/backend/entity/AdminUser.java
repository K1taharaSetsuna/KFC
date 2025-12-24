package com.kfc.backend.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;

@TableName("admin_user") // 确认一下你的数据库表名是不是叫 admin_user 或者 employee
public class AdminUser implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String username;
    private String password;
    private String name;     // 管理员姓名
    
    // 数据库不存在这个字段，仅用于返回 Token
    @com.baomidou.mybatisplus.annotation.TableField(exist = false)
    private String token;

    // === 手动 Getter / Setter ===

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}