package com.kfc.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.kfc.backend.entity.User;
import com.kfc.backend.entity.Voucher;
import com.kfc.backend.mapper.UserMapper;
import com.kfc.backend.mapper.VoucherMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "C端顾客接口", description = "处理顾客登录、查身份、查卡包、开通会员")
@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private VoucherMapper voucherMapper;

    @Operation(summary = "模拟微信登录")
    @GetMapping("/login")
    public User login(@RequestParam Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        // 登录时检查：如果会员过期了，自动变回普通用户
        if (user.getIsVip() == 1 && user.getVipExpireTime() != null) {
            if (LocalDateTime.now().isAfter(user.getVipExpireTime())) {
                user.setIsVip(0);
                userMapper.updateById(user);
            }
        }

        return user;
    }

    @Operation(summary = "查询我的卡包/优惠券")
    @GetMapping("/voucher/list")
    public List<Voucher> myVouchers(@RequestParam Long userId) {
        QueryWrapper<Voucher> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.eq("status", 0); // 只查"未使用"的
        return voucherMapper.selectList(wrapper);
    }

    /**
     * 新增功能：开通/续费 大神卡
     * @param userId 用户ID
     * @param type 1:月卡(19元), 2:季卡(38元)
     */
    @Operation(summary = "开通/续费大神卡")
    @PostMapping("/buyVip")
    public User buyVip(@RequestParam Long userId, @RequestParam Integer type) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new RuntimeException("用户不存在");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime newExpireTime;

        // 逻辑：如果已经是VIP且没过期，就在原过期时间上顺延；否则从现在开始算
        if (user.getIsVip() != null && user.getIsVip() == 1 && user.getVipExpireTime() != null && user.getVipExpireTime().isAfter(now)) {
            newExpireTime = user.getVipExpireTime();
        } else {
            newExpireTime = now;
        }

        // 根据类型加时间
        if (type == 1) {
            // 月卡 +30天
            newExpireTime = newExpireTime.plusDays(30);
        } else if (type == 2) {
            // 季卡 +90天
            newExpireTime = newExpireTime.plusDays(90);
        } else {
            throw new RuntimeException("未知的会员卡类型");
        }

        // 更新数据库
        user.setIsVip(1); // 确保状态是VIP
        user.setVipExpireTime(newExpireTime);
        userMapper.updateById(user);

        return user; // 返回最新信息
    }
}