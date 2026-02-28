const express = require('express');
const bodyParser = require('body-parser');
const Database = require('./db');
const QuestionProcessor = require('./processor');
const { createRatingRoutes } = require('./rating-service');
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

        // 从数据库获取完整的discussion对象
        const discussions = await db.query(
          `SELECT d.id, d.title, p.content as content, u.username as username
           FROM discussions d
           JOIN posts p ON d.first_post_id = p.id
           JOIN users u ON d.user_id = u.id
           WHERE d.id = ?`,
          [discussionId]
        );

        if (discussions.length === 0) {
          console.log(`   ⚠️  讨论 #${discussionId} 不存在，跳过`);
          this.processed.delete(discussionId);
          continue;
        }

        const discussion = discussions[0];

        // 获取tags
        const tags = await db.query(
          `SELECT t.name
           FROM discussion_tag dt
           JOIN tags t ON dt.tag_id = t.id
           WHERE dt.discussion_id = ?`,
          [discussionId]
        );
        discussion.tags = tags.map(t => t.name);

        await processor.processDiscussion(discussion);

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

// CORS支持（用于Flarum前端调用）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 静态文件服务（用于前端组件）
app.use('/public', express.static('public'));

// AI评分API路由
app.use('/api', createRatingRoutes(db));

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

// ============================================
// AI评分代理端点（绕过CORS）
// ============================================

// 提交评分代理
app.post('/proxy-rating', async (req, res) => {
  try {
    let { post_id, discussion_id, rating, user_id } = req.body;

    console.log('📊 收到评分请求:', { post_id, discussion_id, rating, user_id });

    // 参数验证 - 只验证必需参数
    if (!post_id) {
      return res.status(400).json({
        success: false,
        error: '缺少帖子ID'
      });
    }

    if (!rating) {
      return res.status(400).json({
        success: false,
        error: '缺少评分类型'
      });
    }

    // 如果没有discussion_id，尝试从数据库查询
    if (!discussion_id) {
      const postResult = await db.query(
        'SELECT discussion_id FROM posts WHERE id = ?',
        [post_id]
      );
      if (postResult.length > 0) {
        discussion_id = postResult[0].discussion_id;
        console.log('✅ 从数据库查询到discussion_id:', discussion_id);
      }
    }

    const ratingTypes = {
      'helpful': 5,
      'partial': 3,
      'not_helpful': 1,
      'irrelevant': 0
    };

    if (!ratingTypes[rating]) {
      return res.status(400).json({
        success: false,
        error: '无效的评分类型: ' + rating
      });
    }

    // 检查是否已评价
    const checkQuery = user_id 
      ? 'SELECT id FROM ai_ratings WHERE post_id = ? AND user_id = ?'
      : 'SELECT id FROM ai_ratings WHERE post_id = ? AND (user_id IS NULL OR user_id = "")';
    
    const checkParams = user_id ? [post_id, user_id] : [post_id];

    const existing = await db.query(checkQuery, checkParams);

    if (existing.length > 0) {
      console.log('⚠️ 用户已评价过');
      return res.status(400).json({
        success: false,
        error: '您已经评价过该回复'
      });
    }

    // 插入评分（将undefined转为null）
    await db.query(
      `INSERT INTO ai_ratings
       (post_id, discussion_id, user_id, rating_type, rating_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [post_id, discussion_id || null, user_id || null, rating, ratingTypes[rating], req.ip]
    );

    console.log('✅ 评分已插入数据库');

    // 更新统计
    const stats = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN rating_type = 'helpful' THEN 1 ELSE 0 END) as helpful,
        SUM(CASE WHEN rating_type = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN rating_type = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful,
        SUM(CASE WHEN rating_type = 'irrelevant' THEN 1 ELSE 0 END) as irrelevant,
        AVG(rating_value) as avg_score
       FROM ai_ratings
       WHERE post_id = ?`,
      [post_id]
    );

    const stat = stats[0];

    await db.query(
      `INSERT INTO ai_rating_stats
       (post_id, discussion_id, total_ratings, helpful_count, partial_count,
        not_helpful_count, irrelevant_count, average_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_ratings = VALUES(total_ratings),
       helpful_count = VALUES(helpful_count),
       partial_count = VALUES(partial_count),
       not_helpful_count = VALUES(not_helpful_count),
       irrelevant_count = VALUES(irrelevant_count),
       average_score = VALUES(average_score)`,
      [post_id, discussion_id || null, stat.total, stat.helpful, stat.partial,
       stat.not_helpful, stat.irrelevant, stat.avg_score || 0]
    );

    console.log(`✅ 评分成功: 帖子${post_id}, ${rating}, 用户${user_id || '匿名'}`);

    res.json({
      success: true,
      message: '评分成功，感谢您的反馈！'
    });

  } catch (error) {
    console.error('评分代理错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 查询评分代理
app.get('/proxy-rating/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;

    const result = await db.query(
      'SELECT * FROM ai_rating_stats WHERE post_id = ?',
      [post_id]
    );

    if (result.length > 0) {
      res.json({ success: true, data: result[0] });
    } else {
      res.json({
        success: true,
        data: {
          post_id: parseInt(post_id),
          total_ratings: 0,
          helpful_count: 0,
          partial_count: 0,
          not_helpful_count: 0,
          irrelevant_count: 0,
          average_score: 0
        }
      });
    }
  } catch (error) {
    console.error('查询评分错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// 内部API：手动处理单个discussion（用于重新处理或调试）
app.post('/api/process-discussion', async (req, res) => {
  try {
    const { discussion_id } = req.body;

    if (!discussion_id) {
      return res.status(400).json({ success: false, error: '缺少discussion_id' });
    }

    console.log(`\n🔄 手动触发处理讨论 #${discussion_id}`);

    // 从数据库获取完整的discussion对象
    const discussions = await db.query(
      `SELECT d.id, d.title, p.content as content, u.username as username
       FROM discussions d
       JOIN posts p ON d.first_post_id = p.id
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [discussion_id]
    );

    if (discussions.length === 0) {
      return res.status(404).json({ success: false, error: '讨论不存在' });
    }

    const discussion = discussions[0];

    // 获取tags
    const tags = await db.query(
      `SELECT t.name
       FROM discussion_tag dt
       JOIN tags t ON dt.tag_id = t.id
       WHERE dt.discussion_id = ?`,
      [discussion_id]
    );
    discussion.tags = tags.map(t => t.name);

    // 处理讨论
    await processor.processDiscussion(discussion);

    res.json({
      success: true,
      message: `讨论 #${discussion_id} 处理完成`
    });
  } catch (error) {
    console.error('手动处理失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
