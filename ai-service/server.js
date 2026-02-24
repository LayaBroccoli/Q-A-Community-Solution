const express = require('express');
const bodyParser = require('body-parser');
const Database = require('./db');
const QuestionProcessor = require('./processor');
const { verifyWebhook } = require('./webhook-middleware');
require('dotenv').config();

const app = express();
const db = new Database();
const processor = new QuestionProcessor(db);
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Webhook 端点使用验证中间件
app.use('/webhook', verifyWebhook);

// Webhook 接收端点
app.post('/webhook/discussion', async (req, res) => {
  try {
    console.log('\n📬 收到 Webhook:', new Date().toISOString());

    const { event, data } = req.body;

    if (event === 'discussion.created') {
      const discussionId = data.discussion_id || data.id;
      
      if (discussionId) {
        console.log(`✅ 新讨论: ID ${discussionId}`);
        
        // 异步处理（不阻塞响应）
        processor.processDiscussion(discussionId).catch(err => {
          console.error(`处理失败:`, err.message);
        });
      }
    }

    res.json({ received: true, message: 'Processing started' });
  } catch (error) {
    console.error('❌ Webhook 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'laya-ask-ai-service',
    timestamp: new Date().toISOString()
  });
});

// 测试端点 - 获取最新讨论
app.get('/api/discussions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const discussions = await db.getNewDiscussions(limit);
    res.json({ success: true, data: discussions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 测试端点 - 获取单个讨论
app.get('/api/discussions/:id', async (req, res) => {
  try {
    const discussion = await db.getDiscussionById(req.params.id);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    res.json({ success: true, data: discussion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`\n🚀 AI 服务启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📡 Webhook 端点: http://localhost:${PORT}/webhook/discussion`);
  console.log(`\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  // 测试 AI 连接
  await processor.testAI();
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n\n👋 正在关闭服务...');
  await db.close();
  process.exit(0);
});
