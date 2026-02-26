require('dotenv').config();
const AIService = require('./ai-service');

async function testV2() {
  console.log('\n🧪 测试 AI Service v2.0\n');

  const aiService = new AIService();

  // 测试 1: 版本检测
  console.log('📋 测试 1: 版本检测');
  console.log('   3.x 示例:', aiService.detectVersion(
    '如何使用 Sprite?',
    'import { Sprite } from "laya";'
  ));

  console.log('   2.x 示例:', aiService.detectVersion(
    'Laya.init 问题',
    'Laya.init(1136, 640); Laya.stage.addChild('
  ));

  console.log('   默认示例:', aiService.detectVersion(
    '引擎问题',
    '怎么创建对象？'
  ));

  // 测试 2: 关键词生成
  console.log('\n📋 测试 2: 关键词生成');
  const queries = aiService.generateSearchQueries(
    'Sprite 如何使用？',
    'Laya.Sprite 报错 TypeError: Cannot read property x'
  );
  console.log('   生成的关键词:');
  queries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));

  // 测试 3: System Prompt
  console.log('\n📋 测试 3: System Prompt');
  const prompt = aiService.getSystemPrompt();
  console.log('   长度:', prompt.length, '字符');
  console.log('   包含"知识来源规则":', prompt.includes('知识来源规则'));
  console.log('   包含"版本识别规则":', prompt.includes('版本识别规则'));
  console.log('   包含"链接生成规则":', prompt.includes('链接生成规则'));
  console.log('   包含"绝对禁止":', prompt.includes('绝对禁止'));

  // 测试 4: User Prompt (有 MCP)
  console.log('\n📋 测试 4: User Prompt (有 MCP)');
  const promptWithMCP = aiService.buildPrompt({
    title: 'Sprite 创建',
    content: '如何创建 Sprite？',
    username: 'test'
  }, '### API 参考\n**Sprite** (Class)', '3.x');
  console.log('   包含"参考资料":', promptWithMCP.includes('参考资料'));
  console.log('   包含"MCP":', promptWithMCP.includes('MCP'));
  console.log('   包含"版本":', promptWithMCP.includes('3.x'));

  // 测试 5: User Prompt (无 MCP)
  console.log('\n📋 测试 5: User Prompt (无 MCP)');
  const promptWithoutMCP = aiService.buildPrompt({
    title: '问题',
    content: '内容',
    username: 'test'
  }, '', '2.x');
  console.log('   包含"未检索到":', promptWithoutMCP.includes('未检索到'));
  console.log('   包含"入口链接":', promptWithoutMCP.includes('入口链接'));
  console.log('   包含"2.x":', promptWithoutMCP.includes('2.x'));

  console.log('\n✅ v2.0 测试完成！\n');
}

testV2().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
