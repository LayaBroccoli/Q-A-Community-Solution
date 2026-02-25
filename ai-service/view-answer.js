const Database = require('./db');
require('dotenv').config();

async function viewAIAnswer() {
  const db = new Database();
  
  try {
    const posts = await db.query(
      `SELECT number, content FROM posts WHERE discussion_id = 5 AND user_id = 4`
    );

    if (posts.length > 0) {
      console.log('\n✨ AI 回复内容（讨论 #5）：\n');
      console.log('================================\n');
      console.log(posts[0].content);
      console.log('\n================================\n');
    } else {
      console.log('❌ 未找到 AI 回复');
    }
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await db.close();
  }
}

viewAIAnswer();
