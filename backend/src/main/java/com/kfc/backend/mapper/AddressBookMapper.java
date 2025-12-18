package com.kfc.backend.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.kfc.backend.entity.AddressBook;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AddressBookMapper extends BaseMapper<AddressBook> {}