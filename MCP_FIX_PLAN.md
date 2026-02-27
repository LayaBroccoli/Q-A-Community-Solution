# MCP客户端修复实施计划

## 🎯 目标
按照用户提供的专业方案修复MCP客户端，解决向量稀释、串行搜索、无精确查询等问题。

## 📋 修改清单

### 文件1: processor.js
1. ✅ 新增 NOISE_WORDS 常量
2. ✅ 替换 extractSearchQuery 为 extractMCPQueries
3. ✅ 新增 _extractKeywords 辅助方法
4. ✅ 新增 searchMCP 方法（并行搜索）
5. ✅ 修改 processDiscussion 调用新的搜索方法

### 文件2: mcp-client.js
1. ✅ 新增 search(tool, query) 统一入口
2. ✅ 新增 getApiDetail(name) 精确查询
3. ✅ 新增 sendRequestWithRetry 重试机制
4. ✅ 修改 connect() 为幂等
5. ✅ 修复 Fallback 返回空字符串

## 🔧 实施步骤

### 步骤1: 备份当前文件
### 步骤2: 修改 processor.js
### 步骤3: 修改 mcp-client.js
### 步骤4: 测试验证
### 步骤5: 重新处理d20、d22

## 📝 预期效果

### 修复前
```
d20: "如何用代码给 Sprite 添加点击事件？"
提取: "Sprite Event CLICK on add trigger"
搜索: query_api("Sprite Event CLICK on add trigger")
结果: 向量稀释，命中率低
```

### 修复后
```
d20: "如何用代码给 Sprite 添加点击事件？"
提取: [
  { tool: 'get_api_detail', query: 'Sprite' },
  { tool: 'query_api', query: '点击事件' }
]
搜索: 
  - get_api_detail("Sprite") 精确查询
  - query_api("点击事件") 向量搜索
结果: 精准命中，完整API文档
```

---

## 开始实施...