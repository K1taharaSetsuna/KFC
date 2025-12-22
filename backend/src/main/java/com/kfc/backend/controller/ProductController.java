package com.kfc.backend.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.kfc.backend.common.R; // 必须导入这个 R 类，确保前端能读到 code=1
import com.kfc.backend.entity.Product;
import com.kfc.backend.entity.ProductFlavor;
import com.kfc.backend.mapper.ProductFlavorMapper;
import com.kfc.backend.mapper.ProductMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "产品管理", description = "包含小程序点餐和后台管理的所有接口")
@RestController
@RequestMapping("/product")
public class ProductController {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ProductFlavorMapper productFlavorMapper;

    // ==========================================
    // 1. 查询列表接口 (GET /product/list)
    // ==========================================
    @Operation(summary = "获取菜单/搜索商品")
    @GetMapping("/list")
    public R<List<Product>> getList(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String name
    ) {
        QueryWrapper<Product> queryWrapper = new QueryWrapper<>();

        if (categoryId != null) {
            queryWrapper.eq("category_id", categoryId);
        }
        if (name != null && !name.isEmpty()) {
            queryWrapper.like("name", name);
        }

        // ⚠️ 注意：为了让管理员能看到“已下架”的商品以便修改，这里暂时注释掉 status=1 的限制
        // 如果只查起售的，管理员一旦下架商品，列表里就看不到了，没法再上架
        // queryWrapper.eq("status", 1);

        queryWrapper.orderByAsc("price");

        List<Product> products = productMapper.selectList(queryWrapper);

        // 填充口味数据
        for (Product product : products) {
            QueryWrapper<ProductFlavor> flavorWrapper = new QueryWrapper<>();
            flavorWrapper.eq("product_id", product.getId());
            List<ProductFlavor> flavors = productFlavorMapper.selectList(flavorWrapper);
            product.setFlavors(flavors);
        }

        return R.success(products);
    }

    // ==========================================
    // 2. 详情接口 (GET /product/{id}) - ✨新增，用于编辑回显
    // ==========================================
    @Operation(summary = "根据ID查询商品")
    @GetMapping("/{id}")
    public R<Product> getById(@PathVariable Long id) {
        Product product = productMapper.selectById(id);
        if (product != null) {
            QueryWrapper<ProductFlavor> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("product_id", id);
            List<ProductFlavor> flavors = productFlavorMapper.selectList(queryWrapper);
            product.setFlavors(flavors);
            return R.success(product);
        }
        return R.error("未找到商品");
    }

    // ==========================================
    // 3. 新增接口 (POST /product) - ✨修改路径，去掉了/add
    // ==========================================
    @Operation(summary = "新增商品")
    @PostMapping
    public R<String> save(@RequestBody Product product) {
        // 默认状态为起售
        if (product.getStatus() == null) {
            product.setStatus(1);
        }

        productMapper.insert(product);

        // 存口味
        Long productId = product.getId();
        List<ProductFlavor> flavors = product.getFlavors();
        if (flavors != null) {
            for (ProductFlavor flavor : flavors) {
                flavor.setProductId(productId);
                productFlavorMapper.insert(flavor);
            }
        }
        return R.success("新增成功");
    }

    // ==========================================
    // 4. 修改接口 (PUT /product) - ✨修改路径，去掉了/update
    // ==========================================
    @Operation(summary = "修改商品")
    @PutMapping
    public R<String> update(@RequestBody Product product) {
        productMapper.updateById(product);
        // 这里简化处理，暂不更新口味，如需更新可先删后加
        return R.success("修改成功");
    }

    // ==========================================
    // 5. 删除接口 (DELETE /product) - ✨修改路径，去掉了/delete，支持批量
    // ==========================================
    @Operation(summary = "删除商品")
    @DeleteMapping
    public R<String> delete(@RequestParam List<Long> ids) {
        productMapper.deleteBatchIds(ids);
        return R.success("删除成功");
    }

    // ==========================================
    // 6. 状态接口 (POST /product/status/{status}) - ✨新增，用于开关
    // ==========================================
    @Operation(summary = "修改售卖状态")
    @PostMapping("/status/{status}")
    public R<String> updateStatus(@PathVariable Integer status, @RequestParam List<Long> ids) {
        for (Long id : ids) {
            Product p = new Product();
            p.setId(id);
            p.setStatus(status);
            productMapper.updateById(p);
        }
        return R.success("状态已更新");
    }
}