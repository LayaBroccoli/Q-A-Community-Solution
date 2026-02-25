# 2026-02-25 Webhook 自动触发成功 🎉

## 🎯 里程碑事件

**时间**: 2026-02-25 11:50:10
**讨论**: #19 - "laya目前版本最新是什么"

**首次实现**: Flarum 论坛 Webhook 自动触发 AI 回复

---

## ✅ 完整流程

```
用户发帖 (11:50:10)
    ↓
Flarum DiscussionStarted 事件触发
    ↓
Laya Webhooks 扩展捕获事件
    ↓
HTTP POST → localhost:3000/webhooks
    ↓
AI 调用 Zhipu GLM-4.7 API
    ↓
AI 生成回复并插入数据库
    ↓
用户看到 AI 回复 (11:50:18, ~8秒)
```

---

## 🔧 技术实现

### Flarum 扩展

**路径**: `/var/www/flarum/packages/laya/flarum-webhooks/`

**结构**:
```
packages/laya/flarum-webhooks/
├── composer.json          ← type: flarum-extension
├── extend.php             ← 事件监听注册
└── src/Listener/
    └── SendWebhook.php    ← Webhook 发送逻辑
```

**composer.json**:
```json
{
  "name": "laya/flarum-webhooks",
  "type": "flarum-extension",
  "autoload": {
    "psr-4": {
      "Laya\\Webhooks\\": "src/"
    }
  }
}
```

**extend.php**:
```php
use Flarum\Extend;
use Flarum\Discussion\Event\Started;
use Laya\Webhooks\Listener\SendWebhook;

return [
    (new Extend\Event)
        ->listen(Started::class, SendWebhook::class)
];
```

**SendWebhook.php** (关键代码):
```php
public function handle(DiscussionStarted $event): void
{
    $discussion = $event->discussion;
    $user = $discussion->user;

    // 构建 payload（匹配 AI 服务格式）
    $payload = [
        'event' => 'discussion.started',
        'payload' => [
            'discussion' => [
                'id' => $discussion->id,
                'title' => $discussion->title,
                'content' => $discussion->firstPost ? $discussion->firstPost->content : '',
                'created_at' => $discussion->created_at->toDateTimeString(),
            ],
            'user' => [
                'id' => $user ? $user->id : 0,
                'username' => $user ? $user->username : 'Guest',
            ],
        ],
    ];

    $this->sendWebhook($payload);
}
```

### 安装命令

```bash
cd /var/www/flarum

# 1. 配置本地仓库
composer config repositories.laya path "packages/laya/*"

# 2. 安装扩展
composer require laya/flarum-webhooks *@dev

# 3. 清理缓存
php flarum cache:clear

# 4. 启用扩展
php flarum extension:enable laya-webhooks
```

---

## 🐛 关键问题修复

### 问题 1: 扩展不被识别
**原因**: 直接放在 `extensions/` 目录
**解决**: 使用 `packages/` 目录 + composer 安装

### 问题 2: Class "Log" not found
**原因**: Flarum 事件监听器不支持 Log facade
**解决**: 移除日志代码，静默处理

### 问题 3: A facade root has not been set
**原因**: Log facade 需要应用上下文
**解决**: 完全移除日志功能

### 问题 4: Webhook 未触发
**原因**: payload 格式不匹配
**原格式**: `{event, discussion, user}`
**修复**: `{event, payload: {discussion, user}}`

### 问题 5: 端点错误
**原端点**: `/webhook/discussion`（旧格式）
**修复**: `/webhooks`（新格式）

---

## 📊 AI 服务端点

**URL**: `http://localhost:3000/webhooks`

**方法**: POST

**Payload 格式**:
```json
{
  "event": "discussion.started",
  "payload": {
    "discussion": {
      "id": 19,
      "title": "问题标题",
      "content": "问题内容",
      "created_at": "2026-02-25 11:50:10"
    },
    "user": {
      "id": 1,
      "username": "用户名"
    }
  }
}
```

**响应**:
```json
{
  "received": true,
  "message": "Processing started"
}
```

---

## 📈 性能数据

**讨论 #19 测试**:
- 用户发帖: 11:50:10
- Webhook 接收: 11:50:11 (+1秒)
- AI 回复完成: 11:50:18 (+8秒)
- 回复长度: 1288 字符

**平均响应时间**: 5-10 秒

---

## 🎯 当前系统状态

### Flarum 论坛
- URL: http://43.128.56.125
- 版本: v1.8.13
- 扩展: laya-webhooks ✅ 已启用

### AI 服务
- 位置: `/root/.openclaw/workspace/Q-A-Community-Solution/ai-service/`
- 端口: 3000
- 模型: Zhipu AI GLM-4.7
- 状态: ✅ 运行中

### 测试验证
- 讨论 #5, #6: 手动触发 ✅
- 讨论 #19: Webhook 自动触发 ✅

---

## 📝 使用说明

### 用户使用流程

1. 访问论坛: http://43.128.56.125
2. 登录账号
3. 点击"开始讨论"
4. 输入标题和内容
5. 提交
6. **等待 5-10 秒**
7. **AI 自动回复出现** ✨

### 开发者调试

**查看 AI 日志**:
```bash
tail -f /tmp/ai-service.log
```

**查看 Flarum 日志**:
```bash
tail -f /var/www/flarum/storage/logs/flarum-2026-02-25.log
```

**测试 webhook**:
```bash
curl -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "event": "discussion.started",
    "payload": {
      "discussion": {"id": 999, "title": "测试"}
    }
  }'
```

---

## 🚀 下一步计划

- [ ] 添加更多事件支持（回复编辑、用户注册等）
- [ ] 实现 AI 回复质量评估
- [ ] 集成 LayaAir 官方文档
- [ ] 添加回复点赞/踩反馈
- [ ] 优化 AI prompt 工程
- [ ] 添加多轮对话支持

---

**结论**: Flarum + AI 自动问答系统已完全可用！🎉
