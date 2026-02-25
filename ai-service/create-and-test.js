const Database = require('./db');
require('dotenv').config();

async function createNewTest() {
  const db = new Database();
  
  try {
    console.log('\n🧪 创建新的测试讨论...\n');

    // 插入新帖子
    const postResult = await db.query(
      `INSERT INTO posts (discussion_id, user_id, content, created_at, is_approved, number)
       VALUES (0, 3, ?, NOW(), 1, 1)`,
      ['LayaAir 中如何加载图片资源？需要完整的加载和显示代码。']
    );

    const postId = postResult.insertId;

    // 插入讨论
    await db.query(
      `INSERT INTO discussions (title, slug, user_id, first_post_id, comment_count, created_at, last_posted_at, last_posted_user_id)
       VALUES (?, ?, ?, ?, 0, NOW(), NOW(), ?)`,
      ['LayaAir 图片加载', 'layaair-image-load', 3, postId, 3]
    );

    // 获取讨论 ID
    const discResult = await db.query(
      `SELECT id FROM discussions WHERE first_post_id = ?`,
      [postId]
    );

    const discussionId = discResult[0].id;

    // 更新帖子的 discussion_id
    await db.query(
      `UPDATE posts SET discussion_id = ? WHERE id = ?`,
      [discussionId, postId]
    );

    // 更新用户
    await db.query(
      `UPDATE users SET discussion_count = discussion_count + 1, comment_count = comment_count + 1 WHERE id = 3`,
      []
    );

    console.log('✅ 测试讨论已创建');
    console.log('   ID:', discussionId);
    console.log('   标题: LayaAir 图片加载');
    console.log('   内容: LayaAir 中如何加载图片资源？');
    console.log('\n🌐 访问: http://43.128.56.125/d/' + discussionId);
    console.log('\n⏳ 等待 AI 自动回复（需要 Webhook 触发）...\n');

    // 手动触发处理
    console.log('📡 手动触发 AI 回复...\n');
    
    const QuestionProcessor = require('./processor');
    const processor = new QuestionProcessor(db);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await processor.processDiscussion(discussionId);

    console.log('\n✅ 测试完成');
    console.log('🌐 查看: http://43.128.56.125/d/' + discussionId + '\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    await db.close();
  }
}

createNewTest();
