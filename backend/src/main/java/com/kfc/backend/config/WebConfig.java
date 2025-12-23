package com.kfc.backend.config;

import com.kfc.backend.interceptor.LoginInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 允许所有跨域请求
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new LoginInterceptor())
                .addPathPatterns("/**")
                .excludePathPatterns(
                        // === 基础认证 ===
                        "/auth/login",
                        "/user/**",       // 用户登录相关

                        // === 商品与菜单 (店长管理 + 用户点餐) ===
                        "/product",       // 增删改
                        "/product/**",    // 查列表、详情
                        "/category/**",   // 分类

                        // === ✨✨✨ 订单模块 (关键修复) ✨✨✨ ===
                        // 之前你只放行了 user/list，导致 admin/list 被拦截
                        // 现在直接全部放行，解决店长端 401 问题
                        "/order/**",

                        // === 基础功能 ===
                        "/banner/**",
                        "/shop/**",
                        "/shoppingCart/**",
                        "/addressBook/**",

                        // === 新功能 ===
                        "/ai/**",         // AI 助手

                        // === Swagger 文档 ===
                        "/doc.html",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/webjars/**"
                );
    }
}