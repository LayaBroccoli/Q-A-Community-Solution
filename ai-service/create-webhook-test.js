const Database = require('./db');
require('dotenv').config();

async function createTestDiscussion() {
  const db = new Database();
  
  try {
    console.log('\n🧪 创建 Webhook 测试讨论\n');

    const timestamp = new Date().toLocaleString('zh-CN');
    
    // 插入帖子
    const postResult = await db.query(
      `INSERT INTO posts (discussion_id, user_id, content, created_at, is_approved, number, type)
       VALUES (0, 3, ?, NOW(), 1, 1, 'comment')`,
      [`LayaAir 中如何使用 Tween 动画实现缓动效果？测试时间: ${timestamp}`]
    );

    const postId = postResult.insertId;

    // 插入讨论
    await db.query(
      `INSERT INTO discussions (title, slug, user_id, first_post_id, comment_count, last_post_number, created_at, last_posted_at, last_posted_user_id)
       VALUES (?, ?, ?, ?, 0, 1, NOW(), NOW(), ?)`,
      ['LayaAir Tween 缓动测试', `tween-test-${Date.now()}`, 3, postId, 3]
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
    console.log('   标题: LayaAir Tween 缓动测试');
    console.log('   问题: LayaAir 中如何使用 Tween 动画？');
    console.log('   时间:', timestamp);
    console.log('\n🌐 访问: http://43.128.56.125/d/' + discussionId);
    console.log('\n⏳ Webhook 应该会自动触发...');
    console.log('💡 监控 AI 服务日志: tail -f /tmp/ai-service.log\n');

    return discussionId;

  } catch (error) {
    console.error('\n❌ 创建失败:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

createTestDiscussion();
