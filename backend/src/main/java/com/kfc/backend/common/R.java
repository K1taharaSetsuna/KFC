package com.kfc.backend.common;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * 通用返回结果类
 * 服务端响应的数据最终都会封装成此对象
 */
public class R<T> implements Serializable {
    private Integer code; // 编码：1成功，0和其它数字为失败
    private String msg;   // 错误信息
    private T data;       // 数据
    private Map map = new HashMap(); // 动态数据

    // 成功静态方法
    public static <T> R<T> success(T object) {
        R<T> r = new R<T>();
        r.data = object;
        r.code = 1; // 前端只认这个 1
        return r;
    }

    // 失败静态方法
    public static <T> R<T> error(String msg) {
        R r = new R();
        r.msg = msg;
        r.code = 0;
        return r;
    }

    public R<T> add(String key, Object value) {
        this.map.put(key, value);
        return this;
    }

    // ================= 手写 Getter 和 Setter =================
    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public Map getMap() {
        return map;
    }

    public void setMap(Map map) {
        this.map = map;
    }
}