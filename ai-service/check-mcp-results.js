const LayaMCPClient = require('./mcp-client');

async function checkMCP() {
  const mcp = new LayaMCPClient();
  
  try {
    await mcp.connect();
    
    console.log('\n📚 测试 query_docs:');
    const docs = await mcp.searchDocumentation('创建 Sprite 精灵', { limit: 2 });
    console.log('结果数:', docs.results.length);
    if (docs.results.length > 0) {
      console.log('结果 1:', docs.results[0].substring(0, 300));
    }
    
    console.log('\n💻 测试 query_api:');
    const apis = await mcp.searchCode('Sprite', { limit: 3 });
    console.log('结果数:', apis.results.length);
    if (apis.results.length > 0) {
      console.log('结果 1:', apis.results[0].substring(0, 400));
    }
    
    await mcp.disconnect();
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkMCP();
