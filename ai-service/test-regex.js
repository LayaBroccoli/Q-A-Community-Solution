const pattern = /import\s+.*?\s+from\s+["']laya\//i;

const tests = [
  'import { Sprite } from "laya/";',
  'import { Sprite } from "laya";',
  'import * as Laya from "laya/2d"',
  'Laya.init(1136, 640);'
];

console.log('正则测试:', pattern.toString());
console.log();

tests.forEach((test, i) => {
  const match = pattern.test(test);
  console.log(`测试 ${i + 1}:`, match ? '✅ 匹配' : '❌ 不匹配');
  console.log(`  内容: ${test}`);
  console.log();
});
