# AI回复评分系统 - 安装指南

## 快速开始

### 第1步：创建数据库表

```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service

# 执行数据库迁移
mysql -u flarum -p flarum < migrations/create_rating_tables.sql
```

### 第2步：配置API路由

在 `server.js` 中添加评分路由：

```javascript
const express = require('express');
const { createRatingRoutes } = require('./rating-service');

const app = express();
app.use(express.json());

// 添加评分API
const db = require('./db');
app.use('/api', createRatingRoutes(db));

// 启动服务器
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 第3步：集成前端组件

#### 方法A：Flarum管理后台（推荐）

1. 登录Flarum管理后台
2. 进入 **Appearance** → **Custom CSS**
3. 复制 `public/rating-widget.css` 的内容粘贴进去
4. 保存

5. 进入 **Appearance** → **Custom Header**
6. 添加以下代码：

```html
<script src="http://43.128.56.125:3000/public/rating-widget.js"></script>
```

7. 保存

#### 方法B：直接修改Flarum模板

```bash
cd /path/to/flarum

# 编辑头部模板
nano public/assets/forum.css
# 复制 rating-widget.css 内容

nano public/views/app.blade.php
# 在 </head> 前添加：
# <link rel="stylesheet" href="/assets/rating-widget.css">
# <script src="http://43.128.56.125:3000/public/rating-widget.js"></script>
```

### 第4步：配置API地址

编辑 `public/rating-widget.js`：

```javascript
const CONFIG = {
  apiBaseUrl: 'http://43.128.56.125:3000/api', // 修改为你的API地址
  aiUserId: 4, // AI用户ID
  // ...
};
```

### 第5步：测试

1. 打开任意有AI回复的讨论
2. 在AI回复下方应该看到评分按钮
3. 点击一个按钮测试评分

---

## API文档

### 1. 提交评分

**请求：**
```http
POST /api/ratings
Content-Type: application/json

{
  "post_id": 123,
  "discussion_id": 45,
  "rating": "helpful",
  "user_id": 1,
  "comment": "很棒，解决了！"
}
```

**响应：**
```json
{
  "success": true,
  "message": "评分成功，感谢您的反馈！"
}
```

### 2. 查询评分统计

**请求：**
```http
GET /api/ratings/123
```

**响应：**
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "discussion_id": 45,
    "total_ratings": 5,
    "helpful_count": 3,
    "partial_count": 1,
    "not_helpful_count": 1,
    "irrelevant_count": 0,
    "average_score": 4.2
  }
}
```

### 3. 质量报告

**请求：**
```http
GET /api/ratings/report?limit=50&min_ratings=2
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "post_id": 123,
      "discussion_title": "如何给Sprite添加点击事件",
      "total_ratings": 5,
      "average_score": 4.2,
      "quality_level": "优秀",
      "helpful_rate": 60.0
    }
  ]
}
```

### 4. 低分回复列表

**请求：**
```http
GET /api/ratings/low-score?max_score=3.0&min_ratings=2
```

---

## 数据分析

### 查看AI回复质量

```bash
mysql -u flarum -p flarum

SELECT * FROM v_ai_rating_report
WHERE total_ratings >= 2
ORDER BY average_score DESC;
```

### 查看今日评分

```sql
SELECT
  rating_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM ai_ratings
WHERE DATE(created_at) = CURDATE()
GROUP BY rating_type;
```

### 查看需要人工复审的回复

```sql
SELECT * FROM v_ai_rating_report
WHERE average_score < 2.5 AND total_ratings >= 3
ORDER BY average_score ASC;
```

---

## 常见问题

### Q: 评分按钮不显示？

**A:** 检查：
1. 浏览器控制台是否有错误
2. AI用户ID是否正确（默认4）
3. API地址是否可访问
4. CSS和JS是否正确加载

### Q: 点击按钮没反应？

**A:** 检查：
1. 浏览器控制台Network标签，查看API请求
2. 服务器日志是否有错误
3. CORS是否配置正确

### Q: 如何允许匿名评价？

**A:** 修改 `rating-service.js`：

```javascript
// 注释掉用户ID检查
if (!user_id) {
  // return res.status(400).json({
  //   success: false,
  //   error: '请先登录后再评价'
  // });
}
```

### Q: 如何修改评分按钮样式？

**A:** 编辑 `public/rating-widget.css`，修改 `.rating-btn` 样式。

---

## 安全建议

1. **防刷分**：已通过IP地址和用户ID限制
2. **数据验证**：所有输入都经过验证
3. **SQL注入防护**：使用参数化查询
4. **CORS配置**：生产环境应配置CORS白名单

---

## 下一步优化

1. ✅ 添加评分原因收集（可选备注）
2. ✅ 评分统计图表展示
3. ✅ 自动通知低分回复给管理员
4. ✅ 根据评分优化AI提示词
5. ✅ A/B测试不同评分维度

---

*v1.0 · 2026-02-28*
