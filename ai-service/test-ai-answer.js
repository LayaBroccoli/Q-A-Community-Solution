const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

async function testAIAnswer() {
  console.log('🧪 测试 AI 回复功能（模拟）...\n');

  const db = new Database();
  const processor = new QuestionProcessor(db);

  try {
    // 模拟测试数据
    const discussion = {
      id: 5,
      title: 'LayaAir Hello World',
      content: 'LayaAir 中如何创建一个简单的 Hello World 程序？需要完整的代码。',
      username: 'niu'
    };

    console.log(`📝 测试讨论: ${discussion.title}`);
    console.log(`   ID: ${discussion.id}\n`);

    // 生成 AI 回答
    console.log(`\n🤖 生成 AI 回答...`);
    const result = await processor.aiService.generateAnswer(discussion);

    if (result.success) {
      console.log(`\n✅ AI 回答生成成功！`);
      console.log(`\n📄 回答内容:\n${result.answer}\n`);
      console.log(`📊 Token 使用:`, result.usage);
    } else {
      console.log(`\n❌ AI 回答生成失败: ${result.error}`);
      console.log(`\n📄 备用回答:\n${result.answer}\n`);
    }

    // 发布回答（使用正确的 post number）
    console.log(`\n📤 发布回答到论坛...`);
    
    // 手动插入 AI 回复
    const answer = result.answer;
    const insertResult = await db.query(
      `INSERT INTO posts (discussion_id, user_id, content, created_at, is_approved, number) 
       VALUES (?, 4, ?, NOW(), 1, 2)`,
      [discussion.id, answer]
    );

    // 更新讨论
    await db.query(
      `UPDATE discussions SET comment_count = comment_count + 1, last_posted_at = NOW(), last_posted_user_id = 4 WHERE id = ?`,
      [discussion.id]
    );

    // 更新用户
    await db.query(
      `UPDATE users SET comment_count = comment_count + 1 WHERE id = 4`,
      []
    );

    console.log(`   ✅ 回复已发布 (帖子 ID: ${insertResult.insertId})`);
    console.log('\n✅ 测试完成');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    await db.close();
  }
}

testAIAnswer();
