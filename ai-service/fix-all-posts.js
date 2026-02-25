const Database = require('./db');
require('dotenv').config();

async function fixAllPosts() {
  const db = new Database();
  
  try {
    console.log('\n🔧 修复所有帖子的 type 字段\n');

    // 检查 NULL 的帖子
    const nullPosts = await db.query(
      `SELECT COUNT(*) as count FROM posts WHERE type IS NULL`
    );

    console.log(`发现 ${nullPosts[0].count} 个 type=NULL 的帖子`);

    if (nullPosts[0].count > 0) {
      console.log('\n正在修复...');
      
      await db.query(
        `UPDATE posts SET type = 'comment' WHERE type IS NULL`
      );

      console.log('✅ 已将所有帖子的 type 设置为 "comment"\n');
    } else {
      console.log('✅ 所有帖子的 type 都正常\n');
    }

    // 检查讨论的 last_post_number
    const brokenDiscussions = await db.query(
      `SELECT d.id, d.title, d.last_post_number, 
              (SELECT MAX(number) FROM posts WHERE discussion_id = d.id) as max_number
       FROM discussions d
       WHERE d.last_post_number IS NULL 
          OR d.last_post_number != (SELECT MAX(number) FROM posts WHERE discussion_id = d.id)`
    );

    if (brokenDiscussions.length > 0) {
      console.log(`发现 ${brokenDiscussions.length} 个需要修复的讨论:\n`);

      for (const disc of brokenDiscussions) {
        console.log(`讨论 #${disc.id}: ${disc.title}`);
        console.log(`  当前 last_post_number: ${disc.last_post_number}`);
        console.log(`  正确 last_post_number: ${disc.max_number}`);
        
        await db.query(
          `UPDATE discussions SET last_post_number = ? WHERE id = ?`,
          [disc.max_number, disc.id]
        );
        
        console.log(`  ✅ 已修复\n`);
      }
    } else {
      console.log('✅ 所有讨论的 last_post_number 都正常\n');
    }

    console.log('✅✅✅ 全部修复完成\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

fixAllPosts();
