#!/usr/bin/env node
/**
 * 测试 LLM API 连接
 * 
 * 用法：
 *   node test-llm-connection.js
 * 
 * 环境变量：
 *   OPENAI_API_KEY - API 密钥
 *   OPENAI_BASE_URL - API 地址
 *   OPENAI_MODEL - 模型名称
 */

require('dotenv').config();

async function testConnection() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4';

  console.log('\n🧪 LLM API 连接测试');
  console.log('================================\n');
  console.log(`API URL: ${baseURL}`);
  console.log(`模型: ${model}`);
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '(未设置)'}\n`);

  if (!apiKey) {
    console.error('❌ 错误: OPENAI_API_KEY 未设置');
    console.log('\n请编辑 .env 文件，填入你的 API Key:\n');
    console.log('OPENAI_API_KEY=your-api-key-here');
    console.log('OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4');
    console.log('OPENAI_MODEL=glm-4\n');
    process.exit(1);
  }

  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
  });

  console.log('📡 发送测试请求...\n');

  try {
    const startTime = Date.now();

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请用一句话介绍 LayaAir 游戏引擎。'
        }
      ],
      max_tokens: 100
    });

    const duration = Date.now() - startTime;
    const response = completion.choices[0].message.content;
    const usage = completion.usage;

    console.log('✅ 连接成功！\n');
    console.log(`📤 响应时间: ${duration}ms`);
    console.log(`📄 回复内容:\n   ${response}\n`);
    console.log('📊 Token 使用:');
    console.log(`   输入: ${usage.prompt_tokens} tokens`);
    console.log(`   输出: ${usage.completion_tokens} tokens`);
    console.log(`   总计: ${usage.total_tokens} tokens\n`);

    // 估算成本
    console.log('💰 预估成本:');
    if (model.includes('glm')) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.12;
      const outputCost = (usage.completion_tokens / 1000) * 0.12;
      console.log(`   输入: ¥${inputCost.toFixed(4)}`);
      console.log(`   输出: ¥${outputCost.toFixed(4)}`);
      console.log(`   总计: ¥${(inputCost + outputCost).toFixed(4)}`);
    }

    console.log('\n✅ API 配置正确，可以开始使用！\n');

  } catch (error) {
    console.error('❌ 连接失败\n');
    
    if (error.status === 401) {
      console.error('错误: API Key 验证失败');
      console.error('原因: API Key 不正确或已过期');
      console.error('解决: 请检查 .env 文件中的 OPENAI_API_KEY\n');
    } else if (error.status === 404) {
      console.error('错误: 模型不存在');
      console.error(`原因: 模型 "${model}" 不存在或未授权`);
      console.error('解决: 请检查 OPENAI_MODEL 配置\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('错误: 无法连接到 API');
      console.error(`原因: 无法连接到 ${baseURL}`);
      console.error('解决: 请检查 OPENAI_BASE_URL 和网络连接\n');
    } else {
      console.error(`错误: ${error.message}\n`);
    }

    process.exit(1);
  }
}

// 运行测试
testConnection();
