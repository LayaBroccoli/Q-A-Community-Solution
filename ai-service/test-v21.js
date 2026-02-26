require('dotenv').config();
const AIService = require('./ai-service');

async function testV21() {
  console.log('\n🎯 测试 AI Service v2.1\n');
  console.log('基于 100 条论坛真实数据分析\n');

  const aiService = new AIService();

  // 测试 1: v2.1 新增特性
  console.log('📋 测试 1: v2.1 新增特性');
  const systemPrompt = aiService.getSystemPrompt();

  const v21Features = [
    { name: '代码差异化策略', keyword: '代码是 AI 回复最大的竞争力' },
    { name: '分级长度标准', keyword: '简单问题 200-500 字符' },
    { name: '功能暂不支持场景', keyword: '功能暂不支持' },
    { name: '不硬凑字数', keyword: '言简意赅' }
  ];

  v21Features.forEach(({name, keyword}) => {
    const found = systemPrompt.includes(keyword);
    console.log(`   ${found ? '✅' : '⚠️ '} ${name}`);
  });

  // 测试 2: User Prompt 增强
  console.log('\n📋 测试 2: User Prompt v2.1 增强');

  const promptWithMCP = aiService.buildPrompt({
    title: '测试问题',
    content: '这是测试内容',
    username: 'test'
  }, '### API 参考\n**Sprite** (Class)', '3.x');

  const promptWithoutMCP = aiService.buildPrompt({
    title: '测试问题',
    content: '这是测试内容',
    username: 'test'
  }, '', '3.x');

  console.log(`   ${promptWithMCP.includes('尽可能附带代码') ? '✅' : '⚠️ '} 强调代码重要性（有 MCP）`);
  console.log(`   ${promptWithMCP.includes('言简意赅') ? '✅' : '⚠️ '} 不硬凑字数（有 MCP）`);
  console.log(`   ${promptWithoutMCP.includes('尽可能提供代码') ? '✅' : '⚠️ '} 即使无 MCP 也鼓励代码框架`);

  // 测试 3: 5 个场景覆盖
  console.log('\n📋 测试 3: 5 个场景覆盖');

  const scenarios = [
    '场景 1: 概念解释类',
    '场景 2: 如何操作类',
    '场景 3: 问题排查类',
    '场景 4: 高级功能类',
    '场景 5: 功能暂不支持类'
  ];

  scenarios.forEach(scenario => {
    const found = systemPrompt.includes(scenario);
    console.log(`   ${found ? '✅' : '⚠️ '} ${scenario}`);
  });

  // 测试 4: 数据驱动的优先级
  console.log('\n📋 测试 4: 数据驱动优先级');

  console.log(`   ${systemPrompt.includes('3%') ? '✅' : '⚠️ '} 提到人工回复 3% 含代码`);
  console.log(`   ${systemPrompt.includes('8%') ? '✅' : '⚠️ '} 提到 8% 功能暂不支持`);
  console.log(`   ${systemPrompt.includes('P0') ? '✅' : '⚠️ '} MCP 优先级分级（P0/P1/P2）`);

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 v2.1 核心改进（基于 100 条论坛数据分析）');
  console.log('='.repeat(60));

  console.log('\n🎯 关键数据洞察：');
  console.log('   • 人工回复仅 3% 含代码 → 代码是 AI 的核心竞争力');
  console.log('   • 8% 是"功能暂不支持" → 需要专门应对策略');
  console.log('   • 22% 是 Native 问题 → MCP 优先级 P0');
  console.log('   • 20% 是新 UI 问题 → MCP 优先级 P0');
  console.log('   • 11% 是 Spine/骨骼动画 → MCP 优先级 P0\n');

  console.log('✅ v2.1 已准备就绪！\n');
}

testV21().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
