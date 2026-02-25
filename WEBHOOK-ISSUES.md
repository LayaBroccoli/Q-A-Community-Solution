# Flarum Webhook 集成问题总结

## 问题描述
尝试实现 Flarum 论坛的 Webhook 自动触发，让新讨论自动发送到 AI 服务并生成回复。

---

## 尝试的方案

### 方案 1: 自定义 Webhook 扩展
**路径**: `/var/www/flarum/extensions/laya-webhook/`

**实现**:
```php
// bootstrap.php
use Flarum\Extend;
use Flarum\Discussion\DiscussionWasStarted;

return [
    (new Extend\Event())->listen(function (Dispatcher $events) {
        $events->listen(DiscussionWasStarted::class, function (DiscussionWasStarted $event) {
            // 发送 webhook
        });
    }),
];
```

**问题**:
- ❌ Flarum 无法识别/加载扩展
- ❌ bootstrap.php 从未被执行
- ❌ 没有日志输出

**尝试次数**: 5 次
**结果**: 失败

---

### 方案 2: FoF Webhooks 扩展
**版本**: v1.3.3

**安装**: ✅ 成功
```bash
composer require fof/webhooks
```

**问题**:
- ❌ 只支持 3 个服务：Discord, Slack, Microsoft Teams
- ❌ 每个 service 都有严格的 URL 格式验证

**Discord URL 验证**:
```php
public static function isValidURL(string $url): bool
{
    return preg_match('/^https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\/\d+?\/.+$/', $url);
}
```

**我们的 URL**: `http://43.128.56.125:3000/webhooks`
**验证结果**: ❌ 不符合任何服务的格式要求

**数据库表**: `webhooks`
```sql
CREATE TABLE `webhooks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `service` varchar(255) NOT NULL,
  `url` varchar(511) NOT NULL,
  `events` blob NOT NULL,
  ...
);
```

**当前配置数**: 0（没有配置任何 webhook）

---

### 方案 3: 自定义扩展（进行中）
**路径**: `/var/www/flarum/extensions/laya-custom-webhook/`

**结构**:
```
laya-custom-webhook/
├── composer.json
├── bootstrap.php
└── src/
```

**状态**: ⏸️ 未完成

---

## 根本原因分析

### Flarum 扩展系统限制

1. **autoload 配置**
   - 需要在 composer.json 中正确配置 PSR-4
   - 需要运行 `composer dump-autoload`
   - 缓存可能导致扩展不被加载

2. **事件触发机制**
   - DiscussionWasStarted 事件只在通过 Web UI 创建讨论时触发
   - 数据库直接插入不会触发事件
   - 这是 Flarum 的设计，不是 bug

3. **URL 验证限制**
   - FoF Webhooks 的 URL 验证在 Adapter::isValidURL()
   - 无法绕过验证
   - 修改扩展代码会被更新覆盖

---

## 测试记录

### 讨论 #8
- **创建时间**: 8 小时前
- **创建方式**: Web UI
- **AI 回复**: ✅ 手动触发成功
- **Webhook**: ❌ 未触发
- **日志**: AI 服务没有收到任何请求

### 讨论 #10
- **标题**: webhook测试
- **创建方式**: Web UI
- **AI 回复**: ❌ 未收到
- **Webhook**: ❌ 未触发

### AI 服务日志
```
🚀 AI 服务启动成功
📡 Webhook 端点: POST http://43.128.56.125:3000/webhooks
⏰ 2026/2/25 11:02:47

🧪 测试 LLM 连接
✅ 模型: glm-4.7

📬 收到 FoF Webhook: 2026-02-25T03:03:40.290Z
```

**唯一的 Webhook 请求**: 手动测试 (curl)，不是真实事件

---

## 解决方案建议

### 选项 1: 完善 laya-custom-webhook 扩展 ⭐
参考 FoF Webhooks 的实现：

1. 创建 Listener 类
2. 在 extend.php 中正确注册
3. 使用 Dispatcher::listen()
4. 添加错误处理和日志

**优点**:
- 完全控制
- 不依赖第三方

**缺点**:
- 需要深入了解 Flarum 扩展系统
- 维护成本

### 选项 2: 修改 FoF Webhooks
添加自定义服务适配器

**优点**:
- 利用现有代码

**缺点**:
- 扩展更新会覆盖修改
- 不推荐

### 选项 3: Flarum API
通过外部脚本调用 Flarum API 创建讨论

**优点**:
- 简单直接

**缺点**:
- 不是真正的 Webhook

---

## 关键发现

### FoF Webhooks 事件监听
```php
// TriggerListener.php
public function subscribe(Dispatcher $events)
{
    $events->listen('*', [$this, 'run']);
}

public function run($name, $data)
{
    $event = Arr::get($data, 0);
    
    if (!isset($event) || !array_key_exists($name, self::$listeners)) {
        return;
    }
    
    $this->queue->push(new HandleEvent($name, $event));
}
```

**关键**: 使用 `listen('*')` 监听所有事件，然后查找匹配的处理器

### 支持的事件
- DiscussionWasStarted
- PostPosted
- UserRegistered
- 等 15+ 个事件

---

## 下一步行动

1. **短期**: 完善 laya-custom-webhook 扩展
   - 学习 FoF Webhooks 的完整实现
   - 创建正确的 Listener 和 Action 类
   - 添加管理界面（可选）

2. **中期**: 测试和优化
   - 创建测试讨论
   - 验证 Webhook 触发
   - 检查 AI 回复质量

3. **长期**: 考虑替代方案
   - 直接使用 Flarum API
   - 探索其他论坛软件
   - 自建论坛前端

---

**结论**: Webhook 自动触发功能需要更深入的开发，当前 AI 回复功能完全可用，只是需要手动触发。
