const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

async function checkDiscussion8() {
  const db = new Database();
  const processor = new QuestionProcessor(db);
  
  try {
    console.log('\n🔍 检查讨论 #8\n');

    // 获取讨论
    const discussion = await db.getDiscussionById(8);
    
    if (!discussion) {
      console.log('❌ 讨论 #8 不存在\n');
      return;
    }

    console.log('✅ 讨论存在');
    console.log('   标题:', discussion.title);
    console.log('   作者:', discussion.username);
    console.log('   创建时间:', discussion.created_at);
    console.log('   内容:', discussion.content.substring(0, 100) + '...\n');

    // 检查是否有 AI 回复
    const aiPosts = await db.query(
      `SELECT COUNT(*) as count FROM posts WHERE discussion_id = 8 AND user_id = 4`
    );

    console.log('📊 AI 回复状态:');
    console.log('   已有 AI 回复:', aiPosts[0].count > 0 ? '是' : '否');

    if (aiPosts[0].count > 0) {
      console.log('\n✅ 讨论 #8 已有 AI 回复，无需处理\n');
      
      // 显示 AI 回复信息
      const aiPost = await db.query(
        `SELECT id, number, type, LENGTH(content) as len 
         FROM posts 
         WHERE discussion_id = 8 AND user_id = 4`
      );
      
      console.log('   AI 回复详情:');
      aiPost.forEach(p => {
        console.log(`     帖子 #${p.number} (ID: ${p.id}, type: ${p.type}, ${p.len} 字符)`);
      });
      console.log('');
    } else {
      console.log('\n⏳ 没有 AI 回复');
      console.log('   可能原因 1: Webhook 未触发');
      console.log('   可能原因 2: 讨论创建后还未到处理时间');
      console.log('\n正在手动处理...\n');
      
      // 手动处理
      await processor.processDiscussion(8);
      
      console.log('\n✅ AI 回复已生成\n');
    }

    // 最终验证
    const finalPosts = await db.query(
      `SELECT p.number, u.username, p.type, LENGTH(p.content) as len 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.discussion_id = 8 
       ORDER BY p.number`
    );

    console.log('📊 最终帖子列表:');
    finalPosts.forEach(p => {
      console.log(`   #${p.number} ${p.username} (type: ${p.type}): ${p.len} 字符`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

checkDiscussion8();
