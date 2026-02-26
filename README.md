# 🤖 LayaAir AI Q&A 社区

基于 **Flarum** 的 LayaAir AI 自动回复社区，集成 MCP 知识库，实现智能技术支持。

![Version](https://img.shields.io/badge/version-v2.1-brightgreen)
![Status](https://img.shields.io/badge/status-production--ready-blue)
![Data](https://img.shields.io/badge/data--driven-orange)

---

## 🎯 项目特性

### 🌟 核心亮点

- ⭐ **数据驱动优化** - 基于 100 条论坛真实帖子分析
- ⭐ **幻觉防御五层机制** - 彻底解决 AI 编造问题
- ⭐ **5 个场景策略** - 覆盖所有问题类型
- ⭐ **版本自动路由** - 自动识别 2.x/3.x
- ⭐ **代码差异化** - 论坛人工回复仅 3% 含代码，AI 100% 提供

### 📊 数据驱动

| 数据 | 占比 | 策略 |
|------|------|------|
| **3%** | 人工回复含代码 | 代码是 AI 的核心竞争力 |
| **8%** | 功能暂不支持 | 专门场景 5 |
| **22%** | Native 打包 | MCP 优先级 P0 |
| **20%** | 新 UI 系统 | MCP 优先级 P0 |
| **11%** | Spine/骨骼动画 | MCP 优先级 P0 |

---

## 🚀 快速开始

### 前置要求

- Node.js v22+
- MySQL 8.0+
- Flarum v1.8+
- OpenAI API 兼容接口

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/LayaBroccoli/Q-A-Community-Solution.git
cd Q-A-Community-Solution

# 2. 安装依赖
cd ai-service
npm install

# 3. 配置环境
cp .env.example .env
vi .env

# 4. 启动服务
nohup node server.js > /tmp/ai-service.log 2>&1 &
```

### 配置 Flarum

```bash
# 1. 安装 Webhook 扩展
cd /var/www/flarum/packages/laya/flarum-webhooks
composer install

# 2. 配置 Webhook URL
php flarum cache:clear
```

---

## 📁 项目结构

```
Q-A-Community-Solution/
├── ai-service/                 # AI 服务
│   ├── server.js               # Express 服务器
│   ├── ai-service.js           # v2.1 主文件
│   ├── mcp-client.js           # MCP 客户端
│   ├── processor.js            # 问题处理器
│   ├── db.js                   # 数据库操作
│   └── .env                    # 环境配置
├── AI-SPEC-v2.1-FINAL.md       # v2.1 完整规范
├── IMPLEMENTATION-v2.1.md       # 实施指南
└── PROJECT-COMPLETE-v2.1.md    # 完成报告
```

---

## 🧪 测试

```bash
# 运行测试
cd ai-service
node test-v21.js

# 查看结果
✅ v2.1 已准备就绪！
```

---

## 📊 性能指标

| 指标 | 数值 | 状态 |
|------|------|------|
| 响应时间 | ~8-10 秒 | 🟡 需优化 |
| 回复质量 | 93/100 | ✅ 优秀 |
| 结构完整性 | 100% | ✅ 完美 |
| 代码示例 | 100%（有 MCP） | ✅ 完美 |

---

## 📝 文档

- [AI-SPEC-v2.1-FINAL.md](AI-SPEC-v2.1-FINAL.md) - 完整规范
- [IMPLEMENTATION-v2.1.md](IMPLEMENTATION-v2.1.md) - 实施指南
- [PROJECT-COMPLETE-v2.1.md](PROJECT-COMPLETE-v2.1.md) - 完成报告

---

## 🎯 5 个场景策略

| 场景 | 策略 | 示例 |
|------|------|------|
| 1. 概念解释 | 定义+特性+代码 | 什么是 Sprite？ |
| 2. 如何操作 | 步骤+代码+注意 | 如何创建动画？ |
| 3. 问题排查 | 原因+排查+修复 | Sprite 不显示？ |
| 4. 高级功能 | 概述+用法+API | IK 功能如何用？ |
| 5. 暂不支持 | **状态+替代+代码** | 点云渲染支持吗？ |

---

## 🔧 维护

### 启动服务
```bash
cd ai-service
nohup node server.js > /tmp/ai-service.log 2>&1 &
```

### 查看日志
```bash
tail -f /tmp/ai-service.log
```

### 重启服务
```bash
pkill -f "node.*server.js"
# 然后重新启动
```

---

## 📈 路线图

### v2.1 (当前) ✅
- 数据驱动优化（100 条帖子）
- 5 个场景策略
- 幻觉防御五层机制
- 版本自动路由

### v2.2（计划中）
- 优化响应时间（< 15 秒）
- 扩展 MCP 知识库（P0 模块）
- 实现回复缓存

### v3.0（未来）
- A/B 测试
- 用户反馈机制
- 多模型支持

---

## 📞 支持

- **论坛**: http://43.128.56.125
- **GitHub**: https://github.com/LayaBroccoli/Q-A-Community-Solution
- **Issues**: https://github.com/LayaBroccoli/Q-A-Community-Solution/issues

---

## 📄 许可证

MIT License

---

## 🎉 致谢

- LayaAir 团队
- Flarum 社区
- MCP 标准团队

---

**状态**: 🟢 Production Ready
**版本**: v2.1
**最后更新**: 2026-02-26
