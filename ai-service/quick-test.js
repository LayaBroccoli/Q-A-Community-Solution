const ReplyQualityTester = require('./test-reply-quality');

// 简化版测试 - 只测试 2 个基础用例
const quickTestCases = [
  {
    id: 'TC001',
    type: 'basic',
    category: 'Sprite',
    question: '如何创建 Sprite 精灵？',
    useMCP: true,
    passLine: 75
  },
  {
    id: 'TC201',
    type: 'advanced',
    category: 'IK',
    question: 'IK 功能如何使用？',
    useMCP: true,
    passLine: 50
  }
];

async function quickTest() {
  console.log('\n🎯 快速质量测试\n');
  console.log('测试用例: 2 个');
  console.log('目的: 评估当前 AI 回复质量\n');

  const tester = new ReplyQualityTester();

  for (const testCase of quickTestCases) {
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 测试: ${testCase.id}`);
    console.log(`   问题: ${testCase.question}`);
    console.log(`   及格线: ${testCase.passLine * 2} 分\n`);

    const result = await tester.runTestCase(testCase);

    if (result.error) {
      console.log(`   ❌ 错误: ${result.error}`);
      continue;
    }

    // 显示结果
    console.log(`\n📊 评分结果:`);
    console.log(`   总分: ${result.scoring.total}/${result.scoring.passLine * 2}`);
    console.log(`   - 自动分: ${result.scoring.auto}/100`);
    console.log(`   - 预估人工分: ${result.scoring.manual}/90`);
    console.log(`\n📏 质量指标:`);
    console.log(`   - 长度: ${result.response.length} 字符 ${result.response.length < 500 ? '❌ 太短' : result.response.length < 800 ? '⚠️  及格' : '✅ 良好'}`);
    console.log(`   - 耗时: ${result.response.duration.toFixed(1)} 秒`);
    console.log(`   - Tokens: ${result.response.tokens}`);

    // 显示详细评分
    console.log(`\n📝 详细评分:`);
    const d = result.scoring.details;
    console.log(`   - 结构完整性: ${d.structure.score}/${d.structure.max} ${d.structure.missing?.length > 0 ? '(缺少: ' + d.structure.missing.join(', ') + ')' : ''}`);
    console.log(`   - 长度检查: ${d.length.score}/${d.length.max} (${d.length.status})`);
    console.log(`   - 文档链接: ${d.links.score}/${d.links.max} (${d.links.count} 个链接)`);
    console.log(`   - 完整性: ${d.completeness.score}/${d.completeness.max} ${d.completeness.incomplete ? '⚠️  可能不完整' : ''}`);
    console.log(`   - 代码示例: ${d.code.score}/${d.code.max} ${d.code.hasCode ? '(有代码)' : '(无代码)'}`);

    // 状态
    const status = result.status === 'pass' ? '✅ 通过' : '❌ 不及格';
    console.log(`\n🎯 结果: ${status}`);

    // 显示部分内容
    if (result.response.content) {
      const preview = result.response.content.substring(0, 200).replace(/\n/g, ' ');
      console.log(`\n📄 内容预览: ${preview}...`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成\n');
}

quickTest().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
