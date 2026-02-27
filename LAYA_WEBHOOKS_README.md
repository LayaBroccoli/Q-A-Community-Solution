# Laya AI Webhooks 扩展说明

## 📦 扩展信息

**名称**: Laya AI Webhooks
**包名**: laya/flarum-webhooks
**位置**: `/var/www/flarum/packages/laya/flarum-webhooks/`
**类型**: Flarum扩展（本地开发）
**状态**: ✅ 正常运行

---

## 🎯 功能说明

### 监听事件
```php
Flarum\Discussion\Event\Started
```
当用户在论坛创建新讨论时触发。

### Webhook目标
```
URL: http://localhost:3000/webhooks
方法: POST
格式: JSON
超时: 5秒
```

---

## 📊 Payload结构

### 请求格式
```json
{
  "event": "discussion.started",
  "payload": {
    "discussion": {
      "id": 19,
      "title": "Scene3D 和 Sprite3D 有什么区别？",
      "content": "<p>新手，搞不清 Scene3D 和 Sprite3D 的关系，求解释。</p>",
      "created_at": "2026-02-27 09:24:49"
    },
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com"
    }
  }
}
```

### Headers
```
Content-Type: application/json
User-Agent: Laya-Flarum-Webhook/1.0
```

---

## 🔄 完整流程

```
1. 用户发帖
   └─> 创建新讨论

2. Flarum触发事件
   └─> DiscussionStarted

3. Webhook监听器
   └─> Laya\Webhooks\Listener\SendWebhook

4. 构建payload
   └─> discussion + user信息

5. HTTP POST
   └─> http://localhost:3000/webhooks

6. AI服务接收
   └─> server.js: /webhooks端点

7. 加入队列
   └─> queue.add(discussionId)

8. 串行处理
   └─> processor.processDiscussion()
       ├─> 提取关键词
       ├─> MCP搜索
       ├─> AI生成
       └─> 发布回复

9. 完成回复
   └─> 用户看到AI回复
```

---

## 📂 文件结构

```
/var/www/flarum/packages/laya/flarum-webhooks/
├── composer.json          # 扩展元数据
├── extend.php            # 扩展入口（事件监听注册）
└── src/
    └── Listener/
        └── SendWebhook.php  # Webhook发送逻辑
```

---

## 🔧 关键代码

### extend.php
```php
use Flarum\Extend;
use Flarum\Discussion\Event\Started as DiscussionStarted;
use Laya\Webhooks\Listener\SendWebhook;

return [
    (new Extend\Event)
        ->listen(DiscussionStarted::class, SendWebhook::class)
];
```

### SendWebhook.php
```php
protected $webhookUrl = 'http://localhost:3000/webhooks';

public function handle(DiscussionStarted $event): void
{
    $discussion = $event->discussion;
    $user = $discussion->user;

    $payload = [
        'event' => 'discussion.started',
        'payload' => [
            'discussion' => [
                'id' => $discussion->id,
                'title' => $discussion->title,
                'content' => $discussion->firstPost->content,
                'created_at' => $discussion->created_at->toDateTimeString(),
            ],
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
            ],
        ],
    ];

    $this->sendWebhook($payload);
}
```

---

## ✅ 状态检查

### 扩展文件
```bash
ls -la /var/www/flarum/packages/laya/flarum-webhooks/
```

### 数据库
```sql
-- 扩展配置（如果有）
SELECT * FROM settings WHERE `key` LIKE 'laya%';
```

### 运行状态
```bash
# 检查webhook是否正常发送
tail -f /var/log/flarum.log | grep webhook
```

---

## 🎯 特点

### 优点
- ✅ 轻量级，只监听讨论创建事件
- ✅ 本地扩展，不依赖第三方服务
- ✅ 静默失败，不影响用户体验
- ✅ 异步发送，不阻塞论坛响应

### 缺点
- ⚠️  只支持讨论创建事件
- ⚠️  不支持帖子编辑、删除等事件
- ⚠️  错误处理较简单（静默失败）
- ⚠️  Webhook URL硬编码在代码中

---

## 🔧 可能的改进

### 1. 支持更多事件
```php
// 帖子创建
PostPosted::class

// 帖子编辑
PostRevised::class

// 讨论删除
DiscussionDeleted::class
```

### 2. 配置化
```php
// 从数据库读取webhook URL
protected function getWebhookUrl(): string
{
    return $this->settings->get('laya.webhooks.url');
}
```

### 3. 错误日志
```php
// 记录webhook失败
if ($e instanceof RequestException) {
    Log::error('Webhook failed: ' . $e->getMessage());
}
```

### 4. 重试机制
```php
// 失败后重试
protected function sendWebhookWithRetry(array $payload, int $maxRetries = 3)
{
    // 重试逻辑
}
```

---

## 📝 总结

**Laya AI Webhooks是我开发的自定义Flarum扩展**

- 位置: `/var/www/flarum/packages/laya/flarum-webhooks/`
- 功能: 监听讨论创建事件，发送webhook到AI服务
- 目标: `http://localhost:3000/webhooks`
- 状态: ✅ 正常工作

**与AI服务的集成**:
- Webhook扩展 → AI服务接收 → 队列处理 → AI回复
- 完整的自动化流程

---

**需要修改或改进这个扩展吗？**
