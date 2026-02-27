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
    this.connected = false;
    this.sessionId = null;

    // 配置 axios
    this.axios = axios.create({
      timeout: 120000,  // 120秒超时
      headers: this.headers
    });
  }

  /**
   * 连接MCP服务器（幂等，可重复调用）
   */
  async connect() {
    // 已连接，直接复用
    if (this.connected && this.sessionId) {
      return;
    }

    try {
      console.log('\n🔗 连接到 LayaAir MCP 服务器...');
      console.log(`   URL: ${this.url}`);

      // 测试连接（发送 initialize 请求）
      const response = await this.sendRequestWithRetry({
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

      // 保存会话ID
      this.sessionId = response?.result || Date.now();
      this.connected = true;

      console.log('✅ MCP 连接成功');

      // 列出可用工具
      await this.listAvailableTools();

    } catch (error) {
      console.error('❌ MCP 连接失败:', error.message);
      this.connected = false;
      throw error;
    }
  }

  /**
   * 带重试的请求封装
   * @param {object} payload - 请求负载
   * @param {number} maxRetries - 最大重试次数
   */
  async sendRequestWithRetry(payload, maxRetries = 2) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.sendRequest(payload);
      } catch (error) {
        lastError = error;

        if (i < maxRetries) {
          // 指数退避：1s, 2s, 4s...
          const delay = 1000 * Math.pow(2, i);
          console.warn(`   ⚠️  请求失败，${delay}ms后重试 (${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
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
      const response = await this.sendRequestWithRetry({
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

  /**
   * 统一搜索入口，根据 tool 路由到不同 MCP 工具
   * @param {string} tool - 'get_api_detail' | 'query_api' | 'query_docs'
   * @param {string} query - 搜索词
   */
  async search(tool, query) {
    try {
      switch (tool) {
        case 'get_api_detail':
          return await this.getApiDetail(query);
        case 'query_api':
          return await this.searchCode(query);
        case 'query_docs':
          return await this.searchDocumentation(query);
        default:
          console.warn(`   ⚠️  未知工具: ${tool}，使用 query_api`);
          return await this.searchCode(query);
      }
    } catch (error) {
      console.warn(`   ❌ MCP search failed [${tool}] "${query}":`, error.message);
      return { success: false, context: '' };
    }
  }

  /**
   * 精确获取 API 详情（不走向量搜索，直接查类名/方法名）
   * @param {string} name - 类名或"类名.方法名"，不加 Laya. 前缀
   */
  async getApiDetail(name) {
    try {
      console.log(`\n📖 精确查询 API: ${name}`);

      const response = await this.sendRequestWithRetry({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: {
          name: 'get_api_detail',
          arguments: {
            name: name, // e.g. "Camera" 或 "Camera.worldToViewportPoint"
            version: this.headers['LAYA_VERSION'],
          }
        }
      });

      const contents = this.extractTextContent(response.result);

      if (!contents.length) {
        return { success: false, context: '' };
      }

      const formatted = contents.map(c => {
        try {
          const data = JSON.parse(c);
          const parts = [];

          if (data.name) parts.push(`**${data.name}**`);
          if (data.type) parts.push(`(${data.type})`);
          if (data.description) parts.push(`\n${data.description}`);
          if (data.signature) parts.push(`\n\`\`\`typescript\n${data.signature}\n\`\`\``);

          if (data.members?.length) {
            parts.push('\n**成员：**');
            data.members.slice(0, 10).forEach(m => {
              parts.push(`- \`${m.name}\`: ${m.description || ''}`);
            });
          }

          return parts.join(' ');
        } catch {
          return c;
        }
      });

      return {
        success: true,
        context: `### API 详情: ${name}\n\n${formatted.join('\n\n')}`,
        raw: response.result
      };

    } catch (error) {
      console.error(`   ❌ getApiDetail 失败:`, error.message);
      return { success: false, context: '' };
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
        return { success: false, results: [], context: '' };
      }

      const response = await this.sendRequestWithRetry({
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

      // 解析 JSON 并提取 content 字段
      const parsedDocs = [];
      for (const doc of docs) {
        try {
          const data = JSON.parse(doc);
          if (data.results && Array.isArray(data.results)) {
            // 提取每个结果的 content 字段
            data.results.forEach(item => {
              if (item.content) {
                parsedDocs.push(`### ${item.title || '文档'}\n\n${item.content}`);
              }
            });
          }
        } catch (e) {
          // 如果解析失败，使用原始文本
          parsedDocs.push(doc);
        }
      }

      const context = parsedDocs.length > 0
        ? parsedDocs.join('\n\n---\n\n')
        : '';  // 修复：返回空字符串，不返回fallback

      // 如果没有找到实际结果，返回false以触发重试
      const hasRealResults = parsedDocs.length > 0;

      return {
        success: hasRealResults,
        results: parsedDocs,
        context: context,
        raw: response.result
      };

    } catch (error) {
      console.error('❌ 文档搜索失败:', error.message);
      return {
        success: false,
        results: [],
        context: '',  // 修复：返回空字符串，不返回fallback
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

      const response = await this.sendRequestWithRetry({
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

      // 检查是否有实际结果
      const hasRealResults = apis.length > 0 && formatted.length > 0;

      return {
        success: hasRealResults,
        results: apis,
        context: formatted.length > 0 ? formatted.join('\n\n') : '',  // 修复：空结果返回空字符串
        raw: response.result
      };

    } catch (error) {
      console.error('❌ API 搜索失败:', error.message);
      return {
        success: false,
        results: [],
        context: '',  // 修复：返回空字符串，不返回fallback
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

  async disconnect() {
    this.connected = false;
    this.sessionId = null;
    this.client = null;
    console.log('👋 MCP 连接已关闭');
  }
}

module.exports = LayaMCPClient;
