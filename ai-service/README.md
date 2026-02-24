# AI Question Answering Service

问题采集和 AI 回答服务。

## 功能

- ✅ Webhook 接收（监听新讨论）
- ✅ 数据库连接（Flarum MySQL）
- ✅ 健康检查
- ✅ API 测试端点

## 安装

```bash
npm install
```

## 配置

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

## 运行

```bash
# 生产模式
npm start

# 开发模式（自动重载）
npm run dev

# 运行测试
npm test
```

## API 端点

### Webhook
- `POST /webhook/discussion` - 接收 Flarum 新讨论通知

### API
- `GET /health` - 健康检查
- `GET /api/discussions` - 获取最新讨论
- `GET /api/discussions/:id` - 获取单个讨论详情

## 测试

运行测试脚本：

```bash
npm test
```

这会测试：
1. 健康检查端点
2. 讨论列表获取
3. Webhook 接收
4. 数据库连接

## Flarum Webhook 配置

需要在 Flarum 中安装 Webhook 扩展并配置：

1. 安装扩展
2. 配置 Webhook URL: `http://your-server:3000/webhook/discussion`
3. 选择监听事件: `discussion.created`

---

创建时间: 2026-02-24
