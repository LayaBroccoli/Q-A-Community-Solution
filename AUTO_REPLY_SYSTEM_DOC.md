# LayaAir 社区 AI 自动回复系统

## 📋 目录

- [系统概述](#系统概述)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [部署流程](#部署流程)
- [配置说明](#配置说明)
- [核心功能](#核心功能)
- [故障排查](#故障排查)
- [维护指南](#维护指南)

---

## 系统概述

### 功能说明

本系统实现了 LayaAir 官方论坛的 AI 自动回复功能：

1. **用户发帖** → 自动触发 webhook
2. **MCP 知识库搜索** → 获取相关文档和 API
3. **AI 生成回复** → 基于知识库内容
4. **自动发布** → 回复到论坛帖子

### 系统特点

- ✅ 完全自动化，无需人工干预
- ✅ 基于官方知识库，回答准确
- ✅ 支持 LayaAir 2.x 和 3.x 版本检测
- ✅ 防止幻觉，只使用参考资料
- ✅ 智能关键词提取，精准搜索

---

## 技术栈

### 后端服务

| 组件 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | v22.22.0 |
| 数据库 | MySQL | 8.0+ |
| 论坛系统 | Flarum | 1.8+ |
| AI 模型 | 智谱 GLM | 4.7 |

### 核心依赖

```json
{
  "axios": "^1.x",           // HTTP 客户端
  "mysql2": "^3.x",          // MySQL 驱动
  "dotenv": "^16.x",         // 环境变量管理
  "marked": "^12.x"          // Markdown 转 HTML
}
```

### 外部服务

- **MCP 知识库**: https://laya-knowledge-mcp.layaair.com/mcp
- **AI API**: https://open.bigmodel.cn/api/paas/v4

---

## 系统架构

### 架构图

```
┌─────────────┐
│  用户发帖    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Flarum Webhook     │
│  (laya-webhooks)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  AI Service Server  │
│  (Node.js:3000)     │
└──────┬──────────────┘
       │
       ├──────────┬──────────┐
       ▼          ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  MySQL  │ │   MCP   │ │  GLM    │
   │  数据库  │ │ 知识库   │ │  AI    │
   └─────────┘ └─────────┘ └─────────┘
       │
       ▼
┌─────────────────────┐
│  自动发布 AI 回复    │
└─────────────────────┘
```

### 目录结构

```
/root/.openclaw/workspace/Q-A-Community-Solution/
├── ai-service/
│   ├── server.js              # Webhook 服务器
│   ├── processor.js           # 问题处理器
│   ├── ai-service.js          # AI 服务
│   ├── mcp-client.js          # MCP 客户端
│   ├── db.js                  # 数据库操作
│   ├── .env                   # 环境变量配置
│   └── server.log             # 运行日志
└── flarum/
    ├── vendor/                # Flarum 核心文件
    ├── composer.json          # 依赖管理
    └── config.php             # Flarum 配置
```

---

## 部署流程

### 1. 环境准备

#### 系统要求

- Linux 服务器（推荐 CentOS/Ubuntu）
- Node.js 18+
- MySQL 8.0+
- PHP 8.1+
- Composer

#### 安装 Node.js

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

### 2. Flarum 论坛部署

#### 安装 Flarum

```bash
# 下载 Flarum
composer create-project flarum/flarum /var/www/flarum

# 配置权限
cd /var/www/flarum
chmod -R 755 .
chown -R www-data:www-data .

# 配置 Nginx
server {
    listen 80;
    root /var/www/flarum/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

#### 安装 Webhook 扩展

```bash
cd /var/www/flarum
composer require laya/flarum-webhooks:@dev
php flarum cache:clear
```

#### 配置 Webhook

在 Flarum 后台配置 Webhook：

1. 进入 **管理面板 → 扩展 → Webhooks**
2. 添加新 Webhook：
   - **URL**: `http://43.128.56.125:3000/webhooks`
   - **事件**: `DiscussionCreated`
   - **Secret**: `laya-ask-webhook-secret-2026`

### 3. AI 服务部署

#### 安装依赖

```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
npm init -y
npm install axios mysql2 dotenv marked
```

#### 配置环境变量

创建 `.env` 文件：

```bash
# 服务端口
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=flarum
DB_PASSWORD=your_password
DB_NAME=flarum

# Flarum URL
FLARUM_URL=http://your-forum-url.com

# Webhook Secret
WEBHOOK_SECRET=laya-ask-webhook-secret-2026

# AI API 配置（智谱 GLM）
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4.7

# AI 用户 ID
AI_USER_ID=4

# MCP 配置
LAYA_MCP_URL=https://laya-knowledge-mcp.layaair.com/mcp
LAYA_PRE_VERSION=v3.3.5
LAYA_VERSION=v3.3.5
LAYA_ALLOWED_DATASETS=LayaAir
LAYA_MCP_API_KEY=layamcp-aef3a912-2712-4cf2-9544-0d8d389d20f9
```

#### 启动服务

```bash
# 启动服务
node server.js

# 后台运行
nohup node server.js > server.log 2>&1 &

# 查看日志
tail -f server.log
```

#### 配置开机自启（可选）

创建 systemd 服务：

```bash
# /etc/systemd/system/laya-ai.service
[Unit]
Description=LayaAir AI Auto Reply Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/Q-A-Community-Solution/ai-service
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
systemctl daemon-reload
systemctl enable laya-ai
systemctl start laya-ai
```

---

## 配置说明

### 关键配置参数

#### AI 超时设置

```javascript
// ai-service.js
const completion = await this.client.chat.completions.create({
  model: this.model,
  messages: [...],
  timeout: 180000  // 180秒超时（适配慢响应）
});
```

#### MCP 超时设置

```javascript
// mcp-client.js
this.axios = axios.create({
  timeout: 120000  // 120秒超时
});
```

#### 队列处理

```javascript
// server.js
// 防止并发处理，使用队列机制
const queue = new ProcessingQueue(processor);
```

### 数据库配置

#### 创建 AI 用户

```sql
-- 插入 AI 用户
INSERT INTO users (id, username, email, password, is_email_confirmed)
VALUES (4, 'AI助手', 'ai@layaair.com', '', 1);
```

---

## 核心功能

### 1. 智能关键词提取

```javascript
extractSearchQuery(title, content) {
  // 提取 API 名称
  const apiNames = text.match(/[A-Z][a-zA-Z0-9_]*/g) || [];
  // 去重并返回前3个
  return [...new Set(apiNames)].slice(0, 3).join(' ');
}
```

### 2. MCP 知识库搜索

```javascript
// 文档搜索
const docs = await mcpClient.searchDocumentation('Sprite3D');

// API 搜索
const apis = await mcpClient.searchCode('Sprite3D');
```

### 3. AI 回复生成

```javascript
const prompt = buildPrompt(question, mcpContext);
const answer = await aiClient.generateAnswer(prompt);
```

### 4. 自动发布

```javascript
// 插入帖子
INSERT INTO posts (discussion_id, user_id, content, ...)

// 更新讨论
UPDATE discussions SET comment_count = comment_count + 1

// 更新用户
UPDATE users SET comment_count = comment_count + 1
```

---

## 故障排查

### 常见问题

#### 1. AI 回复被截断

**原因**: AI 生成过程中被新 webhook 中断

**解决**:
- ✅ 已添加队列机制防止并发
- ✅ 增加 AI 超时时间到 180 秒

#### 2. MCP 知识库搜索无结果

**原因**: 搜索关键词太复杂或包含 HTML 标签

**解决**:
- ✅ 实现智能关键词提取
- ✅ 优先提取 API 名称

#### 3. FoF Webhooks 错误

**错误**: `TypeError: in_array(): Argument #2 must be of type array`

**解决**:
```bash
# 删除有问题的扩展
composer remove fof/webhooks
composer dump-autoload
php flarum cache:clear
```

#### 4. 数据库连接失败

**检查**:
```bash
# 测试 MySQL 连接
mysql -hlocalhost -uflarum -p flarum

# 检查 .env 配置
cat /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/.env
```

### 日志分析

#### 查看实时日志

```bash
tail -f /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log
```

#### 搜索错误

```bash
grep "错误\|失败\|Error" /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log
```

#### 查看特定讨论

```bash
grep "讨论 #XXX" /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log
```

---

## 维护指南

### 日常维护

#### 1. 检查服务状态

```bash
# 检查 AI 服务
ps aux | grep "server.js"

# 检查 Webhook 服务
curl http://localhost:3000/health
```

#### 2. 监控日志

```bash
# 查看最近100行
tail -100 server.log

# 统计今日处理量
grep "处理完成" server.log | wc -l
```

#### 3. 数据库备份

```bash
# 备份 Flarum 数据库
mysqldump -uflarum -p flarum > backup_$(date +%Y%m%d).sql
```

### 更新升级

#### 更新依赖

```bash
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
npm update
```

#### 更新 Flarum

```bash
cd /var/www/flarum
composer update
php flarum cache:clear
```

### 性能优化

#### 1. 数据库索引

```sql
-- 为常用查询添加索引
CREATE INDEX idx_posts_discussion_user ON posts(discussion_id, user_id);
CREATE INDEX idx_discussions_created ON discussions(created_at);
```

#### 2. Redis 缓存（可选）

```bash
# 安装 Redis
apt install redis-server

# 配置缓存
npm install redis
```

---

## 系统监控

### 关键指标

| 指标 | 正常值 | 告警阈值 |
|------|--------|----------|
| AI 响应时间 | <90秒 | >180秒 |
| MCP 响应时间 | <10秒 | >30秒 |
| Webhook 处理率 | 100% | <95% |
| 服务可用性 | 99.9% | <99% |

### 监控脚本

```bash
#!/bin/bash
# check_ai_service.sh

# 检查服务状态
if ! ps aux | grep -v grep | grep "server.js" > /dev/null; then
    echo "AI 服务未运行，正在重启..."
    cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service
    nohup node server.js > server.log 2>&1 &
    echo "服务已重启"
fi

# 检查最近错误
errors=$(grep -c "错误\|失败" server.log)
if [ $errors -gt 10 ]; then
    echo "警告: 发现 $errors 个错误"
fi
```

---

## 安全建议

### 1. API 密钥保护

```bash
# 设置 .env 权限
chmod 600 /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/.env
```

### 2. Webhook 验证

```javascript
// server.js
const signature = req.headers['x-webhook-signature'];
if (signature !== expectedSignature) {
    return res.status(401).send('Unauthorized');
}
```

### 3. 数据库权限

```sql
-- 创建只读用户（用于查询）
CREATE USER 'flarum_read'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT ON flarum.* TO 'flarum_read'@'localhost';
```

---

## 联系支持

### 技术栈版本

- **Node.js**: v22.22.0
- **Flarum**: 1.8.x
- **MySQL**: 8.0+
- **智谱 GLM**: 4.7

### 相关链接

- Flarum 官方文档: https://docs.flarum.org/
- 智谱 AI 开放平台: https://open.bigmodel.cn/
- LayaAir 官网: https://layaair.com/

---

**文档版本**: 1.0
**最后更新**: 2026-02-27
**维护者**: AI Assistant
