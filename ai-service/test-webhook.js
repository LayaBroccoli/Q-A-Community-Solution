const axios = require('axios');

const FLARUM_URL = process.env.FLARUM_URL || 'http://43.128.56.125';
const WEBHOOK_URL = 'http://localhost:3000/webhook/discussion';

async function testWebhook() {
  console.log('🧪 测试 Webhook 接收...\n');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ 健康检查:', health.data);
    console.log('');

    // 2. 测试获取讨论
    console.log('2️⃣ 测试获取讨论列表...');
    const discussions = await axios.get('http://localhost:3000/api/discussions?limit=3');
    console.log('✅ 讨论列表:', discussions.data);
    console.log('');

    // 3. 模拟 Webhook 调用
    console.log('3️⃣ 模拟 Webhook 调用...');
    const webhookPayload = {
      event: 'discussion.created',
      data: {
        discussion_id: 1,
        timestamp: new Date().toISOString()
      }
    };

    const webhook = await axios.post(WEBHOOK_URL, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Flarum-Webhook/1.0'
      }
    });
    console.log('✅ Webhook 响应:', webhook.data);
    console.log('');

    // 4. 测试数据库连接
    console.log('4️⃣ 测试数据库连接...');
    const discussion = await axios.get('http://localhost:3000/api/discussions/1');
    console.log('✅ 讨论详情:', discussion.data);
    console.log('');

    console.log('✅ 所有测试通过！\n');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testWebhook();
}

module.exports = { testWebhook };
