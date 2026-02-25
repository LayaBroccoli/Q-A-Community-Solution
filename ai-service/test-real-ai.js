const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

async function testRealAI() {
  console.log('🧪 测试真实 AI 回复...\n');

  const db = new Database();
  const processor = new QuestionProcessor(db);

  try {
    // 使用现有讨论 ID 5
    const discussionId = 5;
    
    // 删除旧的 AI 回复
    console.log('🗑️  清理旧的 AI 回复...\n');
    await db.query(
      `DELETE FROM posts WHERE discussion_id = ? AND user_id = 4 AND number > 1`,
      [discussionId]
    );

    // 重置评论数
    await db.query(
      `UPDATE discussions SET comment_count = 0 WHERE id = ?`,
      [discussionId]
    );

    console.log(`✅ 准备处理讨论 #${discussionId}\n`);
    console.log('⏳ 调用 AI 生成回复...\n');

    // 处理讨论（生成 AI 回复）
    await processor.processDiscussion(discussionId);

    console.log('\n✅ 测试完成\n');
    console.log('查看讨论: http://43.128.56.125/d/' + discussionId + '\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    await db.close();
  }
}

testRealAI();
