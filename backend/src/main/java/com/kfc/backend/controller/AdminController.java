package com.kfc.backend.controller;

import com.kfc.backend.common.R;
import com.kfc.backend.dto.AdminLoginDTO;
import com.kfc.backend.entity.AdminUser;
import com.kfc.backend.service.AdminUserService;
import lombok.extern.slf4j.Slf4j; // 如果你有Lombok插件可以用，没有就删掉这行和下面的@Slf4j
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID; // 导入UUID

/**
 * 管理端控制器
 */
@RestController
@RequestMapping("/admin/employee") // 很多教程习惯用这个路径，你也可以用 /admin
// @Slf4j 
public class AdminController {

    @Autowired
    private AdminUserService adminUserService;

    /**
     * 管理员登录
     */
    @PostMapping("/login")
    public R<AdminUser> login(HttpServletRequest request, @RequestBody AdminLoginDTO adminLoginDTO) {
        // 1. 调用Service登录
        AdminUser adminUser = adminUserService.login(adminLoginDTO);

        // 2. 登录成功，生成 Token 并存入 SessionMap (为了通过 LoginInterceptor 拦截器)
        String token = UUID.randomUUID().toString();
        LoginController.sessionMap.put(token, adminUser.getId()); // 存入管理员ID

        // 3. 将 Token 返回给前端 (前端需要存入 Storage)
        adminUser.setToken(token);

        // 4. 同时存入 HttpSession (兼容旧逻辑)
        request.getSession().setAttribute("employee", adminUser.getId());

        return R.success(adminUser);
    }

    /**
     * 管理员退出
     */
    @PostMapping("/logout")
    public R<String> logout(HttpServletRequest request) {
        // 清理 Session
        request.getSession().removeAttribute("employee");
        return R.success("退出成功");
    }
}