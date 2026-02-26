#!/usr/bin/env node

/**
 * AI 回复质量测试框架 v2.1
 * 基于 30 个测试用例的自动化测试
 */

require('dotenv').config();
const AIService = require('./ai-service');
const fs = require('fs');
const path = require('path');

// 测试用例配置（简化版，实际可以从 TEST-CASES-v2.1.md 解析）
const TEST_CASES = [
  // 版本路由测试
  {
    id: 'T01',
    title: '[LayaAir3] 如何动态创建 Sprite3D？',
    content: '使用 LayaAir 3.3.6，想在运行时通过代码创建一个空的 3D 节点并添加 MeshFilter，请问怎么写？',
    type: '版本路由',
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
    type: '版本路由',
    checks: {
      version: '2.x',
      no3xAPI: true,
      docLink: 'ldc2.layabox.com/doc/'
    }
  },
  // 概念解释类
  {
    id: 'T06',
    title: '[LayaAir3] Scene3D 和 Sprite3D 有什么区别？',
    content: '新手，搞不清 Scene3D 和 Sprite3D 的关系，求解释。',
    type: '概念解释',
    checks: {
      lengthMin: 200,
      lengthMax: 500,
      hasDocLink: true
    }
  },
  // 如何操作类
  {
    id: 'T07',
    title: '[LayaAir3] 如何用代码给 Sprite 添加点击事件？',
    content: '想实现点击一个 2D 精灵后触发回调函数，请问代码怎么写？',
    type: '如何操作',
    checks: {
      hasCode: true,
      hasSteps: true,
      hasDocLink: true
    }
  },
  // 功能暂不支持类
  {
    id: 'T09',
    title: '[LayaAir3] 引擎支持点云渲染吗？',
    content: '我有一批点云数据（PLY 格式），想直接在 LayaAir 3D 场景里渲染出来，引擎有没有内置的点云组件？',
    type: '功能暂不支持',
    checks: {
      notSupported: true,
      hasAlternative: true,
      hasCode: true
    }
  },
  // 幻觉防御测试
  {
    id: 'T19',
    title: '[LayaAir3] PointCloudRenderer 组件怎么用？',
    content: '听说引擎有个 PointCloudRenderer 组件可以直接渲染点云，怎么创建和配置？',
    type: '幻觉防御',
    checks: {
      noFakeAPI: true,  // 不假装组件存在
      hasAlternative: true,
      hasDocLink: true
    }
  },
  {
    id: 'T20',
    title: '[LayaAir3] 物理引擎文档在哪里？',
    content: '找不到 3D 物理引擎的文档，官网上看不到入口，能给个直接链接吗？',
    type: '幻觉防御',
    checks: {
      noFakeLink: true,  // 不编造链接
      hasEntryLink: true
    }
  }
];

class TestRunner {
  constructor() {
    this.aiService = new AIService();
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 检查单个检查点
   */
  checkPoint(answer, check) {
    const result = {
      name: check.name || '未知检查',
      passed: false,
      reason: ''
    };

    try {
      if (check.version) {
        // 检查版本声明
        const detectedVersion = this.aiService.detectVersion(check.title, check.content);
        result.passed = detectedVersion.includes(check.version);
        result.reason = `检测版本: ${detectedVersion}`;
      }

      if (check.no2xAPI) {
        // 检查不包含 2.x API
        result.passed = !answer.includes('Laya.init(') && !answer.includes('ldc2');
        result.reason = result.passed ? '无 2.x API' : '包含 2.x API';
      }

      if (check.no3xAPI) {
        // 检查不包含 3.x API
        result.passed = !answer.includes('@regClass') && !answer.includes('import from "laya"');
        result.reason = result.passed ? '无 3.x API' : '包含 3.x API';
      }

      if (check.docLink) {
        // 检查文档链接
        result.passed = answer.includes(check.docLink);
        result.reason = result.passed ? `包含 ${check.docLink}` : '缺少文档链接';
      }

      if (check.lengthMin && check.lengthMax) {
        // 检查长度
        const len = answer.length;
        result.passed = len >= check.lengthMin && len <= check.lengthMax;
        result.reason = `长度: ${len} (目标: ${check.lengthMin}-${check.lengthMax})`;
      }

      if (check.hasCode) {
        // 检查是否有代码
        result.passed = answer.includes('```typescript') || answer.includes('```js');
        result.reason = result.passed ? '包含代码示例' : '缺少代码示例';
      }

      if (check.hasSteps) {
        // 检查是否有步骤
        result.passed = /\d+\./.test(answer) || answer.includes('步骤');
        result.reason = result.passed ? '包含步骤说明' : '缺少步骤说明';
      }

      if (check.hasDocLink) {
        // 检查是否有文档链接
        result.passed = answer.includes('http') && answer.includes('laya');
        result.reason = result.passed ? '包含文档链接' : '缺少文档链接';
      }

      if (check.notSupported) {
        // 检查是否说明不支持
        result.passed = answer.includes('不支持') || answer.includes('暂不支持') || answer.includes('没有内置');
        result.reason = result.passed ? '说明不支持' : '未说明不支持';
      }

      if (check.hasAlternative) {
        // 检查是否提供替代方案
        result.passed = answer.includes('可以') || answer.includes('建议') || answer.includes('替代') || answer.includes('自定义');
        result.reason = result.passed ? '提供替代方案' : '缺少替代方案';
      }

      if (check.noFakeAPI) {
        // 检查是否没有编造 API
        const fakeAPI = 'PointCloudRenderer';
        result.passed = !answer.includes(`${fakeAPI}(`) && !answer.includes(`new ${fakeAPI}`);
        result.reason = result.passed ? '未编造 API' : '可能编造了 API';
      }

      if (check.noFakeLink) {
        // 检查是否没有编造链接
        const fakeLinkPattern = /layaair\.com\/3\.x\/doc\/[^\/\s]+\/readme\.html/;
        result.passed = !fakeLinkPattern.test(answer);
        result.reason = result.passed ? '未编造链接' : '可能编造了链接';
      }

      if (check.hasEntryLink) {
        // 检查是否有入口链接
        result.passed = answer.includes('layaair.com/3.x/doc/') || answer.includes('ldc2.layabox.com/doc/');
        result.reason = result.passed ? '包含入口链接' : '缺少入口链接';
      }

    } catch (error) {
      result.passed = false;
      result.reason = `检查出错: ${error.message}`;
    }

    return result;
  }

  /**
   * 运行单个测试用例
   */
  async runTestCase(testCase) {
    console.log(`\n📋 运行 ${testCase.id}: ${testCase.title}`);
    console.log(`   类型: ${testCase.type}`);

    try {
      const startTime = Date.now();

      // 生成 AI 回复
      const result = await this.aiService.generateAnswer({
        title: testCase.title,
        content: testCase.content,
        username: 'test'
      }, '');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!result.success) {
        console.log(`   ❌ 生成失败: ${result.error}`);
        return {
          id: testCase.id,
          passed: false,
          error: result.error
        };
      }

      const answer = result.answer;
      console.log(`   ✅ 生成成功 (${answer.length} 字符, ${duration}s)`);

      // 执行检查点
      const checkResults = [];
      let allPassed = true;

      // 转换 checks 为数组格式
      const checks = [];
      for (const [key, value] of Object.entries(testCase.checks)) {
        checks.push({ name: key, [key]: value });
      }

      for (const check of checks) {
        const checkResult = this.checkPoint(answer, check);
        checkResults.push(checkResult);
        if (!checkResult.passed) {
          allPassed = false;
        }
        console.log(`   ${checkResult.passed ? '✅' : '❌'} ${checkResult.reason}`);
      }

      // 保存完整回复到文件
      const outputDir = path.join(__dirname, '../test-results');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(outputDir, `${testCase.id}.md`),
        `# ${testCase.id}: ${testCase.title}\n\n${answer}`
      );

      return {
        id: testCase.id,
        passed: allPassed,
        checks: checkResults,
        answer: answer,
        duration: duration
      };

    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
      return {
        id: testCase.id,
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log('\n🎯 AI 回复质量测试 v2.1\n');
    console.log(`总计: ${TEST_CASES.length} 个测试用例\n`);
    console.log('='.repeat(60));

    this.summary.total = TEST_CASES.length;

    for (const testCase of TEST_CASES) {
      const result = await this.runTestCase(testCase);
      this.results.push(result);

      if (result.passed) {
        this.summary.passed++;
        console.log(`   ✅ ${testCase.id} 通过\n`);
      } else {
        this.summary.failed++;
        console.log(`   ❌ ${testCase.id} 失败\n`);
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.printSummary();
    this.saveReport();
  }

  /**
   * 打印总结
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结\n');

    console.log(`总计: ${this.summary.total}`);
    console.log(`✅ 通过: ${this.summary.passed} (${(this.summary.passed / this.summary.total * 100).toFixed(1)}%)`);
    console.log(`❌ 失败: ${this.summary.failed} (${(this.summary.failed / this.summary.total * 100).toFixed(1)}%)`);
    console.log(`⏭️  跳过: ${this.summary.skipped}`);

    const passRate = (this.summary.passed / this.summary.total * 100);
    if (passRate >= 90) {
      console.log('\n🎉 优秀！质量达到生产标准！');
    } else if (passRate >= 70) {
      console.log('\n👍 良好，但还有改进空间。');
    } else {
      console.log('\n⚠️  需要改进，建议检查失败的用例。');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * 保存测试报告
   */
  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      results: this.results
    };

    const reportPath = path.join(__dirname, '../test-results/TEST-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 测试报告已保存: ${reportPath}\n`);
  }
}

// 运行测试
async function main() {
  const runner = new TestRunner();

  try {
    await runner.runAll();
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行
if (require.main === module) {
  main();
}

module.exports = TestRunner;
