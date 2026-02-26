#!/usr/bin/env node

const ReplyQualityTester = require('./test-reply-quality');
const testCases = require('./test-cases');

async function main() {
  console.log('\n🎯 LayaAir AI 回复质量测试\n');

  const tester = new ReplyQualityTester();

  // 运行测试
  const results = await tester.runTestSuite(testCases);

  // 输出详细结果
  console.log('\n📝 详细结果:\n');

  for (const result of results) {
    if (result.error) {
      console.log(`💥 ${result.id}: ${result.error}`);
      continue;
    }

    console.log(`\n${result.id}: ${result.question}`);
    console.log(`   状态: ${result.status === 'pass' ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   评分: ${result.scoring.total}/${result.scoring.passLine * 2} 分`);
    console.log(`   - 自动分: ${result.scoring.auto}/100`);
    console.log(`   - 人工分: ${result.scoring.manual}/90`);
    console.log(`   - 长度: ${result.response.length} 字符`);
    console.log(`   - 耗时: ${result.response.duration.toFixed(1)} 秒`);
    console.log(`   - Tokens: ${result.response.tokens}`);

    // 显示扣分项
    if (result.scoring.details.structure?.missing?.length > 0) {
      console.log(`   ⚠️  缺少部分: ${result.scoring.details.structure.missing.join(', ')}`);
    }
    if (result.scoring.details.links?.score < 15) {
      console.log(`   ⚠️  链接问题: ${result.scoring.details.links.count} 个链接`);
    }
    if (result.scoring.details.completeness?.incomplete) {
      console.log(`   ⚠️  内容可能不完整`);
    }
  }

  // 保存结果
  const fs = require('fs');
  const reportPath = `/tmp/ai-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 报告已保存到: ${reportPath}`);
}

// 运行
main().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
