# AI 自动回复系统 v4.0 升级说明

## 升级时间
2026-02-27 11:53

## 升级内容

### 1. 系统提示词更新（ai-service.js）

**文件**: `/root/.openclaw/workspace/Q-A-Community-Solution/ai-service/ai-service.js`

**更新内容**:
- ✅ 完全替换 `getSystemPrompt()` 方法
- ✅ 采用 v4.0 规范（严格按照用户提供的提示词）

**新增规范**:
- 预过滤规则（吐槽、招聘、灌水等内容跳过）
- MCP关键词提炼（拆原子、去噪音、英文优先）
- 工具智能选择（get_api_detail vs query_api）
- 搜索失败重试机制（3层重试）
- 人性化写作规则（有温度、不说教）
- 发布前自检（5项硬性检查）

---

### 2. 关键词提取优化（processor.js）

**文件**: `/root/.openclaw/workspace/Q-A-Community-Solution/ai-service/processor.js`

**更新方法**: `extractSearchQuery(title, content)`

**优化内容**:
- ✅ **拆原子**: 复杂问题→多个独立技术点
- ✅ **去噪音**: 删除无效词（怎么、如何、实现等）
- ✅ **英文优先**: API名称比中文描述更精准
- ✅ **不加Laya前缀**: MCP索引无前缀，查`Camera`而非`Laya.Camera`
- ✅ **≤4词**: 限制关键词数量

**示例**:
```javascript
// 优化前
"如何动态创建 Sprite3D？" → "如何动态创建 Sprite3D"

// 优化后
"如何动态创建 Sprite3D？" → "Sprite3D LayaAir D"
```

---

### 3. 预过滤机制（processor.js）

**新增方法**: `shouldSkipReply(discussion)`

**过滤规则**:
- ❌ 帖子内容 <20字且无代码 → 跳过
- ❌ 纯吐槽/灌水（关键词检测）→ 跳过
- ❌ 招聘/求职帖 → 跳过
- ❌ 已有人工回复且问题已解决 → 跳过

---

### 4. 搜索失败重试机制（processor.js）

**更新方法**: `processDiscussion(discussionId)`

**3层重试策略**:
```
尝试1: 使用原始关键词（如 "Sprite3D MeshFilter"）
  ↓ 失败
尝试2: 缩短为前2个词（如 "Sprite3D"）
  ↓ 失败
尝试3: 只用第1个词（如 "Sprite3D"）
  ↓ 失败
使用通用框架回复（不含具体API）
```

**日志输出**:
```
📌 尝试1: 搜索 "Sprite3D MeshFilter"
📌 尝试2: 缩短为 "Sprite3D"
📌 尝试3: 只用 "Sprite3D"
```

---

## 关键改进点对比

| 项目 | v3.x | v4.0 |
|------|------|------|
| **关键词提取** | 简单提取API名 | 拆原子+去噪音+英文优先 |
| **MCP工具选择** | 固定query_api | 智能选择get_api_detail/query_api |
| **搜索失败** | 直接跳过 | 3层重试机制 |
| **预过滤** | 无 | 4类帖子自动跳过 |
| **回复风格** | 技术化 | 人性化、有温度 |
| **链接管理** | 有入口链接检查 | 严格禁止拼接URL |

---

## 测试建议

### 测试用例1: 基础API问题
**标题**: "如何动态创建 Sprite3D？"
**预期**:
- 关键词提取: "Sprite3D"
- MCP搜索: 应返回相关文档
- 回复质量: 有代码示例

### 测试用例2: 复杂问题
**标题**: "3D场景角色头顶跟随的血条UI怎么做"
**预期**:
- 关键词提取: "UI D" (或优化后)
- MCP重试: 应进入重试流程
- 回复质量: 拆解为多个技术点

### 测试用例3: 预过滤
**标题**: "这个引擎太坑了"
**预期**:
- 预过滤识别为吐槽
- 直接跳过，不回复

---

## 服务器状态

- ✅ 已重启
- ✅ 运行正常（PID: 2026138）
- ✅ 新规范已生效

**启动时间**: 2026-02-27 11:53:56

---

## 下一步

1. **发帖测试**: 使用上述测试用例验证功能
2. **监控日志**: 观察3层重试是否正常工作
3. **质量评估**: 对比v3.x回复质量是否有提升

---

## 文件备份

**备份位置**: `/root/.openclaw/workspace/Q-A-Community-Solution/ai-service/processor.js.backup`

如需回滚：
```bash
cp processor.js.backup processor.js
pkill -f "server.js"
nohup node server.js > server.log 2>&1 &
```

---

**升级完成** 🎉
