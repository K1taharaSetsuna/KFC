package com.kfc.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.kfc.backend.entity.ShoppingCart;
import com.kfc.backend.mapper.ShoppingCartMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "购物车管理", description = "添加、查询、清空购物车")
@RestController
@RequestMapping("/shoppingCart")
public class ShoppingCartController {

    @Autowired
    private ShoppingCartMapper shoppingCartMapper;

    @Operation(summary = "添加购物车")
    @PostMapping("/add")
    public ShoppingCart add(@RequestBody ShoppingCart shoppingCart) {
        // 设置创建时间
        shoppingCart.setCreateTime(LocalDateTime.now());

        // 查询当前用户购物车里，是否已经有这个商品（且口味一致）
        QueryWrapper<ShoppingCart> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", shoppingCart.getUserId());
        queryWrapper.eq("product_id", shoppingCart.getProductId());

        // 处理口味逻辑 (null 和 "" 视为相同)
        String flavor = shoppingCart.getDishFlavor();
        if (flavor == null || flavor.trim().isEmpty()) {
            // 匹配数据库中 dish_flavor 为 NULL 或 "" 的记录
            queryWrapper.and(w -> w.isNull("dish_flavor").or().eq("dish_flavor", ""));
        } else {
            // 精确匹配口味
            queryWrapper.eq("dish_flavor", flavor);
        }

        // 使用 selectList 以防万一有多条重复数据
        List<ShoppingCart> cartItems = shoppingCartMapper.selectList(queryWrapper);

        if (cartItems != null && !cartItems.isEmpty()) {
            // 如果已经存在，就在第一条基础上 +1
            ShoppingCart cartItem = cartItems.get(0);
            cartItem.setNumber(cartItem.getNumber() + 1);
            shoppingCartMapper.updateById(cartItem);

            // 如果有多余的重复数据，删除它们 (清理脏数据)
            if (cartItems.size() > 1) {
                for (int i = 1; i < cartItems.size(); i++) {
                    shoppingCartMapper.deleteById(cartItems.get(i).getId());
                }
            }
            return cartItem;
        } else {
            // 如果不存在，就是新加的，数量设为 1
            shoppingCart.setNumber(1);
            // 规范化口味字段：如果为空字符串或null，统一存为 "" (或者 null，看数据库默认值，这里保持原样即可)
            if (flavor == null) {
                shoppingCart.setDishFlavor("");
            }
            shoppingCartMapper.insert(shoppingCart);
            return shoppingCart;
        }
    }

    @Operation(summary = "查看购物车列表")
    @GetMapping("/list")
    public List<ShoppingCart> list(@RequestParam Long userId) {
        QueryWrapper<ShoppingCart> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        queryWrapper.orderByDesc("create_time");
        return shoppingCartMapper.selectList(queryWrapper);
    }

    @Operation(summary = "清空购物车")
    @DeleteMapping("/clean")
    public String clean(@RequestParam Long userId) {
        QueryWrapper<ShoppingCart> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        shoppingCartMapper.delete(queryWrapper);
        return "购物车已清空";
    }

    @Operation(summary = "删除/减少一个商品")
    @PostMapping("/sub")
    public String sub(@RequestBody ShoppingCart shoppingCart) {
        ShoppingCart cartItem = null;

        // 1. 优先根据 ID 查找 (最准确)
        if (shoppingCart.getId() != null) {
            cartItem = shoppingCartMapper.selectById(shoppingCart.getId());
        } 
        
        // 2. 如果没有 ID，则根据 userId + productId + flavor 查找
        if (cartItem == null) {
            QueryWrapper<ShoppingCart> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("user_id", shoppingCart.getUserId());
            queryWrapper.eq("product_id", shoppingCart.getProductId());
            if (shoppingCart.getDishFlavor() != null) {
                queryWrapper.eq("dish_flavor", shoppingCart.getDishFlavor());
            }
            // 使用 selectList 取第一个，防止多条数据导致报错
            List<ShoppingCart> list = shoppingCartMapper.selectList(queryWrapper);
            if (list != null && !list.isEmpty()) {
                cartItem = list.get(0);
            }
        }

        if(cartItem != null){
            Integer number = cartItem.getNumber();
            if(number > 1){
                // 如果数量大于1，就减1
                cartItem.setNumber(number - 1);
                shoppingCartMapper.updateById(cartItem);
            }else{
                // 如果只剩1个，直接删除
                shoppingCartMapper.deleteById(cartItem.getId());
            }
        }
        return "操作成功";
    }
}