# 讨论20关键词提取问题分析

## 🔍 问题现象

**用户问题**：如何用代码给 Sprite 添加点击事件？

**用户内容**：想实现点击一个 2D 精灵后触发回调函数，请问代码怎么写？

**提取的关键词**：`"Sprite"`

**MCP搜索结果**：只有Sprite类相关的API，没有事件相关的内容

**AI回复**：参考资料中未包含事件监听的相关 API（如 on 方法）

---

## 🐛 根本原因

### 关键词提取逻辑
```javascript
// 当前代码只提取英文API名称
const extractApiNames = (text) => {
  const matches = text.match(/[A-Z][a-zA-Z0-9_]*/g) || [];
  return matches.filter(name => name.length > 1);
};
```

**问题**：
- ✅ 提取到"Sprite"（大写字母开头）
- ❌ 丢失了"点击事件"
- ❌ 丢失了"回调函数"
- ❌ 丢失了"事件监听"

---

## 🎯 优化方案

### 方案1: 添加中文关键词映射（推荐）

**思路**：识别中文概念，映射到对应的英文API

**实现**：
```javascript
// 中文概念到英文API的映射
const conceptToApi = {
  '点击事件': 'Event CLICK on',
  '点击': 'CLICK',
  '事件': 'Event',
  '回调': 'callback',
  '事件监听': 'Event listener',
  '触发': 'trigger',
  '动画': 'Animation',
  '物理引擎': 'Physics',
  '碰撞': 'Collision'
};

// 识别中文概念
const extractConcepts = (text) => {
  const concepts = [];
  for (const [chinese, english] of Object.entries(conceptToApi)) {
    if (text.includes(chinese)) {
      concepts.push(english);
    }
  }
  return concepts;
};
```

**效果**：
- 输入："如何用代码给 Sprite 添加点击事件？"
- 提取：["Sprite", "Event CLICK on"]
- MCP搜索：Sprite类 + Event相关API

### 方案2: 优化正则表达式

**当前**：
```javascript
const matches = text.match(/[A-Z][a-zA-Z0-9_]*/g) || [];
```

**优化后**：
```javascript
// 匹配更多格式
const patterns = [
  /[A-Z][a-zA-Z0-9_]*/g,  // API名称
  /\b(on|click|event|callback|trigger)\b/gi,  // 事件相关
  /\b(add|remove|listener)\b/gi  // 监听器相关
];

const matches = [];
patterns.forEach(pattern => {
  const found = text.match(pattern) || [];
  matches.push(...found);
});
```

### 方案3: 使用自然语言处理

**思路**：提取动作+对象

**实现**：
```javascript
// 识别"动作+对象"模式
const patterns = [
  /给(.+)添加(.+)/,  // "给Sprite添加点击事件"
  /(.+)的(.+)/,  // "Sprite的点击事件"
  /(.+)监听/,  // "事件监听"
];

for (const pattern of patterns) {
  const match = title.match(pattern);
  if (match) {
    keywords.push(match[1].trim());  // Sprite
    keywords.push(match[2].trim());  // 点击事件
  }
}
```

---

## 📊 对比

### 当前
```
输入: "如何用代码给 Sprite 添加点击事件？"
提取: ["Sprite"]
搜索: Sprite类
结果: ❌ 没有事件API
```

### 优化后（方案1）
```
输入: "如何用代码给 Sprite 添加点击事件？"
提取: ["Sprite", "Event CLICK on"]
搜索: Sprite类 + Event相关API
结果: ✅ 包含on()、Event.CLICK等API
```

---

## 🎯 立即实施

**方案1（推荐）**：添加中文概念映射

**优点**：
- ✅ 简单有效
- ✅ 准确映射
- ✅ 易于维护

**实施**：
1. 创建conceptToApi映射表
2. 在extractSearchQuery中调用
3. 合并API名称和概念映射

---

**需要我实施方案1吗？**
