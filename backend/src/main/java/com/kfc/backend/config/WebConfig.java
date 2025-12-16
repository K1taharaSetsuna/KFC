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
                .addPathPatterns("/**")  // 1. 默认拦截所有路径
                .excludePathPatterns(    // 2. 放行以下白名单：
                        "/auth/login",
                        "/product/list",
                        "/category/**",
                        "/banner/**",       // 👈 【新增】必须加这一行，允许游客看轮播图
                        "/order/**",

                        // --- Swagger 文档相关 (漏了哪个都打不开) ---
                        "/doc.html",
                        "/swagger-ui.html",     // 👈 【重点修复】Swagger 首页
                        "/swagger-ui/**",       // Swagger 静态资源
                        "/v3/api-docs/**",      // 接口数据源
                        "/webjars/**"           // 某些版本的 Swagger 依赖这个
                );
    }
}