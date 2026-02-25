const Database = require('./db');
require('dotenv').config();

async function testWebhook() {
  const db = new Database();
  
  try {
    console.log('\n🧪 Webhook 扩展测试\n');

    // 手动触发 webhook
    const discussionId = 7;
    
    console.log('📝 准备测试讨论 #' + discussionId);
    
    // 先检查讨论是否存在
    const discussion = await db.getDiscussionById(discussionId);
    
    if (!discussion) {
      console.log('❌ 讨论 #' + discussionId + ' 不存在');
      console.log('\n创建新讨论...');
      
      // 创建简单的测试讨论
      const content = 'LayaAir Webhook 测试 - ' + new Date().toLocaleString('zh-CN');
      const title = 'Webhook 修复测试';
      
      await db.query(
        `INSERT INTO discussions (title, slug, user_id, first_post_id, comment_count, last_post_number, created_at, last_posted_at, last_posted_user_id)
         VALUES (?, ?, ?, ?, 0, 1, NOW(), NOW(), ?)`,
        [title, 'webhook-fix-test', 3, 0, 3]
      );
      
      const result = await db.query(`SELECT LAST_INSERT_ID() as id`);
      discussionId = result[0].id;
      
      // 创建帖子
      await db.query(
        `INSERT INTO posts (discussion_id, user_id, content, created_at, is_approved, number, type)
         VALUES (?, 3, ?, NOW(), 1, 1, 'comment')`,
        [discussionId, content]
      );
      
      console.log('✅ 讨论已创建: #' + discussionId);
    } else {
      console.log('✅ 讨论存在: #' + discussionId);
      console.log('   标题: ' + discussion.title);
    }
    
    console.log('\n⏳ 等待 5 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📊 检查 AI 服务日志...\n');
    const { execSync } = require('child_process');
    const logs = execSync('tail -100 /tmp/ai-service.log | grep -B 3 -A 15 "讨论.*' + discussionId + '" || echo "未找到"').toString();
    
    if (logs.includes('讨论')) {
      console.log('✅✅✅ Webhook 触发成功！\n');
      console.log(logs);
    } else {
      console.log('❌ 未检测到 Webhook 触发\n');
      console.log('最近的日志:');
      console.log(execSync('tail -50 /tmp/ai-service.log').toString());
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await db.close();
  }
}

testWebhook();
