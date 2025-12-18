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
        // 允许所有跨域请求 (为了开发方便，生产环境请指定具体域名)
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
                        "/product/list",
                        "/category/**",
                        "/banner/**",
                        "/shop/**",  // 放行店铺信息接口
                        // 👇👇👇 新增放行这两行 👇👇👇
                        "/user/**",       // 放行用户登录、查卡包
                        "/order/user/list", // 放行查历史订单
                        "/shoppingCart/**",  // 👈 新增这一行
                        "/addressBook/**",  // 👈 新增这一行

                        "/order/create",  // 如果允许未登录下单也可以放行(看需求)
                        "/order/pay",

                        // Swagger 相关
                        "/doc.html",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/webjars/**"
                );
    }
}