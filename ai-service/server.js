const express = require('express');
const bodyParser = require('body-parser');
const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

const app = express();
const db = new Database();
const processor = new QuestionProcessor(db);
const PORT = process.env.PORT || 3000;

// 队列系统
class ProcessingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(discussionId) {
    this.queue.push(discussionId);
    console.log(`📥 队列: 加入讨论 #${discussionId}, 当前队列长度: ${this.queue.length}`);

    if (!this.processing) {
      this.process();
    }
  }

  async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      const discussionId = this.queue.shift();
      console.log(`\n⚙️  处理队列中... 剩余: ${this.queue.length}`);

      try {
        await processor.processDiscussion(discussionId);
      } catch (error) {
        console.error(`❌ 处理讨论 #${discussionId} 失败:`, error.message);
      }
    }

    console.log('\n✅ 队列处理完成');
    this.processing = false;
  }
}

const queue = new ProcessingQueue();

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Webhook 端点
app.post('/webhooks', async (req, res) => {
  try {
    console.log('\n📬 收到 Webhook:', new Date().toISOString());
    const { event, payload } = req.body;

    if (event === 'discussion.started' || event === 'post.created') {
      const discussionId = payload?.discussion?.id || payload?.post?.discussionId;
      if (discussionId) {
        console.log(`✅ 新讨论: ID ${discussionId}`);
        queue.add(discussionId);
      }
    }

    res.json({ received: true, message: 'Queued for processing' });
  } catch (error) {
    console.error('❌ Webhook 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 旧端点兼容
app.post('/webhook/discussion', async (req, res) => {
  try {
    console.log('\n📬 收到旧格式 Webhook:', new Date().toISOString());
    const { event, data } = req.body;

    if (event === 'discussion.created') {
      const discussionId = data?.discussion_id || data?.id;
      if (discussionId) {
        console.log(`✅ 新讨论: ID ${discussionId}`);
        queue.add(discussionId);
      }
    }

    res.json({ received: true, message: 'Queued for processing' });
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
    timestamp: new Date().toISOString(),
    queue: {
      length: queue.queue.length,
      processing: queue.processing
    }
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 AI 服务启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📡 Webhook 端点:`);
  console.log(`   - FoF 格式: POST http://43.128.56.125:${PORT}/webhooks`);
  console.log(`   - 自定义格式: POST http://43.128.56.125:${PORT}/webhook/discussion`);
  console.log(`\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  // 测试 AI 连接
  await processor.testAI();
});
