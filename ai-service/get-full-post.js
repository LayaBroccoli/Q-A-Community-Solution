const Database = require('./db');
require('dotenv').config();

async function getFullPost() {
  const db = new Database();
  
  try {
    const post = await db.query(
      `SELECT content FROM posts WHERE id = 16`
    );

    if (post.length > 0) {
      console.log('\n📄 AI 回复完整内容（帖子 ID 16）：\n');
      console.log('='.repeat(80));
      console.log(post[0].content);
      console.log('='.repeat(80));
      console.log('\n✅ 帖子已存在\n');
    } else {
      console.log('❌ 帖子不存在\n');
    }

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await db.close();
  }
}

getFullPost();
