package com.kfc.backend.controller;

import com.kfc.backend.common.R;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/ai")
public class AIController {

    // 本地 GeminiCLI to API 服务配置
    // 默认密码为 pwd，如果你的本地服务修改了密码，请在这里同步修改
    private static final String API_PASSWORD = "pwd";
    // 使用 Gemini 流式端点，连接本地 7861 端口
    private static final String LOCAL_API_URL = "http://127.0.0.1:7861/v1/models/gemini-2.5-pro:streamGenerateContent";
    // 日志文件路径
    private static final String LOG_FILE_PATH = "d:\\实训\\ai_response.log";

    @PostMapping("/recommend")
    public R<String> recommend(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.trim().isEmpty()) {
            return R.error("请输入你想吃什么");
        }

        try {
            // 直接连接本地服务，不再需要复杂的代理切换逻辑
            String result = callLocalGemini(query);
            return R.success(result);

        } catch (Exception e) {
            e.printStackTrace();
            return R.error(e.getMessage());
        }
    }

    private String callLocalGemini(String query) {
        try {
            // 连接本地服务通常不需要代理，或者显式指定不使用代理
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(20000); // 增加连接超时到 20 秒
            factory.setReadTimeout(120000);   // 增加读取超时到 120 秒 (大模型生成较慢)
            RestTemplate restTemplate = new RestTemplate(factory);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            // 使用 Bearer Token 认证
            headers.set("Authorization", "Bearer " + API_PASSWORD);
            // 或者使用 x-goog-api-key 头部 (根据 README 两者皆可，Bearer 更通用)
            // headers.set("x-goog-api-key", API_PASSWORD);

            Map<String, Object> part = new HashMap<>();
            // 修改 Prompt：极简模式，强制 JSON
            part.put("text", "用户想吃：" + query + "。\n" +
                    "任务：从KFC菜单推荐1-2个组合。\n" +
                    "格式：必须是合法的 JSON。\n" +
                    "内容：包含 reasoning (思考过程) 和 answer (最终中文推荐)。\n" +
                    "JSON示例：\n" +
                    "{\"reasoning\": \"...\", \"answer\": \"...\"}");

            Map<String, Object> content = new HashMap<>();
            content.put("role", "user"); // 👈 必须指定角色，否则报错 400
            content.put("parts", new ArrayList<>(List.of(part)));

            Map<String, Object> body = new HashMap<>();
            body.put("contents", new ArrayList<>(List.of(content)));

            // 添加 generationConfig 强制返回 JSON
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("maxOutputTokens", 8192); // 增加 Token 限制，防止回答被截断
            body.put("generationConfig", generationConfig);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            // 发送请求到本地 API (使用 execute 处理流式响应)
            String fullResponse = restTemplate.execute(
                LOCAL_API_URL,
                HttpMethod.POST,
                requestCallback -> {
                    requestCallback.getHeaders().addAll(headers);
                    new com.fasterxml.jackson.databind.ObjectMapper().writeValue(requestCallback.getBody(), body);
                },
                clientHttpResponse -> {
                    StringBuilder sb = new StringBuilder();
                    // 记录原始响应用于调试 (会很长)
                    StringBuilder rawLog = new StringBuilder();
                    
                    try (java.io.BufferedReader reader = new java.io.BufferedReader(
                            new java.io.InputStreamReader(clientHttpResponse.getBody(), java.nio.charset.StandardCharsets.UTF_8))) {
                        String line;
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        
                        while ((line = reader.readLine()) != null) {
                            rawLog.append(line).append("\n");
                            
                            // 处理 SSE 格式: data: {...}
                            if (line.startsWith("data: ")) {
                                String jsonStr = line.substring(6).trim();
                                // 忽略 [DONE] 或非 JSON 数据
                                if (jsonStr.equals("[DONE]") || jsonStr.isEmpty()) continue;
                                
                                try {
                                    com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(jsonStr);
                                    if (rootNode.has("candidates") && rootNode.get("candidates").isArray()) {
                                        com.fasterxml.jackson.databind.JsonNode candidate = rootNode.get("candidates").get(0);
                                        if (candidate.has("content") && candidate.get("content").has("parts")) {
                                            com.fasterxml.jackson.databind.JsonNode partsNode = candidate.get("content").get("parts");
                                            if (partsNode.isArray()) {
                                                for (com.fasterxml.jackson.databind.JsonNode partItem : partsNode) {
                                                    // 忽略 thought: true 的部分 (如果需要显示思考过程，可以在这里提取)
                                                    if (partItem.has("thought") && partItem.get("thought").asBoolean()) {
                                                        continue; 
                                                    }
                                                    if (partItem.has("text")) {
                                                        sb.append(partItem.get("text").asText());
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } catch (Exception e) {
                                    System.err.println("解析 SSE 行失败: " + e.getMessage() + " | Line: " + line);
                                }
                            }
                        }
                    }
                    // 记录原始日志
                    logRawResponse(rawLog.toString());
                    return sb.toString();
                }
            );

            if (fullResponse != null && !fullResponse.isEmpty()) {
                 return fullResponse;
            }

            return "AI 思考中...";
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new RuntimeException("本地服务认证失败，请检查 API_PASSWORD");
            }
            throw new RuntimeException("API 请求失败: " + e.getStatusCode());
        } catch (Exception e) {
            throw new RuntimeException("连接本地 AI 服务失败: " + e.getMessage());
        }
    }

    private void logRawResponse(String content) {
        try (FileWriter writer = new FileWriter(LOG_FILE_PATH, true)) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            writer.write("\n[" + timestamp + "] RAW RESPONSE START:\n");
            writer.write(content);
            writer.write("\n[" + timestamp + "] RAW RESPONSE END\n--------------------------------------------------\n");
        } catch (IOException e) {
            System.err.println("无法写入 AI 日志文件: " + e.getMessage());
        }
    }
}
