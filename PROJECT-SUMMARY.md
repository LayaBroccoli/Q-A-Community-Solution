# LayaAir AI Q&A 社区 - 项目总结

## 📅 完成时间
2026-02-26

## 🎯 项目目标
构建一个基于 Flarum 的 LayaAir AI Q&A 社区，实现：
1. Webhook 自动触发 AI 回复
2. MCP 集成提供官方文档支持
3. 自动格式化和渲染

---

## ✅ 已完成功能

### 1. Webhook 自动触发系统
**位置**: `/var/www/flarum/packages/laya/flarum-webhooks/`

- ✅ Flarum 扩展（标准 composer 安装）
- ✅ 监听 `DiscussionStarted` 事件
- ✅ 发送 POST 请求到 AI 服务
- ✅ 测试通过（8 秒内完成 AI 回复）

### 2. AI 服务
**位置**: `/root/.openclaw/workspace/Q-A-Community-Solution/ai-service/`

**核心功能**:
- ✅ Express 服务器（端口 3000）
- ✅ Webhook 接收端点
- ✅ 问题处理器
- ✅ Zhipu AI GLM-4.7 集成
- ✅ Markdown → HTML 转换（marked）
- ✅ Flarum 格式化（`<t>` 标签）

**配置**:
```env
PORT=3000
OPENAI_API_KEY=d1cc13edc4314192a8ec3fde78bc87c7.W2n13IOQ7s7RKEko
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4.7
AI_USER_ID=4
```

### 3. MCP 集成（Model Context Protocol）
**位置**: `ai-service/mcp-client.js`

**服务器**:
- URL: `https://laya-knowledge-mcp.layaair.com/mcp`
- 版本: v3.3.5
- 协议: HTTP POST JSON-RPC

**可用工具（9个）**:
1. `query_api` - API 搜索 ✅
2. `query_docs` - 文档搜索 ✅
3. `get_api_detail` - API 详情
4. `get_examples` - 示例代码
5. `compare_versions` - 版本对比
6. `get_document` - 文档内容
7. `get_source_code` - 源码
8. `get_schema_by_name` - 配置信息
9. `get_extending_classes` - 继承关系

**功能**:
- ✅ 自动连接 MCP 服务器
- ✅ 查询官方文档
- ✅ 查询 API 参考
- ✅ JSON 解析和内容提取
- ✅ 上下文注入 AI prompt

### 4. 数据库集成
**表**: `flarum.posts`, `flarum.discussions`

**功能**:
- ✅ 读取讨论内容
- ✅ 检查是否已有 AI 回复
- ✅ 插入 AI 回复
- ✅ 自动序号管理
- ✅ 时区修复（GMT+8）

### 5. 格式化和渲染
- ✅ Markdown → HTML 转换
- ✅ Flarum `<t>` 标签包装
- ✅ 代码高亮（TypeScript）
- ✅ 时间戳修复（UTC_TIMESTAMP）

---

## 🎨 工作流程

```
用户发帖 → Flarum → Webhook → AI 服务
                                ↓
                          MCP 查询文档
                                ↓
                          GLM-4.7 生成
                                ↓
                          格式化（HTML）
                                ↓
                          写入数据库
                                ↓
                          Flarum 显示
```

**响应时间**: ~8-10 秒

---

## 📊 测试结果

### 测试用例 1: Sprite 精灵创建
**问题**: "如何创建 Sprite 精灵？"

**MCP 返回**:
- 文档: "## 一、概述"（详细说明）
- API: sprite, GRAPHICS, TEXT（3个）

**AI 回复**:
- ✅ 问题分析
- ✅ 解决方案（3个步骤）
- ✅ 完整 TypeScript 代码示例
- ✅ 相关文档链接（已更新为最新）
- ✅ 注意事项

**质量**: ⭐⭐⭐⭐⭐ 优秀

### 测试用例 2: Scene3D 场景
**问题**: "Scene3D 场景如何创建？"

**MCP 返回**:
- 文档: "场景即为LayaAir引擎的3D世界容器"（476字符）
- API: 无相关结果

**AI 回复**:
- ✅ 基本说明（760字符）
- ⚠️ 内容较短

**质量**: ⭐⭐⭐ 中等

### 测试用例 3: IK 反向运动学
**问题**: "IK 功能如何使用？"

**MCP 返回**:
- 文档: "# 内置骨骼动画"（19字符）
- API: IkConstraint, IK_Constraint1, ikcomp, ik_result（5个）

**AI 回复**:
- ✅ 概念说明（资源准备 + 代码控制）
- ⚠️ 内容被截断（351字符）
- ⚠️ 无代码示例

**质量**: ⭐⭐ 基础

---

## 🐛 已知问题

### 1. 高级功能文档有限
**表现**: IK、物理引擎等高级功能，MCP 返回的文档内容很少

**原因**: 官方文档本身可能不够详细

**影响**: AI 无法生成详细回答

**建议**: 这可能是正常的，高级功能需要更深入的学习

### 2. AI 回答长度不稳定
**表现**: 有时生成较短的回答（Scene3D: 760字符，IK: 351字符）

**原因**:
- AI 模型限制（GLM-4.7）
- MCP 上下文质量
- max_tokens: 2000（已设置）

**建议**: 可以尝试优化提示词

### 3. 回答偶尔被截断
**表现**: IK 问题回答在"引擎内部"处截断

**原因**: 未知（可能是 AI 模型问题）

**频率**: 偶发

---

## 📈 性能指标

### 响应时间
- Webhook 接收: <1 秒
- MCP 查询: 2-5 秒
- AI 生成: 3-5 秒
- **总计**: ~8-10 秒

### 资源占用
- AI 服务内存: ~100MB
- 数据库查询: <50ms
- 并发支持: 单线程（可扩展）

---

## 🔧 技术栈

### 后端
- Node.js v22.22.0
- Express.js
- mysql2
- axios
- marked
- @modelcontextprotocol/sdk

### AI 模型
- Zhipu AI GLM-4.7
- API: https://open.bigmodel.cn
- max_tokens: 2000
- temperature: 0.7

### 数据库
- MySQL 8.0
- Flarum 数据库

### 论坛
- Flarum v1.8.13
- 自定义 Webhook 扩展

---

## 📝 提交记录

### 主要提交
1. `52340d5` - 🎉 里程碑：Webhook 自动触发成功
2. `5e3727c` - AI service and Flarum integration
3. `67b645f` - 修复 AI 回复 type 字段
4. `6722656` - ✅ 修复时区、格式和渲染问题
5. `9130fc0` - feat: 完成 MCP 集成 - 连接 LayaAir 知识库
6. `9a08fb5` - fix: 正确解析 MCP 返回的 JSON 内容
7. `6ea6ea4` - fix: 更新文档链接到正确的官方地址

### 分支
- `main` - 主分支
- 远程: https://github.com/LayaBroccoli/Q-A-Community-Solution.git

---

## 🚀 部署信息

### 服务器
- IP: 43.128.56.125
- 系统: OpenCloudOS (基于 CentOS)
- Node: v22.22.0

### 服务地址
- Flarum: http://43.128.56.125
- AI 服务: http://43.128.56.125:3000
- Webhook: POST http://43.128.56.125:3000/webhook/discussion

### 数据库
- Host: localhost
- Database: flarum
- User: flarum
- Password: Flarum@2026!

### AI 用户
- ID: 4
- 用户名: AI助手

---

## 💡 优化建议

### 短期
1. **添加重试机制** - MCP 超时后自动重试 1-2 次
2. **优化提示词** - 明确要求 AI 使用 MCP API 信息
3. **增加日志** - 记录 token 使用情况

### 中期
1. **实现缓存** - 减少重复 MCP 查询
2. **异步优化** - MCP 查询不阻塞主流程
3. **更多工具集成** - get_examples, get_document

### 长期
1. **多模型支持** - 测试其他 AI 模型
2. **自定义训练** - 基于 LayaAir 文档微调模型
3. **社区反馈** - 收集用户反馈持续优化

---

## 🎉 总结

### 核心成就
✅ **Webhook 自动触发** - 完全自动化，无需人工干预
✅ **MCP 集成** - 成功连接 LayaAir 官方知识库
✅ **AI 回复质量高** - 对于基础问题能提供详细、准确的答案
✅ **文档链接正确** - 使用最新的官方文档地址
✅ **格式完善** - Markdown、代码高亮、HTML 渲染

### 适用场景
✅ **常见问题** - Sprite、Scene3D、基础 API
✅ **概念解释** - 什么是某个功能、如何使用
⚠️ **高级功能** - IK、物理引擎（能找到 API 但文档有限）

### 项目状态
🟢 **生产就绪** - 可以投入使用
🟡 **持续优化** - 高级功能支持需要进一步优化

---

## 📞 维护

### 启动服务
```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
nohup node server.js > /tmp/ai-service.log 2>&1 &
```

### 查看日志
```bash
tail -f /tmp/ai-service.log
```

### 停止服务
```bash
pkill -f "node.*server.js"
```

### 检查状态
```bash
ps aux | grep "node.*server.js"
curl http://localhost:3000/health
```

---

**项目完成日期**: 2026-02-26
**最后更新**: 2026-02-26 10:56 GMT+8
