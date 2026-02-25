const Database = require('./db');
require('dotenv').config();

async function checkAndFixDiscussion() {
  const db = new Database();
  
  try {
    console.log('\n🔧 检查和修复讨论数据\n');

    // 检查讨论 #5
    const discussion = await db.query(
      `SELECT id, title, comment_count, last_post_number 
       FROM discussions WHERE id = 5`
    );

    console.log('讨论信息:');
    console.log(`  ID: ${discussion[0].id}`);
    console.log(`  标题: ${discussion[0].title}`);
    console.log(`  回复数: ${discussion[0].comment_count}`);
    console.log(`  最后帖子序号: ${discussion[0].last_post_number}\n`);

    // 检查帖子
    const posts = await db.query(
      `SELECT id, number, user_id, is_approved 
       FROM posts 
       WHERE discussion_id = 5 
       ORDER BY number`
    );

    console.log('帖子列表:');
    posts.forEach(p => {
      console.log(`  #${p.number} (ID: ${p.id}, 用户: ${p.user_id}, 审核: ${p.is_approved})`);
    });
    console.log('');

    // 检查并修复 last_post_number
    const maxNumber = await db.query(
      `SELECT MAX(number) as max_number FROM posts WHERE discussion_id = 5`
    );

    const correctLastNumber = maxNumber[0].max_number || 0;
    const currentLastNumber = discussion[0].last_post_number || 0;

    console.log(`当前 last_post_number: ${currentLastNumber}`);
    console.log(`正确 last_post_number: ${correctLastNumber}`);

    if (currentLastNumber !== correctLastNumber) {
      console.log('\n⚠️  检测到不一致，正在修复...');
      
      await db.query(
        `UPDATE discussions SET last_post_number = ? WHERE id = 5`,
        [correctLastNumber]
      );

      console.log('✅ 已修复\n');
    } else {
      console.log('\n✅ 数据一致，无需修复\n');
    }

    // 检查 comment_count
    const postCount = await db.query(
      `SELECT COUNT(*) as count FROM posts WHERE discussion_id = 5 AND number > 1`
    );

    const correctCommentCount = postCount[0].count;
    const currentCommentCount = discussion[0].comment_count;

    console.log(`当前 comment_count: ${currentCommentCount}`);
    console.log(`正确 comment_count: ${correctCommentCount}`);

    if (currentCommentCount !== correctCommentCount) {
      console.log('\n⚠️  检测到不一致，正在修复...');
      
      await db.query(
        `UPDATE discussions SET comment_count = ? WHERE id = 5`,
        [correctCommentCount]
      );

      console.log('✅ 已修复\n');
    } else {
      console.log('\n✅ 数据一致，无需修复\n');
    }

    // 最终验证
    const final = await db.query(
      `SELECT id, title, comment_count, last_post_number 
       FROM discussions WHERE id = 5`
    );

    console.log('最终状态:');
    console.log(`  ID: ${final[0].id}`);
    console.log(`  标题: ${final[0].title}`);
    console.log(`  回复数: ${final[0].comment_count}`);
    console.log(`  最后帖子序号: ${final[0].last_post_number}\n`);

    console.log('✅✅✅ 检查完成\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

checkAndFixDiscussion();
