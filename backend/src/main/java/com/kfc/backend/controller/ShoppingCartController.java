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

        // 如果有口味，口味也必须一致才算同一个商品
        if(shoppingCart.getDishFlavor() != null){
            queryWrapper.eq("dish_flavor", shoppingCart.getDishFlavor());
        }

        ShoppingCart cartItem = shoppingCartMapper.selectOne(queryWrapper);

        if (cartItem != null) {
            // 如果已经存在，就在原来基础上 +1
            cartItem.setNumber(cartItem.getNumber() + 1);
            shoppingCartMapper.updateById(cartItem);
            return cartItem;
        } else {
            // 如果不存在，就是新加的，数量设为 1
            shoppingCart.setNumber(1);
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
        // 查找该商品
        QueryWrapper<ShoppingCart> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", shoppingCart.getUserId());
        queryWrapper.eq("product_id", shoppingCart.getProductId());
        ShoppingCart cartItem = shoppingCartMapper.selectOne(queryWrapper);

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