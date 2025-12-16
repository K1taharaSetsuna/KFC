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
                .addPathPatterns("/**")           // 1. 默认拦截所有路径
                .excludePathPatterns(             // 2. 但是放行以下路径：
                        "/auth/login",            // 登录本身不能拦截
                        "/product/list",          // 顾客看菜单不用登录
                        "/order/**",              // 顾客下单不用登录
                        "/doc.html",              // 接口文档放行
                        "/swagger-ui/**",         // Swagger放行
                        "/v3/api-docs/**"         // Swagger数据放行
                );
    }
}