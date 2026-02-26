const LayaMCPClient = require('./mcp-client');
const fs = require('fs');

async function testIK() {
  const mcp = new LayaMCPClient();
  const output = [];
  
  try {
    await mcp.connect();
    output.push('✅ 连接成功\n');
    
    // 测试文档搜索
    output.push('📚 测试 query_docs: IK\n');
    const docs = await mcp.searchDocumentation('IK 反向运动学', { limit: 3 });
    output.push(`结果数: ${docs.results.length}\n`);
    output.push(`上下文长度: ${docs.context.length} 字符\n`);
    output.push('\n文档内容:\n');
    output.push(docs.context.substring(0, 1000) + '\n');
    
    // 测试 API 搜索
    output.push('\n💻 测试 query_api: IK\n');
    const apis = await mcp.searchCode('IK', { limit: 5 });
    output.push(`结果数: ${apis.results.length}\n`);
    output.push(`上下文长度: ${apis.context.length} 字符\n`);
    output.push('\nAPI 内容:\n');
    output.push(apis.context.substring(0, 1000) + '\n');
    
    await mcp.disconnect();
    output.push('\n✅ 测试完成\n');
    
  } catch (error) {
    output.push(`\n❌ 错误: ${error.message}\n`);
  }
  
  fs.writeFileSync('/tmp/mcp-ik-test.txt', output.join(''));
  console.log('结果已保存到 /tmp/mcp-ik-test.txt');
}

testIK();
