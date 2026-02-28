# AI回复评分系统设计方案

## 系统概述

为AI自动回复添加评分功能，收集用户反馈，作为优化AI回复质量的依据。

---

## 数据库设计

### 1. 评分表 (ai_ratings)

```sql
CREATE TABLE ai_ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,                    -- AI回复的帖子ID
  discussion_id INT NOT NULL,              -- 讨论ID
  user_id INT NULL,                        -- 评价用户ID（NULL表示匿名）
  rating_type VARCHAR(20) NOT NULL,        -- 评分类型
  rating_value INT NOT NULL,               -- 评分值 (1-5)
  rating_comment TEXT NULL,                -- 评价备注（可选）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_discussion_id (discussion_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating_type (rating_type),
  UNIQUE KEY uk_user_post (user_id, post_id) -- 防止重复评价
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. 评分统计表 (ai_rating_stats)

```sql
CREATE TABLE ai_rating_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL UNIQUE,             -- AI回复的帖子ID
  discussion_id INT NOT NULL,              -- 讨论ID
  total_ratings INT DEFAULT 0,             -- 总评价数
  helpful_count INT DEFAULT 0,             -- 有帮助数
  partial_count INT DEFAULT 0,             -- 部分解决数
  not_helpful_count INT DEFAULT 0,         -- 没用数
  irrelevant_count INT DEFAULT 0,          -- 不相关数
  average_score DECIMAL(3,2) DEFAULT 0.00, -- 平均分
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_discussion_id (discussion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 前端设计

### 评分按钮位置

在AI回复下方添加评分区域：

```html
<div class="ai-rating-box">
  <div class="ai-rating-title">这个回答有帮助吗？</div>
  <div class="ai-rating-buttons">
    <button class="rating-btn helpful" data-rating="helpful">
      <span class="icon">✅</span>
      <span class="text">解决问题</span>
    </button>
    <button class="rating-btn partial" data-rating="partial">
      <span class="icon">⚠️</span>
      <span class="text">部分解决</span>
    </button>
    <button class="rating-btn not-helpful" data-rating="not_helpful">
      <span class="icon">❌</span>
      <span class="text">未解决</span>
    </button>
    <button class="rating-btn irrelevant" data-rating="irrelevant">
      <span class="icon">🤔</span>
      <span class="text">不相关</span>
    </button>
  </div>
  <div class="ai-rating-feedback"></div>
</div>
```

### 样式设计

```css
.ai-rating-box {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.ai-rating-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.ai-rating-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rating-btn {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rating-btn:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.rating-btn.helpful:hover { border-color: #4caf50; background: #e8f5e9; }
.rating-btn.partial:hover { border-color: #ff9800; background: #fff3e0; }
.rating-btn.not-helpful:hover { border-color: #f44336; background: #ffebee; }
.rating-btn.irrelevant:hover { border-color: #9e9e9e; background: #f5f5f5; }

.rating-btn .icon { font-size: 20px; }
.rating-btn .text { font-size: 12px; font-weight: 500; }

.rating-btn.active {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-rating-feedback {
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}
```

---

## 后端API设计

### 1. 提交评分

```javascript
// POST /api/rate
{
  post_id: 123,              // AI回复的帖子ID
  discussion_id: 45,         // 讨论ID
  rating: 'helpful',         // 评分类型
  user_id: 1,                // 用户ID（可选）
  comment: '很棒，解决了'    // 备注（可选）
}
```

### 2. 查询评分统计

```javascript
// GET /api/ratings/:post_id
{
  post_id: 123,
  total_ratings: 5,
  helpful: 3,
  partial: 1,
  not_helpful: 1,
  irrelevant: 0,
  average_score: 4.2
}
```

### 3. 检查用户是否已评价

```javascript
// GET /api/rated/:post_id/:user_id
{
  rated: true,
  rating: 'helpful'
}
```

---

## 评分维度说明

### 方案A：问题解决程度（推荐）

| 评分类型 | 图标 | 说明 | 分值 |
|---------|------|------|------|
| helpful | ✅ | 完全解决问题 | 5分 |
| partial | ⚠️ | 部分解决，有参考价值 | 3分 |
| not_helpful | ❌ | 没解决，无参考价值 | 1分 |
| irrelevant | 🤔 | 答非所问，完全不相关 | 0分 |

### 方案B：情绪反馈

| 评分类型 | 图标 | 说明 | 分值 |
|---------|------|------|------|
| like | 👍 | 有帮助 | 5分 |
| neutral | 😐 | 一般 | 3分 |
| dislike | 👎 | 没用 | 1分 |

### 方案C：详细评分

| 评分类型 | 图标 | 说明 | 分值 |
|---------|------|------|------|
| excellent | ⭐⭐⭐⭐⭐ | 非常好 | 5分 |
| good | ⭐⭐⭐⭐ | 还不错 | 4分 |
| average | ⭐⭐⭐ | 一般 | 3分 |
| poor | ⭐⭐ | 较差 | 2分 |
| terrible | ⭐ | 很差 | 1分 |

---

## 权限控制

### 方案1：仅登录用户可评价
```javascript
if (!userId) {
  return { error: '请先登录后再评价' };
}
```

### 方案2：任何人都可评价（推荐）
```javascript
// 允许匿名评价，user_id 为 NULL
```

### 方案3：仅楼主可评价
```javascript
const discussion = await db.getDiscussionById(discussionId);
if (userId !== discussion.user_id) {
  return { error: '只有楼主可以评价AI回复' };
}
```

---

## 防重复评价

### 方案1：每个回复只能评一次（推荐）
```javascript
// 数据库唯一索引
UNIQUE KEY uk_user_post (user_id, post_id)

// 应用层检查
const existing = await db.query(
  'SELECT id FROM ai_ratings WHERE post_id = ? AND (user_id = ? OR user_id IS NULL)',
  [postId, userId]
);
if (existing.length > 0) {
  return { error: '您已经评价过该回复' };
}
```

### 方案2：可以修改评价
```javascript
// 允许更新评分
UPDATE ai_ratings
SET rating_type = ?, rating_value = ?, rating_comment = ?
WHERE post_id = ? AND user_id = ?
```

### 方案3：不限制
```javascript
// 允许多次评价，记录所有评价
```

---

## 数据分析

### 1. AI回复质量报告

```sql
-- 查看所有AI回复的评分统计
SELECT
  p.id as post_id,
  d.title,
  s.total_ratings,
  s.helpful_count,
  s.average_score,
  (s.helpful_count / s.total_ratings * 100) as helpful_rate
FROM posts p
JOIN discussions d ON p.discussion_id = d.id
LEFT JOIN ai_rating_stats s ON p.id = s.post_id
WHERE p.user_id = 4  -- AI用户ID
ORDER BY p.created_at DESC;
```

### 2. 低分回复列表

```sql
-- 查看平均分低于3分的AI回复
SELECT
  d.title,
  s.average_score,
  s.total_ratings,
  s.not_helpful_count
FROM posts p
JOIN discussions d ON p.discussion_id = d.id
JOIN ai_rating_stats s ON p.id = s.post_id
WHERE p.user_id = 4
  AND s.average_score < 3.0
  AND s.total_ratings >= 2  -- 至少2个评价
ORDER BY s.average_score ASC;
```

### 3. 每日评分趋势

```sql
-- 查看每日AI回复评分趋势
SELECT
  DATE(r.created_at) as date,
  COUNT(*) as total_ratings,
  AVG(r.rating_value) as avg_score,
  SUM(CASE WHEN r.rating_type = 'helpful' THEN 1 ELSE 0 END) as helpful_count
FROM ai_ratings r
GROUP BY DATE(r.created_at)
ORDER BY date DESC;
```

---

## 实施步骤

### 第1步：数据库表创建
1. 创建 ai_ratings 表
2. 创建 ai_rating_stats 表
3. 创建必要的索引

### 第2步：后端API开发
1. 添加评分提交接口
2. 添加评分查询接口
3. 添加评分统计接口

### 第3步：前端集成
1. 创建评分组件
2. 添加CSS样式
3. 实现点击交互

### 第4步：测试验证
1. 功能测试
2. 性能测试
3. 用户体验测试

### 第5步：数据分析
1. 创建评分统计报表
2. 创建低分回复分析
3. 创建优化建议报告

---

## 预期效果

### 1. 短期效果
- 收集用户反馈，了解AI回复质量
- 识别低质量回复，人工复审

### 2. 中期效果
- 根据评分数据优化提示词
- 针对低分问题改进知识库

### 3. 长期效果
- 建立AI回复质量评估体系
- 持续优化AI回答能力
- 提升用户满意度

---

## 注意事项

1. **隐私保护**：匿名评价也要记录IP，防止刷分
2. **数据备份**：定期备份评分数据
3. **性能优化**：评分统计表要定期更新，避免实时计算
4. **用户提醒**：评分后显示感谢，提升参与度
5. **数据分析**：定期查看评分数据，优化AI回复

---

*v1.0 · 2026-02-28*
