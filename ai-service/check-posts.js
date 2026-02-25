const Database = require('./db');
require('dotenv').config();

async function checkPosts() {
  const db = new Database();
  
  try {
    console.log('\n📊 检查讨论 #5 的所有帖子：\n');
    
    const posts = await db.query(
      `SELECT id, number, user_id, is_approved, LENGTH(content) as len, content
       FROM posts WHERE discussion_id = 5 ORDER BY number`
    );

    console.log(`总共 ${posts.length} 个帖子\n`);

    posts.forEach((post, index) => {
      console.log(`帖子 #${index + 1} (ID: ${post.id}, 序号: ${post.number}):`);
      console.log(`  用户ID: ${post.user_id}`);
      console.log(`  已审核: ${post.is_approved ? '是' : '否'}`);
      console.log(`  长度: ${post.len} 字符`);
      console.log(`  内容预览: ${post.content.substring(0, 100)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await db.close();
  }
}

checkPosts();
