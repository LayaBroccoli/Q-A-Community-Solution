const express = require('express');
const bodyParser = require('body-parser');
const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

const app = express();
const db = new Database();
const processor = new QuestionProcessor(db);
const PORT = process.env.PORT || 3000;

// 队列系统 - 严格串行处理
class ProcessingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.processed = new Set(); // 记录已处理的讨论ID
  }

  async add(discussionId) {
    // 检查是否已经在队列中
    if (this.queue.includes(discussionId)) {
      console.log(`⏭️  讨论 #${discussionId} 已在队列中，跳过`);
      return;
    }

    // 检查是否正在处理
    if (this.processed.has(discussionId)) {
      console.log(`⏭️  讨论 #${discussionId} 已处理过，跳过`);
      return;
    }

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
        // 标记为正在处理
        this.processed.add(discussionId);

        await processor.processDiscussion(discussionId);

        console.log(`✅ 讨论 #${discussionId} 处理完成`);
      } catch (error) {
        console.error(`❌ 处理讨论 #${discussionId} 失败:`, error.message);

        // 从已处理集合中移除，允许重试
        this.processed.delete(discussionId);

        // 可以选择重新加入队列重试
        // this.queue.push(discussionId);
      }

      // 处理完一个后，等待一小段时间再处理下一个
      // 避免连续快速请求导致资源紧张
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ 队列处理完成');
    this.processing = false;

    // 清理已处理集合（保留最近100个）
    if (this.processed.size > 100) {
      const entries = Array.from(this.processed);
      this.processed = new Set(entries.slice(-100));
    }
  }

  // 获取队列状态
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      processedCount: this.processed.size
    };
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
  const queueStatus = queue.getStatus();

  res.json({
    status: 'ok',
    service: 'laya-ask-ai-service',
    timestamp: new Date().toISOString(),
    queue: {
      length: queueStatus.queueLength,
      processing: queueStatus.processing,
      processedCount: queueStatus.processedCount,
      message: queueStatus.processing
        ? `正在处理，剩余 ${queueStatus.queueLength} 个讨论`
        : queueStatus.queueLength > 0
        ? `队列中有 ${queueStatus.queueLength} 个讨论等待处理`
        : '队列空闲'
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
