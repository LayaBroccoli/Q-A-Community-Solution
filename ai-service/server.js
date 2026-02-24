const express = require('express');
const bodyParser = require('body-parser');
const Database = require('./db');
require('dotenv').config();

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Webhook 接收端点
app.post('/webhook/discussion', async (req, res) => {
  try {
    console.log('\n📬 收到 Webhook:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    if (event === 'discussion.created') {
      // 处理新讨论
      const discussionId = data.discussion_id || data.id;
      
      if (discussionId) {
        console.log(`\n✅ 新讨论创建: ID ${discussionId}`);
        
        // 获取完整讨论信息
        const discussion = await db.getDiscussionById(discussionId);
        
        if (discussion) {
          console.log('\n📋 讨论详情:');
          console.log(`  标题: ${discussion.title}`);
          console.log(`  作者: ${discussion.username}`);
          console.log(`  内容: ${discussion.content.substring(0, 100)}...`);
          
          // 存储到待处理队列
          // TODO: 实现队列存储
        }
      }
    }

    res.json({ received: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Webhook 处理错误:', error);
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
app.listen(PORT, () => {
  console.log(`\n🚀 AI 服务启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📡 Webhook 端点: http://localhost:${PORT}/webhook/discussion`);
  console.log(`\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  // 启动问题采集器
  const QuestionCollector = require('./collector');
  const collector = new QuestionCollector(db);
  collector.start();
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n\n👋 正在关闭服务...');
  await db.close();
  process.exit(0);
});
