#!/usr/bin/env node

/**
 * 快速测试脚本 - 测试关键用例
 */

require('dotenv').config();
const AIService = require('./ai-service');

async function quickTest() {
  console.log('\n🎯 AI Service v2.1 快速测试\n');

  const aiService = new AIService();

  // 测试用例 1: 版本检测
  console.log('📋 测试 1: 版本检测');
  console.log('   3.x 强信号:', aiService.detectVersion('[LayaAir3] 如何使用 Sprite3D？', '使用 LayaAir 3.3.6'));
  console.log('   2.x 强信号:', aiService.detectVersion('[LayaAir2] Laya.init 报错', 'Laya.init(750, 1334)'));
  console.log('   3.x 弱信号:', aiService.detectVersion('装饰器报错', '@regClass()'));
  console.log('   2.x 弱信号:', aiService.detectVersion('Handler 问题', 'Laya.Handler.create'));
  console.log('   默认:', aiService.detectVersion('图片加载失败', '加载 png 图片 404'));

  // 测试用例 2: 功能暂不支持（场景 5）
  console.log('\n📋 测试 2: 功能暂不支持场景');
  const test2 = await aiService.generateAnswer({
    title: '[LayaAir3] 引擎支持点云渲染吗？',
    content: '我有一批点云数据（PLY 格式），想直接在 LayaAir 3D 场景里渲染出来，引擎有没有内置的点云组件？',
    username: 'test'
  }, '');

  if (test2.success) {
    console.log(`   ✅ 生成成功 (${test2.answer.length} 字符)`);
    console.log(`   包含"不支持": ${test2.answer.includes('不支持') ? '✅' : '❌'}`);
    console.log(`   包含替代方案: ${test2.answer.includes('可以') || test2.answer.includes('建议') || test2.answer.includes('自定义') ? '✅' : '❌'}`);
    console.log(`   包含代码: ${test2.answer.includes('```') ? '✅' : '❌'}`);
  }

  // 测试用例 3: 幻觉防御
  console.log('\n📋 测试 3: 幻觉防御（不存在的 API）');
  const test3 = await aiService.generateAnswer({
    title: '[LayaAir3] PointCloudRenderer 组件怎么用？',
    content: '听说引擎有个 PointCloudRenderer 组件可以直接渲染点云，怎么创建和配置？',
    username: 'test'
  }, '');

  if (test3.success) {
    console.log(`   ✅ 生成成功 (${test3.answer.length} 字符)`);
    console.log(`   未编造 API: ${!test3.answer.includes('new PointCloudRenderer') ? '✅' : '❌'}`);
    console.log(`   说明未找到: ${test3.answer.includes('未找到') || test3.answer.includes('没有') ? '✅' : '❌'}`);
    console.log(`   提供替代方案: ${test3.answer.includes('自定义') ? '✅' : '❌'}`);
  }

  // 测试用例 4: 概念解释（长度控制）
  console.log('\n📋 测试 4: 概念解释（长度控制）');
  const test4 = await aiService.generateAnswer({
    title: '[LayaAir3] Scene3D 和 Sprite3D 有什么区别？',
    content: '新手，搞不清 Scene3D 和 Sprite3D 的关系，求解释。',
    username: 'test'
  }, '');

  if (test4.success) {
    const len = test4.answer.length;
    console.log(`   ✅ 生成成功 (${len} 字符)`);
    console.log(`   长度合理: ${len >= 200 && len <= 500 ? '✅' : '❌'} (目标: 200-500)`);
    console.log(`   包含文档链接: ${test4.answer.includes('http') ? '✅' : '❌'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 快速测试完成！\n');
}

quickTest().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
