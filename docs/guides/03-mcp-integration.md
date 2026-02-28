# MCP知识库集成方案

## MCP简介

MCP (Model Context Protocol) 是一个开放协议，让AI应用能够连接到外部数据源。本项目将利用现有的LayaAir MCP服务器获取技术文档、源码、示例等知识。

---

## MCP服务器资源

根据项目信息，MCP服务器包含以下内容：

### 📚 文档资源
- ✅ LayaAir API 参考文档
- ✅ 使用教程和指南
- ✅ 常见问题FAQ
- ✅ 版本更新说明

### 💻 代码资源
- ✅ LayaAir 源码
- ✅ 示例代码
- ✅ 测试用例

---

## MCP客户端集成

### 1. 安装MCP SDK

```bash
npm install @modelcontextprotocol/sdk
# 或
pip install mcp
```

### 2. 连接MCP服务器

```javascript
// mcp-client.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPKnowledgeBase {
  constructor(serverConfig) {
    this.config = serverConfig;
    this.client = null;
  }
  
  async connect() {
    // 创建stdio传输连接
    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args
    });
    
    // 创建客户端
    this.client = new Client({
      name: 'laya-ask-ai',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    // 连接到服务器
    await this.client.connect(transport);
    
    console.log('✅ 已连接到MCP服务器');
    
    // 列出可用资源
    const resources = await this.client.listResources();
    console.log('📚 可用资源:', resources);
  }
  
  async searchDocumentation(query) {
    try {
      // 调用MCP工具搜索文档
      const result = await this.client.callTool({
        name: 'search_docs',
        arguments: {
          query: query,
          limit: 5,
          categories: ['api', 'tutorial', 'faq']
        }
      });
      
      return {
        success: true,
        results: result.results || [],
        context: this.buildContext(result.results)
      };
    } catch (error) {
      console.error('MCP搜索失败:', error);
      return {
        success: false,
        results: [],
        context: ''
      };
    }
  }
  
  async searchCode(query) {
    try {
      // 调用MCP工具搜索源码
      const result = await this.client.callTool({
        name: 'search_code',
        arguments: {
          query: query,
          limit: 3,
          fileTypes: ['ts', 'js', 'tsx']
        }
      });
      
      return {
        success: true,
        results: result.results || [],
        context: this.buildCodeContext(result.results)
      };
    } catch (error) {
      console.error('MCP代码搜索失败:', error);
      return {
        success: false,
        results: [],
        context: ''
      };
    }
  }
  
  buildContext(results) {
    if (!results || results.length === 0) {
      return '未找到相关文档。';
    }
    
    return results.map((r, i) => `
## 文档 ${i + 1}: ${r.title}

${r.snippet || r.content}

**来源**: ${r.url || r.path}
**相关度**: ${(r.score * 100).toFixed(0)}%
`).join('\n');
  }
  
  buildCodeContext(results) {
    if (!results || results.length === 0) {
      return '未找到相关代码。';
    }
    
    return results.map((r, i) => `
## 代码示例 ${i + 1}: ${r.file}

\`\`\`typescript
${r.code}
\`\`\`

**文件**: ${r.path}
**说明**: ${r.comment || '无'}
`).join('\n');
  }
  
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('👋 已断开MCP连接');
    }
  }
}

// 导出
module.exports = MCPKnowledgeBase;
```

---

## 使用示例

### 初始化

```javascript
// app.js
const MCPKnowledgeBase = require('./mcp-client');

// 配置MCP服务器
const mcpConfig = {
  command: 'node',
  args: ['path/to/laya-mcp-server/index.js'],
  env: {
    LAYA_DOCS_PATH: '/path/to/laya/docs',
    LAYA_SRC_PATH: '/path/to/laya/src'
  }
};

// 创建客户端
const kb = new MCPKnowledgeBase(mcpConfig);
await kb.connect();
```

### 查询文档

```javascript
async function answerQuestion(question) {
  // 提取关键词
  const keywords = extractKeywords(question.title + ' ' + question.content);
  
  // 搜索MCP文档
  const docResult = await kb.searchDocumentation(keywords.join(' '));
  
  // 搜索代码示例
  const codeResult = await kb.searchCode(keywords.join(' '));
  
  // 构建完整上下文
  const fullContext = `
# 相关文档

${docResult.context}

# 代码示例

${codeResult.context}
`;
  
  // 调用LLM生成答案
  const answer = await generateAnswer(question, fullContext);
  
  return {
    answer,
    sources: {
      docs: docResult.results.map(r => r.url),
      code: codeResult.results.map(r => r.path)
    }
  };
}
```

---

## 高级功能

### 1. 智能查询扩展

```javascript
async function smartQuery(question) {
  const initialQuery = question.title + ' ' + question.content;
  
  // 1. 直接查询
  let results = await kb.searchDocumentation(initialQuery);
  
  // 2. 如果结果不足，提取关键词重新查询
  if (results.results.length < 2) {
    const keywords = await extractKeywordsWithLLM(initialQuery);
    results = await kb.searchDocumentation(keywords);
  }
  
  // 3. 如果还是不足，查询相关API
  if (results.results.length < 2) {
    const apiName = extractAPIName(initialQuery);
    if (apiName) {
      const apiResults = await kb.searchDocumentation(`${apiName} API`);
      results.results = [...results.results, ...apiResults.results];
    }
  }
  
  return results;
}

// 使用LLM提取关键词
async function extractKeywordsWithLLM(text) {
  const prompt = `
从以下问题中提取3-5个最重要的关键词（中文或英文），用于技术文档搜索。

问题: ${text}

只输出关键词，用空格分隔。
`;
  
  const keywords = await llmCall(prompt);
  return keywords.trim();
}

// 提取API名称
function extractAPIName(text) {
  // 匹配 "Laya.XXX", "Sprite.XXX" 等模式
  const match = text.match(/(?:Laya\.|Sprite\.|Node\.)\w+/g);
  return match ? match[0] : null;
}
```

### 2. 缓存机制

```javascript
class CachedMCPClient extends MCPKnowledgeBase {
  constructor(config, cacheOptions = {}) {
    super(config);
    this.cache = new Map();
    this.cacheTTL = cacheOptions.ttl || 3600000; // 默认1小时
  }
  
  async searchDocumentation(query) {
    const cacheKey = `docs:${query}`;
    const cached = this.cache.get(cacheKey);
    
    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('📦 使用缓存:', query);
      return cached.data;
    }
    
    // 调用MCP
    const result = await super.searchDocumentation(query);
    
    // 存入缓存
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  clearCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

### 3. 查询优化

```javascript
async function optimizedSearch(question) {
  const queries = [];
  
  // 1. 原始问题
  queries.push({
    type: 'docs',
    query: question.title,
    weight: 1.0
  });
  
  // 2. 提取的关键词
  const keywords = extractKeywords(question.content);
  if (keywords.length > 0) {
    queries.push({
      type: 'docs',
      query: keywords.join(' '),
      weight: 0.8
    });
  }
  
  // 3. API名称
  const apiName = extractAPIName(question.content);
  if (apiName) {
    queries.push({
      type: 'docs',
      query: `${apiName} API 文档`,
      weight: 0.9
    });
  }
  
  // 4. 相关代码
  if (question.content.includes('```')) {
    queries.push({
      type: 'code',
      query: keywords.join(' '),
      weight: 0.7
    });
  }
  
  // 并发查询
  const results = await Promise.all(
    queries.map(q => 
      q.type === 'docs' 
        ? kb.searchDocumentation(q.query)
        : kb.searchCode(q.query)
    )
  );
  
  // 合并并排序结果
  const merged = mergeResults(results, queries);
  
  return merged;
}

function mergeResults(results, queries) {
  const allResults = [];
  
  results.forEach((result, i) => {
    const weight = queries[i].weight;
    result.results.forEach(r => {
      allResults.push({
        ...r,
        score: r.score * weight
      });
    });
  });
  
  // 按分数排序
  allResults.sort((a, b) => b.score - a.score);
  
  // 返回前5个
  return allResults.slice(0, 5);
}
```

---

## LLM集成示例

### 构建Prompt

```javascript
function buildAnswerPrompt(question, mcpContext) {
  return `
# 角色
你是LayaAir官方技术支持工程师，精通LayaAir引擎的各种功能和API。

# 用户问题
标题: ${question.title}
内容: ${question.content}
分类: ${question.category}

# 参考资料
${mcpContext}

# 回答要求
1. **准确性优先**: 基于参考资料回答，不要编造
2. **清晰易懂**: 用简洁的语言解释，避免过于技术化
3. **代码示例**: 如果涉及代码，提供完整可运行的示例
4. **结构清晰**: 使用markdown格式，适当使用标题和列表
5. **标注来源**: 如果参考了特定文档或代码，注明来源

# 回答格式
## 问题分析
[简要分析用户的问题]

## 解决方案
[给出具体的解决方案或答案]

### 代码示例
\`\`\`typescript
[如果有代码，放在这里]
\`\`\`

## 相关文档
[列出相关的文档链接]

## 注意事项
[如果有需要注意的地方，在此说明]

现在请回答:
`;
}

async function generateAnswer(question, mcpContext) {
  const prompt = buildAnswerPrompt(question, mcpContext);
  
  const answer = await llmCall({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: '你是LayaAir官方技术支持。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    maxTokens: 2000
  });
  
  return answer;
}
```

---

## 监控与日志

### 查询日志

```javascript
async function logMCPQuery(query, result) {
  await db.insert('mcp_query_logs', {
    query: query,
    results_count: result.results.length,
    success: result.success,
    timestamp: new Date(),
    sources: result.results.map(r => r.url)
  });
}

// 使用
const result = await kb.searchDocumentation(query);
await logMCPQuery(query, result);
```

### 效果分析

```javascript
async function analyzeMCPEffectiveness() {
  const logs = await db.query(`
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as total_queries,
      AVG(results_count) as avg_results,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count
    FROM mcp_query_logs
    WHERE timestamp >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(timestamp)
  `);
  
  console.log('MCP查询效果分析(最近7天):');
  console.table(logs);
}
```

---

## 故障处理

### 连接失败

```javascript
async function handleMCPConnection() {
  try {
    await kb.connect();
  } catch (error) {
    console.error('❌ MCP连接失败:', error);
    
    // 发送告警
    await sendAlert({
      type: 'mcp_connection_failed',
      error: error.message,
      timestamp: new Date()
    });
    
    // 使用备用方案（直接调用文档API）
    return useFallbackDocsAPI();
  }
}
```

### 超时处理

```javascript
async function searchWithTimeout(query, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const result = await kb.searchDocumentation(query, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ MCP查询超时:', query);
      return { success: false, results: [], context: '' };
    }
    throw error;
  }
}
```

---

## 配置示例

```javascript
// config/mcp.js
module.exports = {
  server: {
    command: 'node',
    args: ['/path/to/laya-mcp-server/index.js'],
    env: {
      LAYA_DOCS_PATH: process.env.LAYA_DOCS_PATH,
      LAYA_SRC_PATH: process.env.LAYA_SRC_PATH
    }
  },
  
  search: {
    maxResults: 5,
    minRelevance: 0.6,
    timeout: 5000
  },
  
  cache: {
    enabled: true,
    ttl: 3600000, // 1小时
    maxSize: 100
  },
  
  fallback: {
    enabled: true,
    apiBaseUrl: 'https://docs.layabox.com/api'
  }
};
```

---

**下一步**: [实施计划](./04-implementation-plan.md)
