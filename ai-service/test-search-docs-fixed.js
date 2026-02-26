const LayaMCPClient = require('./mcp-client');
const fs = require('fs');

async function testSearchDocs() {
  const mcp = new LayaMCPClient();
  const output = [];
  
  try {
    await mcp.connect();
    output.push('✅ 连接成功\n');
    
    output.push('🔍 测试 searchDocumentation\n');
    const result = await mcp.searchDocumentation('什么是 Sprite', { limit: 2 });
    
    output.push(`\n成功: ${result.success}`);
    output.push(`结果数: ${result.results.length}`);
    output.push(`上下文长度: ${result.context.length} 字符\n`);
    
    output.push('\n📝 提取的上下文:\n');
    output.push('='.repeat(60) + '\n');
    output.push(result.context);
    output.push('\n' + '='.repeat(60) + '\n');
    
    await mcp.disconnect();
    output.push('\n✅ 测试完成\n');
    
  } catch (error) {
    output.push(`\n❌ 错误: ${error.message}\n`);
  }
  
  fs.writeFileSync('/tmp/mcp-search-docs-fixed.txt', output.join(''));
  console.log('结果已保存到 /tmp/mcp-search-docs-fixed.txt');
}

testSearchDocs();
