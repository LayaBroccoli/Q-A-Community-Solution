const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

async function checkAndProcess() {
  const db = new Database();
  const processor = new QuestionProcessor(db);
  
  try {
    console.log('\n🔍 检查讨论 #6\n');

    // 获取讨论
    const discussion = await db.getDiscussionById(6);
    
    if (!discussion) {
      console.log('❌ 讨论 #6 不存在\n');
      return;
    }

    console.log('✅ 讨论存在');
    console.log('   标题:', discussion.title);
    console.log('   作者:', discussion.username);
    console.log('   内容:', discussion.content.substring(0, 100) + '...\n');

    // 检查是否有 AI 回复
    const aiPosts = await db.query(
      `SELECT COUNT(*) as count FROM posts WHERE discussion_id = 6 AND user_id = 4`
    );

    if (aiPosts[0].count > 0) {
      console.log('✅ 已有 AI 回复，无需处理\n');
    } else {
      console.log('⏳ 没有 AI 回复，开始生成...\n');
      
      // 处理讨论
      await processor.processDiscussion(6);
      
      console.log('\n✅ AI 回复已生成\n');
    }

    // 验证
    const finalPosts = await db.query(
      `SELECT p.number, u.username, LENGTH(p.content) as len 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.discussion_id = 6 
       ORDER BY p.number`
    );

    console.log('📊 最终帖子列表:');
    finalPosts.forEach(p => {
      console.log(`   #${p.number} ${p.username}: ${p.len} 字符`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

checkAndProcess();
