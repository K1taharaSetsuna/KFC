package com.kfc.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.kfc.backend.entity.OrderDetail;
import com.kfc.backend.entity.Orders;
import com.kfc.backend.entity.ShoppingCart;
import com.kfc.backend.entity.User;
import com.kfc.backend.mapper.OrderDetailMapper;
import com.kfc.backend.mapper.OrdersMapper;
import com.kfc.backend.mapper.ShoppingCartMapper;
import com.kfc.backend.mapper.UserMapper; // 导入 UserMapper
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal; // 导入BigDecimal用于计算金额
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Tag(name = "订单管理", description = "下单、支付、历史订单、商家接单")
@RestController
@RequestMapping("/order")
public class OrderController {

    @Autowired
    private OrdersMapper ordersMapper;

    @Autowired
    private OrderDetailMapper orderDetailMapper;

    // ✨✨✨ 1. 新增注入 UserMapper，用来查用户是不是 VIP ✨✨✨
    @Autowired
    private UserMapper userMapper;

    @Autowired
    private ShoppingCartMapper shoppingCartMapper;

    // =========== 🧑 C端 顾客接口 ===========

    @Operation(summary = "创建订单")
    @PostMapping("/create")
    public String create(@RequestBody Orders orders) {
        // 0. 检查购物车是否为空
        QueryWrapper<ShoppingCart> cartWrapper = new QueryWrapper<>();
        cartWrapper.eq("user_id", orders.getUserId());
        List<ShoppingCart> cartItems = shoppingCartMapper.selectList(cartWrapper);

        if (cartItems == null || cartItems.isEmpty()) {
            throw new RuntimeException("购物车为空，不能下单");
        }

        // 1. 设置基础信息
        orders.setOrderTime(LocalDateTime.now());
        orders.setStatus(1); // 1:待付款

        // 生成订单号: KFC + 年月日时分秒 + 4位随机数
        String timeStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String randomStr = String.format("%04d", new Random().nextInt(10000));
        orders.setNumber("KFC" + timeStr + randomStr);

        // =======================================================
        // ✨✨✨ 2. 核心修改：VIP打折逻辑 ✨✨✨
        // =======================================================

        // A. 获取前端传来的总金额（此时是原价）
        BigDecimal originalPrice = orders.getAmount();
        BigDecimal finalPrice = originalPrice;

        // B. 先把原价存入 originalAmount 字段 (用于前端显示划线价格)
        orders.setOriginalAmount(originalPrice);

        // C. 查询当前下单用户
        if (orders.getUserId() != null) {
            User user = userMapper.selectById(orders.getUserId());

            // D. 如果用户存在 且 是VIP (isVip == 1)
            if (user != null && user.getIsVip() != null && user.getIsVip() == 1) {
                // E. 打8折 (乘以 0.8)
                BigDecimal discount = new BigDecimal("0.8");
                finalPrice = originalPrice.multiply(discount);

                // F. 保留2位小数 (四舍五入)
                finalPrice = finalPrice.setScale(2, BigDecimal.ROUND_HALF_UP);
            }
        }

        // G. 将最终计算好的价格（VIP价或原价）设回 amount
        orders.setAmount(finalPrice);
        // =======================================================

        // 3. 保存订单到数据库
        ordersMapper.insert(orders);

        // 4. 将购物车数据复制到订单明细表中
        for (ShoppingCart cart : cartItems) {
            OrderDetail orderDetail = new OrderDetail();
            orderDetail.setOrderId(orders.getId());
            orderDetail.setNumber(cart.getNumber());
            orderDetail.setDishFlavor(cart.getDishFlavor());
            orderDetail.setProductId(cart.getProductId());
            orderDetail.setName(cart.getName());
            orderDetail.setImage(cart.getImage());
            orderDetail.setAmount(cart.getAmount());
            orderDetailMapper.insert(orderDetail);
        }

        // 5. 清空购物车
        shoppingCartMapper.delete(cartWrapper);

        return "下单成功，订单号：" + orders.getId();
    }

    @Operation(summary = "模拟支付")
    @PostMapping("/pay")
    public String pay(@RequestParam Long orderId) {
        Orders orders = ordersMapper.selectById(orderId);
        if (orders != null) {
            orders.setStatus(2); // 改为待接单(已支付)
            orders.setCheckoutTime(LocalDateTime.now());
            ordersMapper.updateById(orders);
            return "支付成功";
        }
        return "订单不存在";
    }

    @Operation(summary = "查询用户历史订单列表")
    @GetMapping("/user/list")
    public List<Orders> userOrders(@RequestParam Long userId) {
        QueryWrapper<Orders> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.orderByDesc("order_time"); // 按时间倒序，最新的在上面
        return ordersMapper.selectList(wrapper);
    }

    // 顾客查看订单详情
    @Operation(summary = "顾客端-查询订单详情")
    @GetMapping("/user/detail")
    public List<OrderDetail> userDetail(@RequestParam Long orderId) {
        QueryWrapper<OrderDetail> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", orderId);
        return orderDetailMapper.selectList(wrapper);
    }

    // =========== 👨‍🍳 移动端 店长/管理员接口 ===========

    @Operation(summary = "店长手机端-查订单列表")
    @GetMapping("/admin/list")
    public List<Orders> adminList(@RequestParam(required = false) Integer status) {
        QueryWrapper<Orders> wrapper = new QueryWrapper<>();
        // 如果传了状态就按状态查，不传就查所有
        if (status != null) {
            wrapper.eq("status", status);
        }
        wrapper.orderByAsc("order_time"); // 先下的单在上面
        return ordersMapper.selectList(wrapper);
    }

    @Operation(summary = "店长手机端-看订单详情")
    @GetMapping("/admin/detail")
    public List<OrderDetail> adminDetail(@RequestParam Long orderId) {
        QueryWrapper<OrderDetail> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", orderId);
        return orderDetailMapper.selectList(wrapper);
    }

    @Operation(summary = "店长手机端-接单/出餐")
    @PutMapping("/admin/status")
    public String adminUpdateStatus(@RequestParam Long orderId, @RequestParam Integer status) {
        Orders orders = ordersMapper.selectById(orderId);
        if (orders != null) {
            orders.setStatus(status);
            ordersMapper.updateById(orders);
            return "操作成功";
        }
        return "订单不存在";
    }
}