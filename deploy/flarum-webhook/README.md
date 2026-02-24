# Flarum Webhook 扩展

自动发送新讨论到 AI 服务的 Flarum 扩展。

## 功能

- ✅ 监听新讨论创建事件
- ✅ 自动发送 Webhook 到 AI 服务
- ✅ 包含完整的讨论信息
- ✅ 错误日志记录

## 安装

扩展已安装在：`/var/www/flarum/extensions/laya-webhook/`

## 配置

Webhook URL: `http://localhost:3000/webhook/discussion`

可在 `bootstrap.php` 中修改：
```php
$webhookUrl = 'http://localhost:3000/webhook/discussion';
```

## 事件

监听的事件：
- `DiscussionWasStarted` - 新讨论创建时

## Webhook 数据格式

```json
{
  "event": "discussion.created",
  "data": {
    "discussion_id": 1,
    "title": "讨论标题",
    "content": "讨论内容",
    "user_id": 3,
    "username": "用户名",
    "created_at": "2026-02-24 12:00:00"
  }
}
```

## 测试

### 通过 Web 界面测试

1. 访问论坛：http://43.128.56.125
2. 登录账号
3. 点击 "开始讨论"
4. 发表新帖
5. 查看 AI 服务日志：`tail -f /tmp/ai-service.log`

### 通过 PHP 脚本测试

```bash
cd /var/www/flarum
php test-webhook.php
```

## 日志

Webhook 发送日志会记录到 Flarum 错误日志：
```bash
tail -f /var/www/flarum/storage/logs/flarum-*.log
```

## 文件结构

```
laya-webhook/
├── composer.json              # 扩展配置
├── bootstrap.php              # 事件监听（主要逻辑）
└── src/
    └── Listeners/
        └── SendWebhook.php    # 备用实现
```

---

创建时间: 2026-02-24
