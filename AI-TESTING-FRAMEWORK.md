# AI 回复质量测试框架 v1.0

## 📋 测试类型

### 1. 单元测试（Unit Test）
测试单个功能点的回复质量

### 2. 集成测试（Integration Test）
测试完整的 MCP → AI 回复流程

### 3. 质量评估（Quality Assessment）
人工评分和自动评分

---

## 🧪 测试用例库

### 基础功能测试（Level 1）

#### TC001: Sprite 创建
**问题**: "如何创建 Sprite 精灵？"

**期望结果**:
- ✅ 包含问题分析
- ✅ 包含详细步骤
- ✅ 包含完整 TypeScript 代码
- ✅ 包含官方文档链接
- ✅ 长度: 800-1200 字符

**评分点**:
- 代码完整性: 15 分
- 文档链接正确性: 10 分
- 结构完整性: 15 分
- 内容准确性: 20 分

**及格线**: 75 分

#### TC002: Scene3D 场景创建
**问题**: "如何创建 3D 场景？"

**期望结果**:
- ✅ 说明 Scene3D 用途
- ✅ 包含创建步骤
- ✅ 包含代码示例
- ✅ 包含相关文档

#### TC003: 事件监听
**问题**: "如何监听点击事件？"

**期望结果**:
- ✅ 说明事件系统
- ✅ 提供代码示例
- ✅ 解释参数含义

### 中级功能测试（Level 2）

#### TC101: 动画播放
**问题**: "如何播放骨骼动画？"

**期望结果**:
- ✅ 说明 Templet 和 Skeleton
- ✅ 包含完整加载流程
- ✅ 代码包含错误处理

#### TC102: 物理引擎基础
**问题**: "如何添加刚体？"

**期望结果**:
- ✅ 说明物理组件
- ✅ 提供代码示例
- ✅ 说明参数含义

### 高级功能测试（Level 3）

#### TC201: IK 反向运动学
**问题**: "IK 功能如何使用？"

**期望结果**:
- ✅ 说明 IK 概念
- ✅ 列出相关 API
- ✅ 提供基本用法
- ⚠️ 文档有限时坦诚说明

#### TC202: Shader 编程
**问题**: "如何编写自定义 Shader？"

**期望结果**:
- ✅ 说明 Shader 系统
- ✅ 提供简单示例
- ✅ 指出学习路径

### 边界情况测试（Edge Cases）

#### TC301: 过时 API
**问题**: "如何使用 LayaAir 2.0 的 API？"

**期望结果**:
- ✅ 说明版本差异
- ✅ 提供迁移建议
- ❌ 不能提供过时代码

#### TC302: 模糊问题
**问题**: "引擎怎么用？"

**期望结果**:
- ✅ 引导用户明确问题
- ✅ 提供学习路径
- ❌ 不能敷衍

#### TC303: 错误假设
**问题**: "为什么 Sprite 必须继承 Node？"

**期望结果**:
- ✅ 纠正错误理解
- ✅ 说明正确关系
- ✅ 提供示例

---

## 📊 评分系统

### 自动评分（Auto Scoring）

#### 结构完整性（30 分）
```javascript
function checkStructure(content) {
  let score = 0;
  
  // 必需部分检查
  if (content.includes('## 问题分析')) score += 5;
  if (content.includes('## 解决方案')) score += 10;
  if (content.includes('### 代码示例')) score += 10;
  if (content.includes('## 相关文档')) score += 5;
  
  return score;
}
```

#### 长度检查（10 分）
```javascript
function checkLength(content) {
  const len = content.length;
  
  if (len < 500) return 0;  // 不及格
  if (len < 800) return 5;   // 及格
  if (len < 1500) return 10; // 优秀
  if (len < 2500) return 10; // 优秀
  return 5;  // 过长扣分
}
```

#### 文档链接检查（15 分）
```javascript
function checkLinks(content) {
  let score = 0;
  
  // 必须包含官方链接
  if (content.includes('https://www.layaair.com/#/doc')) {
    score += 10;
  }
  
  // 不能包含过时链接
  if (content.includes('layaair.com/LayaAir3_API')) {
    score -= 10;
  }
  
  // 至少 2 个链接
  const links = (content.match(/https:\/\/www\.layaair\.com/g) || []).length;
  score += Math.min(links, 5);
  
  return score;
}
```

#### 完整性检查（20 分）
```javascript
function checkCompleteness(content) {
  let score = 20;
  
  // 检查是否截断
  const incompletePatterns = [
    '引擎内部',
    '参考资料中提到',
    '（未完成',
    '...',
  ];
  
  for (const pattern of incompletePatterns) {
    if (content.endsWith(pattern) || content.includes(pattern + '\n\n')) {
      score -= 10;
    }
  }
  
  return Math.max(0, score);
}
```

#### 代码示例检查（25 分）
```javascript
function checkCodeExample(content) {
  let score = 0;
  
  // 必须有代码块
  if (!content.includes('```')) {
    return 0;
  }
  
  // 提取代码块
  const codeMatch = content.match(/```typescript\n([\s\S]*?)\n```/);
  if (!codeMatch) {
    return 0;
  }
  
  const code = codeMatch[1];
  
  // 基本要素检查
  if (code.includes('import ')) score += 5;  // 导入语句
  if (code.includes('new ')) score += 5;     // 实例化
  if (code.includes('//')) score += 5;       // 注释
  if (code.length > 50) score += 5;          // 足够长
  if (!code.includes('TODO') && !code.includes('待完成')) score += 5;  // 不是草稿
  
  return score;
}
```

### 人工评分（Manual Scoring）

#### 准确性（40 分）
- [ ] 代码能运行（10 分）
- [ ] API 名称正确（10 分）
- [ ] 概念解释准确（10 分）
- [ ] 无错误信息（10 分）

#### 实用性（30 分）
- [ ] 代码完整可用（15 分）
- [ ] 解释清晰易懂（10 分）
- [ ] 有实用价值（5 分）

#### 可读性（20 分）
- [ ] 格式规范（10 分）
- [ ] 层次清晰（5 分）
- [ ] 语言流畅（5 分）

### 综合评分

```
总分 = 自动评分 + 人工评分
     = (30 + 10 + 15 + 20 + 25) + (40 + 30 + 20)
     = 100 + 90
     = 190 分（满分）

及格线 = 190 * 0.4 = 76 分
优秀线 = 190 * 0.7 = 133 分
```

---

## 🔄 测试流程

### 每次代码修改后

```bash
# 1. 运行测试套件
npm test

# 2. 查看测试报告
cat test-report.html

# 3. 人工抽检（10 个样本）
npm run manual-test

# 4. 评分统计
npm run score-summary
```

### 每周质量检查

```bash
# 1. 随机抽取 50 个历史回复
npm run sample --count=50

# 2. 人工评分
npm run manual-score

# 3. 生成报告
npm run quality-report

# 4. 对比上周
npm run compare-week --week=2026-08
```

### 每月优化迭代

```bash
# 1. 分析低分回复
npm run analyze-low-score --threshold=70

# 2. 调整提示词
# 手动编辑 prompt-templates.js

# 3. A/B 测试
npm run ab-test --prompt-version=v1.1

# 4. 上线新版本
npm run deploy --version=v1.1
```

---

## 📈 质量指标

### 核心指标
- **平均分**: ≥ 85 分
- **及格率**: ≥ 95%
- **优秀率**: ≥ 60%
- **截断率**: ≤ 3%

### 监控指标
- **回复时间**: P95 < 15 秒
- **Token 使用**: 平均 < 1500
- **文档链接准确率**: 100%

---

## 🎯 优化目标

### 短期（1-2 周）
- [ ] 实现自动评分系统
- [ ] 建立测试用例库（50+ 个）
- [ ] 平均分达到 80 分

### 中期（1 个月）
- [ ] 平均分达到 85 分
- [ ] 及格率达到 95%
- [ ] 截断率 < 3%

### 长期（3 个月）
- [ ] 平均分达到 90 分
- [ ] 建立自动优化机制
- [ ] 支持自适应提示词

---

## 📝 测试记录模板

```javascript
{
  "test_id": "TC001",
  "date": "2026-02-26",
  "question": "如何创建 Sprite 精灵？",
  "response": {
    "content": "...",
    "length": 1250,
    "duration": 8.5,
    "tokens": 1450
  },
  "scoring": {
    "auto": 85,
    "manual": 88,
    "total": 173
  },
  "issues": [
    "文档链接格式需要调整"
  ],
  "status": "pass"
}
```
