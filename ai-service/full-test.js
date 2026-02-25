const Database = require('./db');
const QuestionProcessor = require('./processor');
require('dotenv').config();

async function fullTest() {
  const db = new Database();
  const processor = new QuestionProcessor(db);
  
  try {
    console.log('\n🧪 完整测试：创建讨论 → AI 回复 → 验证显示\n');

    // 步骤 1: 使用现有讨论 #5
    const discussionId = 5;
    console.log('📝 步骤 1: 使用现有讨论 #' + discussionId);
    console.log('   标题: LayaAir Hello World\n');

    // 步骤 2: 检查现有帖子
    console.log('📊 步骤 2: 检查现有帖子...');
    const posts = await db.query(
      `SELECT id, number, user_id, LENGTH(content) as len FROM posts WHERE discussion_id = ? ORDER BY number`,
      [discussionId]
    );
    
    console.log(`   找到 ${posts.length} 个帖子:`);
    posts.forEach(p => {
      console.log(`   - 序号 ${p.number}, 用户ID ${p.user_id}, ${p.len} 字符`);
    });
    console.log('');

    // 步骤 3: 检查是否有 AI 回复
    const hasAI = posts.some(p => p.user_id === 4);
    
    if (hasAI) {
      console.log('✅ 步骤 3: 已有 AI 回复');
      console.log('   AI 回复已存在，无需重新生成\n');
      
      // 显示 AI 回复内容
      const aiPost = posts.find(p => p.user_id === 4);
      const aiContent = await db.query(
        `SELECT content FROM posts WHERE id = ?`,
        [aiPost.id]
      );
      
      console.log('📄 AI 回复内容（前 500 字符）:');
      console.log('   ' + aiContent[0].content.substring(0, 500) + '...\n');
      
    } else {
      console.log('⏳ 步骤 3: 没有 AI 回复，开始生成...');
      
      // 生成 AI 回复
      await processor.processDiscussion(discussionId);
      
      console.log('');
      console.log('✅ AI 回复已生成\n');
    }

    // 步骤 4: 验证数据库
    console.log('📊 步骤 4: 验证数据库状态...');
    const finalPosts = await db.query(
      `SELECT id, number, user_id, is_approved FROM posts WHERE discussion_id = ? ORDER BY number`,
      [discussionId]
    );
    
    console.log(`   总帖子数: ${finalPosts.length}`);
    finalPosts.forEach(p => {
      const status = p.is_approved ? '✅' : '❌';
      console.log(`   - 序号 ${p.number}, 用户ID ${p.user_id}, 已审核 ${status}`);
    });
    console.log('');

    // 步骤 5: 检查讨论状态
    console.log('📊 步骤 5: 检查讨论状态...');
    const discussion = await db.query(
      `SELECT id, title, comment_count, last_posted_at FROM discussions WHERE id = ?`,
      [discussionId]
    );
    
    console.log(`   标题: ${discussion[0].title}`);
    console.log(`   回复数: ${discussion[0].comment_count}`);
    console.log(`   最后回复: ${discussion[0].last_posted_at}`);
    console.log('');

    // 步骤 6: 访问链接
    console.log('🌐 步骤 6: 访问论坛查看');
    console.log('   链接: http://43.128.56.125/d/' + discussionId);
    console.log('');
    console.log('💡 提示:');
    console.log('   1. 如果看不到 AI 回复，请硬刷新浏览器（Ctrl+F5）');
    console.log('   2. 检查浏览器控制台是否有错误');
    console.log('   3. 确认已登录论坛');
    console.log('');

    console.log('✅✅✅ 测试完成 ✅✅✅\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await db.close();
  }
}

fullTest();
