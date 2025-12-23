package com.kfc.backend.interceptor;

import com.kfc.backend.controller.LoginController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        
        String requestURI = request.getRequestURI();
        // 打印日志方便调试
        System.out.println("DEBUG: Interceptor processing " + request.getMethod() + " " + requestURI);

        // 1. 放行所有 OPTIONS 预检请求
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        
        // 2. 强制放行 AI 接口
        if (requestURI.contains("/ai/")) {
            return true;
        }

        // 3. 从请求头里拿 Token
        String token = request.getHeader("token");


        // 2. 检查：Token 是空的吗？或者小本本里没这个号？
        if (token == null || !LoginController.sessionMap.containsKey(token)) {
            // 🚫 拦截！设置状态码 401 (未授权)
            response.setStatus(401);
            response.getWriter().write("No Permission! Please Login.");
            return false; // 不放行
        }

        // ✅ 放行
        return true;
    }
}