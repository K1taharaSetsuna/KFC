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
                        "/auth/login",
                        "/user/**",       // 放行用户登录

                        // ✨✨✨ 关键修改：彻底放行产品接口 ✨✨✨
                        "/product",       // 👈 放行 POST/PUT/DELETE (增删改)
                        "/product/**",    // 👈 放行 /product/list, /product/{id} (查)

                        "/category/**",
                        "/banner/**",
                        "/shop/**",
                        "/order/user/list",
                        "/shoppingCart/**",
                        "/addressBook/**",

                        "/order/create",
                        "/order/pay",

                        // AI 助手
                        "/ai/**",

                        // Swagger 相关
                        "/doc.html",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/webjars/**"
                );
    }
}