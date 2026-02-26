const LayaMCPClient = require('./mcp-client');
const fs = require('fs');

async function testDifferentQueries() {
  const mcp = new LayaMCPClient();
  const output = [];
  
  try {
    await mcp.connect();
    output.push('✅ 连接成功\n');
    
    // 测试 1: Sprite 2D
    output.push('📚 测试 1: Sprite 2D\n');
    const result1 = await mcp.searchDocumentation('Sprite 2D 显示对象', { limit: 1 });
    output.push(`上下文长度: ${result1.context.length} 字符\n`);
    output.push('前 300 字符:\n');
    output.push(result1.context.substring(0, 300) + '\n');
    
    // 测试 2: 3D 相关
    output.push('\n📚 测试 2: 3D 场景\n');
    const result2 = await mcp.searchDocumentation('Scene3D 三维场景', { limit: 1 });
    output.push(`上下文长度: ${result2.context.length} 字符\n`);
    output.push('前 300 字符:\n');
    output.push(result2.context.substring(0, 300) + '\n');
    
    // 测试 3: TypeScript
    output.push('\n📚 测试 3: TypeScript 脚本\n');
    const result3 = await mcp.searchDocumentation('Script 组件脚本生命周期', { limit: 1 });
    output.push(`上下文长度: ${result3.context.length} 字符\n`);
    output.push('前 300 字符:\n');
    output.push(result3.context.substring(0, 300) + '\n');
    
    await mcp.disconnect();
    output.push('\n✅ 测试完成\n');
    
  } catch (error) {
    output.push(`\n❌ 错误: ${error.message}\n`);
  }
  
  fs.writeFileSync('/tmp/mcp-docs-comparison.txt', output.join(''));
  console.log('结果已保存到 /tmp/mcp-docs-comparison.txt');
}

testDifferentQueries();
