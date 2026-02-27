# Webhook配置说明

## 🔍 当前状态

### Webhook扩展
**状态**: ❌ 未安装
**原因**: extensions目录为空
**影响**: 无法通过管理界面配置webhook

### 数据库表
**状态**: ❌ webhooks表不存在
**检查**: `SHOW TABLES LIKE '%webhook%'` - 无结果
**结论**: FoF Webhooks扩展已被删除或从未安装

---

## 🤔 疑问

### 如果没有webhook扩展，AI是怎么回复的？

**可能性1**: 使用了其他触发方式
- 定时任务轮询新讨论
- 手动触发API
- 其他扩展集成

**可能性2**: 之前安装过但已删除
- 保留了webhook URL配置
- 扩展删除但webhook仍在触发

**可能性3**: 使用了第三方webhook服务
- 通过外部服务转发
- 使用Flarum的API轮询

---

## 📡 可用的Webhook端点

### 当前代码支持的端点

#### 1. FoF格式（推荐）
```
POST http://43.128.56.125:3000/webhooks
Content-Type: application/json

{
  "event": "discussion.started" | "post.created",
  "payload": {
    "discussion": { ... },
    "post": { ... }
  }
}
```

#### 2. 自定义格式（兼容）
```
POST http://43.128.56.125:3000/webhook/discussion
Content-Type: application/json

{
  "event": "discussion.created",
  "data": {
    "discussion_id": 19,
    "id": 19
  }
}
```

---

## 🔧 解决方案

### 方案1: 安装FoF Webhooks扩展（推荐）

**安装命令**:
```bash
cd /var/www/flarum
composer require fof/webhooks
php flarum cache:clear
```

**配置**:
1. 进入论坛后台
2. 设置 → 扩展 → FoF Webhooks
3. 添加webhook:
   - URL: `http://43.128.56.125:3000/webhooks`
   - 事件: `讨论创建`、`帖子创建`

**优点**:
- ✅ 官方支持，稳定可靠
- ✅ 图形界面配置
- ✅ 支持多种事件
- ✅ 自动重试失败请求

### 方案2: 使用第三方webhook服务

**选择**:
- HookRelay（hookrelay.dev）
- RequestBin（requestbin.com）
- Webhook.site（webhook.site）

**缺点**:
- ⚠️  需要额外依赖
- ⚠️  可能有延迟
- ⚠️  需要配置转发规则

### 方案3: 定时轮询（临时方案）

**实现**:
```javascript
// 每分钟检查一次新讨论
setInterval(async () => {
  const newDiscussions = await db.query(
    'SELECT id FROM discussions WHERE created_at > ?',
    [lastCheckTime]
  );

  for (const discussion of newDiscussions) {
    queue.add(discussion.id);
  }
}, 60000);
```

**优点**:
- ✅ 不依赖webhook扩展
- ✅ 完全控制

**缺点**:
- ❌ 不实时（延迟1分钟）
- ❌ 增加数据库查询

---

## 🎯 建议

### 立即行动
**安装FoF Webhooks扩展**:
```bash
cd /var/www/flarum
composer require fof/webhooks
php flarum cache:clear
```

### 配置webhook
1. 访问论坛后台
2. 设置 → 扩展 → FoF Webhooks
3. 添加新webhook:
   - 名称: "AI自动回复"
   - URL: `http://43.128.56.125:3000/webhooks`
   - 事件: `讨论创建`、`帖子创建`
   - 状态: 启用

### 验证
发送测试帖，检查:
- ✅ Webhook是否触发
- ✅ AI是否回复
- ✅ 日志是否正常

---

**需要我帮你安装FoF Webhooks扩展吗？**
