const axios = require('axios');
require('dotenv').config();

class LayaMCPClient {
  constructor() {
    this.client = null;
    this.url = process.env.LAYA_MCP_URL || 'https://laya-knowledge-mcp.layaair.com/mcp';
    this.headers = {
      'LAYA_PRE_VERSION': process.env.LAYA_PRE_VERSION || 'v3.4.0-beta.1',
      'LAYA_VERSION': process.env.LAYA_VERSION || 'v3.4.0-beta.1',
      'LAYA_ALLOWED_DATASETS': process.env.LAYA_ALLOWED_DATASETS || 'LayaAir',
      'LAYA_MCP_API_KEY': process.env.LAYA_MCP_API_KEY || 'layamcp-aef3a912-2712-4cf2-9544-0d8d389d20f9',
      'Content-Type': 'application/json'
    };
    this.requestId = 0;
    
    // 配置 axios
    this.axios = axios.create({
      timeout: 30000,  // 30秒超时
      headers: this.headers
    });
  }

  async connect() {
    try {
      console.log('\n🔗 连接到 LayaAir MCP 服务器...');
      console.log(`   URL: ${this.url}`);

      // 测试连接（发送 initialize 请求）
      await this.sendRequest({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'laya-ask-ai-service',
            version: '1.0.0'
          }
        }
      });

      console.log('✅ MCP 连接成功');
      this.connected = true;

      // 列出可用工具
      await this.listAvailableTools();

    } catch (error) {
      console.error('❌ MCP 连接失败:', error.message);
      this.connected = false;
      throw error;
    }
  }

  async sendRequest(payload) {
    const response = await this.axios.post(this.url, payload);
    return response.data;
  }

  async listAvailableTools() {
    if (!this.connected) {
      return [];
    }

    try {
      const response = await this.sendRequest({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/list',
        params: {}
      });

      console.log(`\n📦 可用工具 (${response.result?.tools?.length || 0}):`);

      if (response.result?.tools && response.result.tools.length > 0) {
        this.availableTools = new Map();

        for (const tool of response.result.tools) {
          console.log(`   - ${tool.name}: ${tool.description?.substring(0, 80) || '无描述'}`);
          this.availableTools.set(tool.name, tool);
        }
      } else {
        console.log('   ⚠️  服务器没有提供任何工具');
        this.availableTools = new Map();
      }

      return Array.from(this.availableTools.keys());

    } catch (error) {
      console.error('❌ 获取工具列表失败:', error.message);
      this.availableTools = new Map();
      return [];
    }
  }

  async searchDocumentation(query, options = {}) {
    if (!this.connected) {
      console.warn('⚠️  MCP 未连接');
      return { success: false, results: [], context: '' };
    }

    try {
      console.log(`\n📚 搜索文档: ${query}`);

      // 使用 query_docs 工具搜索文档概念和教程
      if (!this.availableTools?.has('query_docs')) {
        console.warn('⚠️  服务器没有提供 query_docs 工具');
        return { success: false, results: [], context: this.buildFallbackContext(query) };
      }

      const response = await this.sendRequest({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: {
          name: 'query_docs',
          arguments: {
            query: query,
            limit: options.limit || 3
          }
        }
      });

      const docs = this.extractTextContent(response.result);

      return {
        success: true,
        results: docs,
        context: docs.length > 0 ? docs.join('\n\n') : this.buildFallbackContext(query),
        raw: response.result
      };

    } catch (error) {
      console.error('❌ 文档搜索失败:', error.message);
      return {
        success: false,
        results: [],
        context: this.buildFallbackContext(query),
        error: error.message
      };
    }
  }

  async searchCode(query, options = {}) {
    if (!this.connected) {
      console.warn('⚠️  MCP 未连接');
      return { success: false, results: [], context: '' };
    }

    try {
      console.log(`\n💻 搜索 API: ${query}`);

      // 使用 query_api 工具搜索 API
      if (!this.availableTools?.has('query_api')) {
        console.warn('⚠️  服务器没有提供 query_api 工具');
        return { success: false, results: [], context: '' };
      }

      const response = await this.sendRequest({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: {
          name: 'query_api',
          arguments: {
            query: query,
            limit: options.limit || 5
          }
        }
      });

      const apis = this.extractTextContent(response.result);

      // 格式化 API 结果
      const formatted = apis.map(api => {
        try {
          const data = JSON.parse(api);
          if (data.results && Array.isArray(data.results)) {
            const items = data.results.map(item => {
              const parts = [];
              if (item.name) parts.push(`**${item.name}**`);
              if (item.type) parts.push(`(${item.type})`);
              if (item.belongs_to) parts.push(`in ${item.belongs_to}`);
              if (item.description) parts.push(`- ${item.description}`);
              if (item.signature) parts.push(`\`${item.signature}\``);
              return parts.join(' ');
            });
            return `### API 搜索结果 (共 ${data.total} 个)\n\n${items.join('\n\n')}`;
          }
          return api;
        } catch {
          return api;
        }
      });

      return {
        success: true,
        results: apis,
        context: formatted.length > 0 ? formatted.join('\n\n') : '',
        raw: response.result
      };

    } catch (error) {
      console.error('❌ API 搜索失败:', error.message);
      return {
        success: false,
        results: [],
        context: '',
        error: error.message
      };
    }
  }

  extractTextContent(result) {
    const contents = [];

    if (result?.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          contents.push(item.text);
        }
      }
    }

    return contents;
  }

  buildFallbackContext(query) {
    return `
## 📚 参考资料

**查询关键词**: ${query}

**建议**:
- 查看 [LayaAir 官方文档](https://layaair.com/)
- 访问 [LayaAir 3.x 文档中心](https://layaair.ldc2.layabox.com/layaair3.x/)
`;
  }

  async disconnect() {
    this.connected = false;
    this.client = null;
    console.log('👋 MCP 连接已关闭');
  }
}

module.exports = LayaMCPClient;
