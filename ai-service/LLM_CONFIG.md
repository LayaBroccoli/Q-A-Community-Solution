# LLM API 配置指南

AI 服务支持任何兼容 OpenAI API 的 LLM 提供商。

## 支持的 LLM

### 1. 智谱 AI (GLM-4) - 推荐
```bash
OPENAI_API_KEY=your-zhipu-api-key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
```

获取 API Key: https://open.bigmodel.cn/

### 2. OpenAI GPT-4
```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

获取 API Key: https://platform.openai.com/api-keys

### 3. DeepSeek
```bash
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

获取 API Key: https://platform.deepseek.com/

### 4. 阿里通义千问
```bash
OPENAI_API_KEY=your-qwen-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-plus
```

获取 API Key: https://dashscope.aliyuncs.com/

### 5. 本地 Ollama
```bash
OPENAI_API_KEY=not-needed
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama2
```

## 快速配置

### 步骤 1: 编辑 .env 文件
```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
nano .env
```

### 步骤 2: 填入你的 API 配置
```bash
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4
```

### 步骤 3: 重启服务
```bash
pkill -f "node server.js"
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
node server.js > /tmp/ai-service.log 2>&1 &
```

### 步骤 4: 测试连接
```bash
node test-llm-connection.js
```

## 成本估算

| 模型 | 输入价格 | 输出价格 | 质量 |
|------|---------|---------|------|
| GLM-4 | ¥0.12/1k tokens | ¥0.12/1k tokens | ⭐⭐⭐⭐⭐ |
| GPT-4 | $0.03/1k tokens | $0.06/1k tokens | ⭐⭐⭐⭐⭐ |
| DeepSeek | ¥0.001/1k tokens | ¥0.002/1k tokens | ⭐⭐⭐⭐ |
| Qwen-Plus | ¥0.004/1k tokens | ¥0.006/1k tokens | ⭐⭐⭐⭐ |

**预计每条回答成本**: ¥0.01 - ¥0.05

## 推荐

- **国内用户**: 智谱 AI GLM-4（速度快，质量好，价格合理）
- **高质量需求**: OpenAI GPT-4
- **成本敏感**: DeepSeek 或 Qwen-Plus
- **离线测试**: Ollama 本地部署

---

更新时间: 2026-02-24
