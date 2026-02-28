# AI回复评分系统 - 完整文档

## 📊 系统概述

为LayaAir社区AI自动回复添加评分功能，收集用户反馈，作为优化AI回复质量的依据。

---

## 🎯 核心功能

### 1. 评分维度（4个按钮）

| 按钮 | 图标 | 说明 | 分值 |
|------|------|------|------|
| 解决问题 | ✅ | 完全解决了问题 | 5分 |
| 部分解决 | ⚠️ | 部分解决，有参考价值 | 3分 |
| 未解决 | ❌ | 没解决，无参考价值 | 1分 |
| 不相关 | 🤔 | 答非所问，完全不相关 | 0分 |

### 2. 主要特性

- ✅ **防重复评价**：每个用户每个回复只能评一次
- ✅ **实时统计**：自动计算平均分和好评率
- ✅ **数据可视化**：质量报告、低分列表
- ✅ **响应式设计**：支持移动端和深色模式
- ✅ **匿名支持**：允许未登录用户评价
- ✅ **IP记录**：防止刷分作弊

---

## 📁 文件清单

```
Q-A-Community-Solution/
├── RATING_SYSTEM_DESIGN.md      # 完整设计方案
├── RATING_INSTALL_GUIDE.md      # 安装使用指南
├── ai-service/
│   ├── migrations/
│   │   └── create_rating_tables.sql  # 数据库迁移脚本
│   ├── rating-service.js        # 后端API服务
│   └── public/
│       ├── rating-widget.js     # 前端评分组件
│       └── rating-widget.css    # 样式文件
```

---

## 🚀 快速开始

### 1. 数据库准备（1分钟）

```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service

# 执行数据库迁移
mysql -u flarum -p flarum < migrations/create_rating_tables.sql
```

### 2. 后端集成（5分钟）

在 `server.js` 中添加：

```javascript
const { createRatingRoutes } = require('./rating-service');
app.use('/api', createRatingRoutes(db));
```

### 3. 前端集成（3分钟）

**Flarum管理后台**：
1. Appearance → Custom CSS → 粘贴 `rating-widget.css`
2. Appearance → Custom Header → 添加 `<script>` 标签

详见：`RATING_INSTALL_GUIDE.md`

---

## 📈 数据分析

### 质量报告

```sql
-- 查看所有AI回复评分统计
SELECT * FROM v_ai_rating_report
WHERE total_ratings >= 2
ORDER BY average_score DESC;
```

### 低分回复

```sql
-- 查看需要人工复审的回复
SELECT * FROM v_ai_rating_report
WHERE average_score < 2.5
  AND total_ratings >= 3
ORDER BY average_score ASC;
```

### 每日评分趋势

```sql
-- 查看今日评分分布
SELECT
  rating_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM ai_ratings
WHERE DATE(created_at) = CURDATE()
GROUP BY rating_type;
```

---

## 🔌 API接口

### 提交评分
```http
POST /api/ratings
{
  "post_id": 123,
  "discussion_id": 45,
  "rating": "helpful",
  "user_id": 1,
  "comment": "很棒！"
}
```

### 查询评分
```http
GET /api/ratings/123
```

### 质量报告
```http
GET /api/ratings/report?limit=50
```

### 低分列表
```http
GET /api/ratings/low-score?max_score=3.0
```

---

## 🎨 自定义配置

### 修改评分维度

编辑 `public/rating-widget.js`：

```javascript
const ratingTypes = [
  { id: 'helpful', icon: '✅', label: '解决问题', value: 5 },
  { id: 'partial', icon: '⚠️', label: '部分解决', value: 3 },
  { id: 'not_helpful', icon: '❌', label: '未解决', value: 1 },
  { id: 'irrelevant', icon: '🤔', label: '不相关', value: 0 }
];
```

### 修改按钮颜色

编辑 `public/rating-widget.css`：

```css
.rating-btn.helpful:hover {
  border-color: #4caf50;
  background: #e8f5e9;
}
```

### 修改AI用户ID

```javascript
const CONFIG = {
  aiUserId: 4, // 修改为你的AI用户ID
  // ...
};
```

---

## 🔒 安全特性

1. **防重复评价**：数据库唯一索引
2. **IP限制**：记录IP地址防止刷分
3. **数据验证**：前后端双重验证
4. **SQL注入防护**：参数化查询
5. **CORS支持**：生产环境配置白名单

---

## 📊 预期效果

### 短期（1周）
- 收集100+条评分
- 识别10个低质量回复

### 中期（1月）
- 根据评分优化提示词
- 改进5个常见问题回答

### 长期（3月）
- AI回复质量提升30%
- 用户满意度提升40%

---

## 🛠️ 维护建议

### 每周
1. 查看低分回复列表
2. 人工复审并优化

### 每月
1. 分析评分数据趋势
2. 优化AI提示词
3. 更新MCP知识库

### 每季
1. 全面评估AI回复质量
2. 调整评分维度
3. 优化用户体验

---

## 📞 技术支持

如有问题，请查看：
1. `RATING_SYSTEM_DESIGN.md` - 完整设计文档
2. `RATING_INSTALL_GUIDE.md` - 安装指南
3. 数据库视图 `v_ai_rating_report` - 数据分析

---

**版本**: v1.0
**更新**: 2026-02-28
**状态**: ✅ 开发完成，待测试
