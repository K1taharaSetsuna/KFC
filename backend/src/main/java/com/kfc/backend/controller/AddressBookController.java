package com.kfc.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.kfc.backend.entity.AddressBook;
import com.kfc.backend.mapper.AddressBookMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "地址簿管理", description = "地址增删改查、设为默认")
@RestController
@RequestMapping("/addressBook")
public class AddressBookController {

    @Autowired
    private AddressBookMapper addressBookMapper;

    @Operation(summary = "新增地址")
    @PostMapping("/add")
    public AddressBook save(@RequestBody AddressBook addressBook) {
        addressBook.setCreateTime(LocalDateTime.now());
        addressBook.setUpdateTime(LocalDateTime.now());
        addressBookMapper.insert(addressBook);
        return addressBook;
    }

    @Operation(summary = "设置默认地址")
    @PutMapping("/default")
    public String setDefault(@RequestBody AddressBook addressBook) {
        // 1. 先把该用户下所有地址的 is_default 改为 0
        LambdaUpdateWrapper<AddressBook> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AddressBook::getUserId, addressBook.getUserId());
        wrapper.set(AddressBook::getIsDefault, 0);
        addressBookMapper.update(null, wrapper);

        // 2. 再把当前这条改为 1
        addressBook.setIsDefault(1);
        addressBook.setUpdateTime(LocalDateTime.now());
        addressBookMapper.updateById(addressBook);
        return "设置成功";
    }

    @Operation(summary = "查询指定用户的全部地址")
    @GetMapping("/list")
    public List<AddressBook> list(@RequestParam Long userId) {
        LambdaQueryWrapper<AddressBook> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(AddressBook::getUserId, userId);
        queryWrapper.orderByDesc(AddressBook::getUpdateTime);
        return addressBookMapper.selectList(queryWrapper);
    }

    @Operation(summary = "查询默认地址(下单时自动填充)")
    @GetMapping("/default")
    public AddressBook getDefault(@RequestParam Long userId) {
        LambdaQueryWrapper<AddressBook> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(AddressBook::getUserId, userId);
        queryWrapper.eq(AddressBook::getIsDefault, 1);
        return addressBookMapper.selectOne(queryWrapper);
    }
}