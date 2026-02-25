const Database = require('./db');
require('dotenv').config();

async function fixAndTest() {
  const db = new Database();
  
  try {
    console.log('\n🔧 修复并测试 AI 回复显示问题\n');

    // 步骤 1: 修复现有的 AI 回复
    console.log('步骤 1: 修复现有 AI 回复的 type 字段');
    console.log('===========================================');
    
    const result = await db.query(
      `UPDATE posts SET type = 'comment' WHERE user_id = 4 AND (type IS NULL OR type = '')`
    );
    
    console.log(`✅ 已修复 ${result.affectedRows} 个帖子\n`);

    // 步骤 2: 验证修复
    console.log('步骤 2: 验证修复结果');
    console.log('===========================================');
    
    const check = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) as has_type,
        SUM(CASE WHEN type IS NULL THEN 1 ELSE 0 END) as null_type
       FROM posts 
       WHERE user_id = 4`
    );

    console.log(`AI 回复总数: ${check[0].total}`);
    console.log(`有 type 的: ${check[0].has_type}`);
    console.log(`type 为 NULL: ${check[0].null_type}\n`);

    // 步骤 3: 测试新回复
    console.log('步骤 3: 测试新的 AI 回复');
    console.log('===========================================');
    console.log('创建测试讨论...\n');

    const timestamp = new Date().toLocaleString('zh-CN');
    const title = `显示问题修复测试 ${Date.now()}`;
    const content = `这是测试 AI 回复是否能正确显示的测试讨论。时间: ${timestamp}`;
    
    // 使用现有讨论 #6 进行测试
    const testDiscussionId = 6;
    
    // 删除旧的测试回复（如果有）
    await db.query(
      `DELETE FROM posts WHERE discussion_id = ? AND user_id = 4 AND number > 1`,
      [testDiscussionId]
    );

    console.log(`✅ 测试讨论准备完成: #${testDiscussionId}`);
    console.log(`   原标题: laya最新版本是什么时候发布的\n`);

    // 手动生成 AI 回复
    const AIService = require('./ai-service');
    const QuestionProcessor = require('./processor');
    
    const processor = new QuestionProcessor(db);
    const discussion = await db.getDiscussionById(testDiscussionId);

    if (discussion) {
      console.log('⏳ 生成 AI 回复...\n');
      await processor.processDiscussion(testDiscussionId);
      
      console.log('\n步骤 4: 验证新回复');
      console.log('===========================================');
      
      const posts = await db.query(
        `SELECT id, number, user_id, type, LENGTH(content) as len
         FROM posts 
         WHERE discussion_id = ? 
         ORDER BY number`,
        [testDiscussionId]
      );

      console.log('帖子列表:');
      posts.forEach(p => {
        const user = p.user_id === 4 ? 'AI助手' : '用户';
        const type = p.type || 'NULL';
        console.log(`  #${p.number} ${user} (type: ${type}) - ${p.len} 字符`);
      });
      console.log('');

      // 检查最新的 AI 回复是否有正确的 type
      const aiPost = await db.query(
        `SELECT type FROM posts WHERE discussion_id = ? AND user_id = 4 ORDER BY id DESC LIMIT 1`,
        [testDiscussionId]
      );

      if (aiPost.length > 0 && aiPost[0].type === 'comment') {
        console.log('✅✅✅ 新回复的 type 字段正确！\n');
        console.log('现在应该可以在论坛中看到 AI 回复了。');
        console.log(`\n🌐 访问: http://43.128.56.125/d/${testDiscussionId}\n`);
      } else {
        console.log('❌ 新回复的 type 仍然有问题\n');
      }
    }

    console.log('✅✅✅ 修复和测试完成\n');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

fixAndTest();
