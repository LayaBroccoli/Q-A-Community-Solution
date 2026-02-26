const AIService = require('./ai-service');
const LayaMCPClient = require('./mcp-client');
require('dotenv').config();

class ReplyQualityTester {
  constructor() {
    this.aiService = new AIService();
    this.mcpClient = new LayaMCPClient();
  }

  /**
   * 运行单个测试用例
   */
  async runTestCase(testCase) {
    console.log(`\n🧪 测试用例: ${testCase.id}`);
    console.log(`   问题: ${testCase.question}`);
    console.log(`   类型: ${testCase.type}\n`);

    try {
      // 1. 查询 MCP（如果需要）
      let mcpContext = '';
      if (testCase.useMCP !== false) {
        await this.mcpClient.connect();
        
        const docs = await this.mcpClient.searchDocumentation(testCase.question, { limit: 2 });
        const apis = await this.mcpClient.searchCode(testCase.question, { limit: 3 });
        
        mcpContext = `
${docs.context}

${apis.context}
`;
        
        await this.mcpClient.disconnect();
      }

      // 2. 生成回答
      const mockQuestion = {
        title: testCase.question,
        content: testCase.question,
        username: 'test_user'
      };

      const startTime = Date.now();
      const result = await this.aiService.generateAnswer(mockQuestion, mcpContext);
      const duration = (Date.now() - startTime) / 1000;

      // 3. 评分
      const scores = this.scoreReply(result.answer, testCase);

      // 4. 返回结果
      return {
        id: testCase.id,
        question: testCase.question,
        response: {
          content: result.answer,
          length: result.answer ? result.answer.length : 0,
          duration: duration,
          tokens: result.usage?.total_tokens || 0
        },
        scoring: scores,
        status: scores.total >= testCase.passLine ? 'pass' : 'fail'
      };

    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}`);
      return {
        id: testCase.id,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * 自动评分
   */
  scoreReply(content, testCase) {
    if (!content) {
      return {
        auto: 0,
        manual: 0,
        total: 0,
        details: { error: '内容为空' }
      };
    }

    const details = {};
    let autoScore = 0;

    // 1. 结构完整性（30 分）
    const structureScore = this.checkStructure(content);
    details.structure = structureScore;
    autoScore += structureScore.score;

    // 2. 长度检查（10 分）
    const lengthScore = this.checkLength(content);
    details.length = lengthScore;
    autoScore += lengthScore.score;

    // 3. 文档链接检查（15 分）
    const linkScore = this.checkLinks(content);
    details.links = linkScore;
    autoScore += linkScore.score;

    // 4. 完整性检查（20 分）
    const completeScore = this.checkCompleteness(content);
    details.completeness = completeScore;
    autoScore += completeScore.score;

    // 5. 代码示例检查（25 分）
    const codeScore = this.checkCodeExample(content);
    details.code = codeScore;
    autoScore += codeScore.score;

    // 预估人工分（基于自动分）
    const estimatedManual = Math.round(autoScore * 0.9);
    const total = autoScore + estimatedManual;

    return {
      auto: autoScore,
      manual: estimatedManual,
      total: total,
      details: details,
      passLine: testCase.passLine || 76
    };
  }

  /**
   * 检查结构完整性
   */
  checkStructure(content) {
    let score = 0;
    const missing = [];

    if (content.includes('## 问题分析')) {
      score += 5;
    } else {
      missing.push('问题分析');
    }

    if (content.includes('## 解决方案')) {
      score += 10;
    } else {
      missing.push('解决方案');
    }

    if (content.includes('### 代码示例') || content.includes('## 代码示例')) {
      score += 10;
    } else {
      missing.push('代码示例');
    }

    if (content.includes('## 相关文档')) {
      score += 5;
    } else {
      missing.push('相关文档');
    }

    return {
      score: score,
      max: 30,
      missing: missing
    };
  }

  /**
   * 检查长度
   */
  checkLength(content) {
    const len = content.length;

    if (len < 500) {
      return { score: 0, max: 10, status: '太短' };
    }
    if (len < 800) {
      return { score: 5, max: 10, status: '及格', length: len };
    }
    if (len < 1500) {
      return { score: 10, max: 10, status: '优秀', length: len };
    }
    if (len < 2500) {
      return { score: 10, max: 10, status: '优秀', length: len };
    }
    return { score: 5, max: 10, status: '过长', length: len };
  }

  /**
   * 检查文档链接
   */
  checkLinks(content) {
    let score = 0;

    // 必须包含官方链接
    if (content.includes('https://www.layaair.com/#/doc')) {
      score += 10;
    }

    // 不能包含过时链接
    if (content.includes('layaair.com/LayaAir3_API') || 
        content.includes('layaair.ldc2.layabox.com')) {
      score -= 10;
    }

    // 至少 2 个链接
    const links = (content.match(/https:\/\/www\.layaair\.com/g) || []).length;
    score += Math.min(links, 5);

    return {
      score: Math.max(0, score),
      max: 15,
      count: links
    };
  }

  /**
   * 检查完整性
   */
  checkCompleteness(content) {
    let score = 20;

    const incompletePatterns = [
      '引擎内部',
      '参考资料中提到',
      '（未完成',
      '...',
    ];

    for (const pattern of incompletePatterns) {
      if (content.endsWith(pattern) || 
          content.includes(pattern + '\n\n') ||
          content.includes(pattern + '</t>')) {
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      max: 20,
      incomplete: score < 20
    };
  }

  /**
   * 检查代码示例
   */
  checkCodeExample(content) {
    let score = 0;

    // 必须有代码块
    if (!content.includes('```')) {
      return { score: 0, max: 25, hasCode: false };
    }

    // 提取代码块
    const codeMatch = content.match(/```(?:typescript|javascript|js|ts)\n([\s\S]*?)\n```/);
    if (!codeMatch) {
      return { score: 0, max: 25, hasCode: true but invalid: true };
    }

    const code = codeMatch[1];

    // 基本要素检查
    if (code.includes('import ') || code.includes('require(')) score += 5;  // 导入语句
    if (code.includes('new ')) score += 5;     // 实例化
    if (code.includes('//')) score += 5;       // 注释
    if (code.length > 50) score += 5;          // 足够长
    if (!code.includes('TODO') && !code.includes('待完成')) score += 5;  // 不是草稿

    return {
      score: score,
      max: 25,
      hasCode: true,
      codeLength: code.length
    };
  }

  /**
   * 运行测试套件
   */
  async runTestSuite(testCases) {
    console.log('\n🎯 开始测试套件');
    console.log(`   测试用例数: ${testCases.length}`);
    console.log(`   开始时间: ${new Date().toISOString()}\n`);

    const results = [];

    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase);
      results.push(result);
      
      // 输出结果
      if (result.status === 'pass') {
        console.log(`   ✅ ${result.id}: ${result.scoring.total} 分`);
      } else if (result.status === 'fail') {
        console.log(`   ❌ ${result.id}: ${result.scoring.total} 分（不及格）`);
      } else {
        console.log(`   💥 ${result.id}: 错误 - ${result.error}`);
      }
    }

    // 生成报告
    this.generateReport(results);

    return results;
  }

  /**
   * 生成测试报告
   */
  generateReport(results) {
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const avgScore = results
      .filter(r => r.scoring)
      .reduce((sum, r) => sum + r.scoring.total, 0) / (results.filter(r => r.scoring).length || 1);

    const avgDuration = results
      .filter(r => r.response)
      .reduce((sum, r) => sum + r.response.duration, 0) / (results.filter(r => r.response).length || 1);

    const avgTokens = results
      .filter(r => r.response)
      .reduce((sum, r) => sum + r.response.tokens, 0) / (results.filter(r => r.response).length || 1);

    console.log('\n📊 测试报告');
    console.log('='.repeat(60));
    console.log(`   总数: ${results.length}`);
    console.log(`   ✅ 通过: ${passCount} (${(passCount/results.length*100).toFixed(1)}%)`);
    console.log(`   ❌ 失败: ${failCount} (${(failCount/results.length*100).toFixed(1)}%)`);
    console.log(`   💥 错误: ${errorCount}`);
    console.log(`\n   平均分: ${avgScore.toFixed(1)}`);
    console.log(`   平均时长: ${avgDuration.toFixed(1)}秒`);
    console.log(`   平均 Token: ${avgTokens.toFixed(0)}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = ReplyQualityTester;
