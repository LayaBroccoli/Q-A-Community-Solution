const LayaMCPClient = require('./mcp-client');
const fs = require('fs');

async function checkMCP() {
  const output = [];
  
  const mcp = new LayaMCPClient();
  
  try {
    await mcp.connect();
    output.push('✅ MCP 连接成功\n');
    
    output.push('📚 测试 query_docs:\n');
    const docs = await mcp.searchDocumentation('创建 Sprite 精灵', { limit: 2 });
    output.push(`结果数: ${docs.results.length}\n`);
    if (docs.results.length > 0) {
      output.push('\n结果 1:\n');
      output.push(docs.results[0].substring(0, 500) + '\n');
    }
    
    output.push('\n💻 测试 query_api:\n');
    const apis = await mcp.searchCode('Sprite', { limit: 3 });
    output.push(`结果数: ${apis.results.length}\n`);
    if (apis.results.length > 0) {
      output.push('\n结果 1:\n');
      output.push(apis.results[0].substring(0, 500) + '\n');
    }
    
    output.push('\n📝 生成的 context:\n');
    output.push(apis.context ? apis.context.substring(0, 800) : '(空)');
    output.push('\n');
    
    await mcp.disconnect();
    output.push('\n✅ 测试完成\n');
    
  } catch (error) {
    output.push(`\n❌ 错误: ${error.message}\n`);
  }
  
  fs.writeFileSync('/tmp/mcp-check-results.txt', output.join(''));
  console.log('结果已保存到 /tmp/mcp-check-results.txt');
}

checkMCP();
