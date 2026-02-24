# AI 回复系统使用指南

## 功能特性

✅ **自动回复** - 新问题自动生成 AI 回答  
✅ **智能分类** - 识别问题类型和难度  
✅ **代码示例** - 自动生成完整的代码示例  
✅ **Markdown 格式** - 结构化的回答格式  
✅ **备用方案** - API 失败时使用友好提示  

## 工作流程

```
1. 用户在论坛发帖
   ↓
2. Flarum 触发 Webhook
   ↓
3. AI 服务接收 Webhook
   ↓
4. 获取讨论内容
   ↓
5. 调用 LLM 生成回答
   ↓
6. 发布回复到论坛
```

## 测试 AI 回复

### 方法 1: 使用测试脚本
```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
node test-ai-answer.js
```

### 方法 2: 手动触发 Webhook
```bash
curl -X POST http://localhost:3000/webhook/discussion \
  -H "Content-Type: application/json" \
  -d '{
    "event": "discussion.created",
    "data": {
      "discussion_id": 1
    }
  }'
```

### 方法 3: 在论坛发帖
1. 访问 http://43.128.56.125
2. 登录并发表新帖
3. 等待几秒，查看 AI 回复

## 配置 LLM API

参考 [LLM_CONFIG.md](./LLM_CONFIG.md)

### 快速配置（智谱 AI）
```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
nano .env
```

填入：
```bash
OPENAI_API_KEY=your-zhipu-api-key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
```

重启服务：
```bash
pkill -f "node server.js"
node server.js > /tmp/ai-service.log 2>&1 &
```

测试连接：
```bash
node test-llm-connection.js
```

## 日志查看

### AI 服务日志
```bash
tail -f /tmp/ai-service.log
```

### 查看 AI 回复过程
```bash
grep "🤖\|✅\|❌" /tmp/ai-service.log
```

### 查看错误
```bash
grep "❌\|Error\|Failed" /tmp/ai-service.log
```

## 当前状态

- ✅ AI 服务运行中（端口 3000）
- ✅ Webhook 端点正常
- ⏳ LLM API 需要配置

### 测试数据
- 测试讨论 ID: 5
- 标题: "LayaAir Hello World"
- AI 回复已发布（备用答案）

## 下一步

1. **配置 LLM API** - 获取 API Key 并配置
2. **测试真实回答** - 使用真实的 LLM 生成回答
3. **实现分类引擎** - 智能分类问题
4. **集成 MCP** - 查询 LayaAir 官方文档

---

更新时间: 2026-02-24
