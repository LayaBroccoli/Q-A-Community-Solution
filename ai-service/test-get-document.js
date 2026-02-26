const LayaMCPClient = require('./mcp-client');
const fs = require('fs');

async function testGetDocument() {
  const mcp = new LayaMCPClient();
  const output = [];
  
  try {
    await mcp.connect();
    output.push('✅ MCP 连接成功\n');
    
    // 1. 先搜索文档
    output.push('🔍 步骤 1: query_docs 搜索\n');
    const searchResult = await mcp.sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'query_docs',
        arguments: {
          query: 'Sprite 精灵',
          limit: 3
        }
      }
    });
    
    const searchData = JSON.parse(mcp.extractTextContent(searchResult)[0]);
    output.push(`搜索到 ${searchData.total} 个结果\n`);
    
    if (searchData.results && searchData.results.length > 0) {
      const firstDoc = searchData.results[0];
      output.push('\n第一个结果:\n');
      output.push(JSON.stringify(firstDoc, null, 2));
      
      // 2. 检查是否有 doc_ids
      if (firstDoc.doc_ids && firstDoc.doc_ids.length > 0) {
        output.push(`\n\n📄 步骤 2: 使用 get_document 获取完整内容\n`);
        output.push(`doc_ids: ${firstDoc.doc_ids.join(', ')}\n`);
        
        // 3. 获取完整文档
        const docResult = await mcp.sendRequest({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'get_document',
            arguments: {
              doc_id: firstDoc.doc_ids[0]
            }
          }
        });
        
        const docContent = mcp.extractTextContent(docResult.result);
        output.push('\n完整文档内容:\n');
        output.push('='.repeat(60) + '\n');
        output.push(docContent[0] || '(无内容)');
        output.push('\n' + '='.repeat(60) + '\n');
      } else {
        output.push('\n⚠️  这个结果没有 doc_ids，无法获取完整内容\n');
      }
    }
    
    await mcp.disconnect();
    output.push('\n✅ 测试完成\n');
    
  } catch (error) {
    output.push(`\n❌ 错误: ${error.message}\n`);
    output.push(error.stack + '\n');
  }
  
  fs.writeFileSync('/tmp/mcp-get-document-test.txt', output.join(''));
  console.log('结果已保存到 /tmp/mcp-get-document-test.txt');
  console.log(`文件大小: ${output.join('').length} 字节`);
}

testGetDocument();
