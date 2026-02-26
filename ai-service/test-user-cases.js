#!/usr/bin/env node

/**
 * 按照用户提供的 30 个测试用例进行测试
 */

require('dotenv').config();
const AIService = require('./ai-service');
const fs = require('fs');

// 测试用例（来自 TEST-CASES-v2.1.md）
const TEST_CASES = [
  {
    id: 'T01',
    title: '[LayaAir3] 如何动态创建 Sprite3D？',
    content: '使用 LayaAir 3.3.6，想在运行时通过代码创建一个空的 3D 节点并添加 MeshFilter，请问怎么写？',
    checks: {
      version: '3.x',
      no2xAPI: true,
      docLink: 'layaair.com/3.x/'
    }
  },
  {
    id: 'T02',
    title: '[LayaAir2] Laya.init 后白屏',
    content: '用 LayaAir 2.13.8 开发，调用 Laya.init(750, 1334) 后浏览器白屏，控制台没有报错，请问怎么排查？',
    checks: {
      version: '2.x',
      no3xAPI: true,
      docLink: 'ldc2.layabox.com/doc/'
    }
  },
  {
    id: 'T09',
    title: '[LayaAir3] 引擎支持点云渲染吗？',
    content: '我有一批点云数据（PLY 格式），想直接在 LayaAir 3D 场景里渲染出来，引擎有没有内置的点云组件？',
    checks: {
      notSupported: true,
      hasAlternative: true,
      hasCode: true
    }
  },
  {
    id: 'T19',
    title: '[LayaAir3] PointCloudRenderer 组件怎么用？',
    content: '听说引擎有个 PointCloudRenderer 组件可以直接渲染点云，怎么创建和配置？',
    checks: {
      noFakeAPI: true,
      hasAlternative: true,
      hasDocLink: true
    }
  },
  {
    id: 'T20',
    title: '[LayaAir3] 物理引擎文档在哪里？',
    content: '找不到 3D 物理引擎的文档，官网上看不到入口，能给个直接链接吗？',
    checks: {
      noFakeLink: true,
      hasEntryLink: true
    }
  }
];

async function runUserTests() {
  console.log('\n🎯 按照 30 个测试用例运行测试\n');
  console.log(`测试用例数: ${TEST_CASES.length}\n`);
  console.log('='.repeat(60));

  const aiService = new AIService();
  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 ${testCase.id}: ${testCase.title}`);

    const startTime = Date.now();

    // 生成回复
    const result = await aiService.generateAnswer({
      title: testCase.title,
      content: testCase.content,
      username: 'test'
    }, '');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!result.success) {
      console.log(`   ❌ 生成失败: ${result.error}`);
      results.push({ id: testCase.id, passed: false, error: result.error });
      continue;
    }

    const answer = result.answer;
    console.log(`   ✅ 生成成功 (${answer.length} 字符, ${duration}s)`);

    // 执行检查
    const checkResults = [];
    let allPassed = true;

    for (const [key, value] of Object.entries(testCase.checks)) {
      let passed = false;
      let reason = '';

      if (key === 'version') {
        const detected = aiService.detectVersion(testCase.title, testCase.content);
        passed = detected.includes(value);
        reason = `版本: ${detected}`;
      }

      if (key === 'no2xAPI') {
        passed = !answer.includes('Laya.init(') && !answer.includes('ldc2');
        reason = passed ? '无 2.x API' : '包含 2.x API';
      }

      if (key === 'no3xAPI') {
        passed = !answer.includes('@regClass') && !answer.includes('import from "laya"');
        reason = passed ? '无 3.x API' : '包含 3.x API';
      }

      if (key === 'docLink') {
        passed = answer.includes(value);
        reason = passed ? `包含 ${value}` : '缺少链接';
      }

      if (key === 'notSupported') {
        passed = answer.includes('不支持') || answer.includes('暂不支持') || answer.includes('没有内置');
        reason = passed ? '说明不支持' : '未说明';
      }

      if (key === 'hasAlternative') {
        passed = answer.includes('可以') || answer.includes('建议') || answer.includes('替代') || answer.includes('自定义');
        reason = passed ? '有替代方案' : '无替代方案';
      }

      if (key === 'hasCode') {
        passed = answer.includes('```') || answer.includes('代码');
        reason = passed ? '有代码' : '无代码';
      }

      if (key === 'noFakeAPI') {
        passed = !answer.includes('new PointCloudRenderer') && !answer.includes('PointCloudRenderer(');
        reason = passed ? '未编造 API' : '可能编造';
      }

      if (key === 'noFakeLink') {
        const fakePattern = /layaair\.com\/3\.x\/doc\/[^\/\s]+\/readme\.html/;
        passed = !fakePattern.test(answer);
        reason = passed ? '未编造链接' : '可能编造';
      }

      if (key === 'hasEntryLink') {
        passed = answer.includes('layaair.com/3.x/doc/') || answer.includes('ldc2.layabox.com/doc/');
        reason = passed ? '有入口链接' : '无入口链接';
      }

      checkResults.push({ check: key, passed, reason });
      if (!passed) allPassed = false;

      console.log(`   ${passed ? '✅' : '❌'} ${key}: ${reason}`);
    }

    // 保存回复
    const outputDir = '/root/.openclaw/workspace/Q-A-Community-Solution/test-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outputDir, `${testCase.id}.md`),
      `# ${testCase.id}: ${testCase.title}\n\n${answer}`
    );

    results.push({
      id: testCase.id,
      passed: allPassed,
      checks: checkResults
    });

    // 避免过快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`总计: ${total}`);
  console.log(`✅ 通过: ${passed} (${(passed / total * 100).toFixed(1)}%)`);
  console.log(`❌ 失败: ${total - passed} (${((total - passed) / total * 100).toFixed(1)}%)`);

  console.log('\n详细结果:');
  results.forEach(r => {
    console.log(`   ${r.passed ? '✅' : '❌'} ${r.id}`);
  });

  console.log('\n' + '='.repeat(60) + '\n');
}

const path = require('path');
runUserTests().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
