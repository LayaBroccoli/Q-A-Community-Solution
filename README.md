# Q&A Community AI Assistant

LayaAir论坛的AI自动回复助手，基于知识库提供智能问答，支持用户评分反馈。

## ✨ 特性

- 🤖 **AI自动回复** - 基于LayaAir官方知识库
- 📊 **用户评分系统** - 收集反馈，优化质量
- 🎯 **智能分类** - 6种帖子类型，精准回复策略
- 🛡️ **幻觉防御** - 5层保护机制
- 🎨 **Flarum集成** - 无缝集成到现有论坛

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- MySQL >= 5.7
- Flarum论坛

### 安装

1. **克隆仓库**
```bash
git clone https://github.com/LayaBroccoli/Q-A-Community-Solution.git
cd Q-A-Community-Solution
```

2. **安装依赖**
```bash
cd ai-service
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env，配置数据库和AI模型
```

4. **初始化数据库**
```bash
mysql -u root -p < ai-service/migrations/create_rating_tables.sql
```

5. **启动服务**
```bash
node server.js
```

## 📚 文档

- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 完整项目总结
- [RATING_SYSTEM_DESIGN.md](RATING_SYSTEM_DESIGN.md) - 评分系统设计
- [FLARUM_INTEGRATION_GUIDE.md](FLARUM_INTEGRATION_GUIDE.md) - Flarum集成指南

## 🔧 技术栈

- **后端**: Node.js, Express, MySQL
- **AI**: GLM-4.7
- **知识库**: LayaAir MCP服务
- **前端**: Flarum论坛

## 📄 许可证

MIT
