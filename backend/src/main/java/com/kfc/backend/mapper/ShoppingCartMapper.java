package com.kfc.backend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.kfc.backend.entity.ShoppingCart;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ShoppingCartMapper extends BaseMapper<ShoppingCart> {}