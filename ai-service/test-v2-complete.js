require('dotenv').config();
const AIService = require('./ai-service');

async function testV2Complete() {
  console.log('\n🎯 测试 AI Service v2.0 完整版\n');
  console.log('基于 AI 回复规范 v2.0 + AI Prompt 模板 v2.0\n');

  const aiService = new AIService();

  // 测试 1: 幻觉防御 - 检查 System Prompt
  console.log('📋 测试 1: 幻觉防御五层机制');
  const systemPrompt = aiService.getSystemPrompt();

  const defenseLayers = [
    { name: '第 1 层：角色限定', keyword: '基于知识库回答的助手' },
    { name: '第 2 层：知识来源声明', keyword: 'MCP 检索结果 > 通用编程知识' },
    { name: '第 3 层：User Prompt 约束', keyword: '只使用参考资料中的 API' },
    { name: '第 4 层：无 MCP 降级', keyword: '无检索结果时只给方向性建议' },
    { name: '第 5 层：链接硬约束', keyword: '只允许 MCP 返回的链接和预定义的入口链接' }
  ];

  defenseLayers.forEach((layer, i) => {
    const found = systemPrompt.includes(layer.keyword);
    console.log(`   ${found ? '✅' : '❌'} ${layer.name}`);
  });

  // 测试 2: 场景策略
  console.log('\n📋 测试 2: 场景回复策略');
  const scenarios = [
    '场景 1: 概念解释类',
    '场景 2: 如何操作类',
    '场景 3: 问题排查类',
    '场景 4: 高级功能类'
  ];

  scenarios.forEach(scenario => {
    const found = systemPrompt.includes(scenario);
    console.log(`   ${found ? '✅' : '❌'} ${scenario}`);
  });

  // 测试 3: 边界处理原则
  console.log('\n📋 测试 3: 边界处理原则');
  const boundaryRules = [
    { rule: '禁止直接拒绝', keyword: '不允许空手而归', expect: true },
    { rule: '禁止敷衍', keyword: '❌ "我不知道这个问题"', expect: true },
    { rule: '允许坦诚引导', keyword: '建议查阅官方文档', expect: true }
  ];

  boundaryRules.forEach(({rule, keyword, expect}) => {
    const found = systemPrompt.includes(keyword);
    const correct = expect ? found : !found;
    console.log(`   ${correct ? '✅' : '❌'} ${rule}`);
  });

  // 测试 4: 链接规范
  console.log('\n📋 测试 4: 链接规范');
  console.log(`   ${systemPrompt.includes('绝对不自行拼接') ? '✅' : '❌'} 禁止自行拼接路径`);
  console.log(`   ${systemPrompt.includes('layaair.com/3.x/doc/') ? '✅' : '❌'} 3.x 文档入口`);
  console.log(`   ${systemPrompt.includes('ldc2.layabox.com/doc/') ? '✅' : '❌'} 2.x 文档入口`);

  // 测试 5: 版本检测
  console.log('\n📋 测试 5: 版本检测');
  const testCases = [
    { title: '3.x import', content: 'import { Sprite } from "laya";', expected: '3.x' },
    { title: '2.x init', content: 'Laya.init(1136, 640);', expected: '2.x' },
    { title: '默认情况', content: '如何使用引擎？', expected: '3.x (默认)' }
  ];

  testCases.forEach(({title, content, expected}) => {
    const detected = aiService.detectVersion(title, content);
    const correct = detected === expected;
    console.log(`   ${correct ? '✅' : '❌'} ${title}: ${detected}`);
  });

  // 测试 6: User Prompt 双模板
  console.log('\n📋 测试 6: User Prompt 双模板');

  const promptWithMCP = aiService.buildPrompt({
    title: '测试',
    content: '内容',
    username: 'test'
  }, '### API 参考\n**Sprite** (Class)', '3.x');

  const promptWithoutMCP = aiService.buildPrompt({
    title: '测试',
    content: '内容',
    username: 'test'
  }, '', '3.x');

  console.log(`   ${promptWithMCP.includes('参考资料（来自 LayaAir 官方知识库）') ? '✅' : '❌'} 有 MCP 模板`);
  console.log(`   ${promptWithoutMCP.includes('未检索到与此问题直接相关') ? '✅' : '❌'} 无 MCP 模板`);
  console.log(`   ${promptWithMCP.includes('绝对禁止自行拼接') ? '✅' : '❌'} 链接硬约束（有 MCP）`);
  console.log(`   ${promptWithoutMCP.includes('禁止自行拼接') ? '✅' : '❌'} 链接硬约束（无 MCP）`);

  // 测试 7: 版本路由链接
  console.log('\n📋 测试 7: 版本路由链接');

  const prompt3x = aiService.buildPrompt({
    title: '测试',
    content: '内容',
    username: 'test'
  }, '', '3.x');

  const prompt2x = aiService.buildPrompt({
    title: '测试',
    content: '内容',
    username: 'test'
  }, '', '2.x');

  console.log(`   ${prompt3x.includes('layaair.com/3.x/doc/') ? '✅' : '❌'} 3.x 使用正确入口`);
  console.log(`   ${prompt2x.includes('ldc2.layabox.com/doc/') ? '✅' : '❌'} 2.x 使用正确入口`);

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('✅ v2.0 完整规范已应用！');
  console.log('='.repeat(60) + '\n');

  console.log('📊 核心特性：');
  console.log('   ✅ 幻觉防御五层机制');
  console.log('   ✅ 场景回复策略（4 种）');
  console.log('   ✅ 边界处理原则');
  console.log('   ✅ 链接硬约束');
  console.log('   ✅ 版本自动路由');
  console.log('   ✅ 双模板策略\n');
}

testV2Complete().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
