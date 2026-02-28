const AIService = require('./ai-service');
const Database = require('./db');
const { marked } = require('marked');
const LayaMCPClient = require('./mcp-client');
require('dotenv').config();

const NOISE_WORDS = new Set([
    // 疑问 / 客套
    '怎么', '如何', '为什么', '请问', '麻烦', '帮我', '谢谢', '求助',
    '会不会', '能不能', '有没有', '是否', '吗', '呢', '啊', '哦',
    // 操作动词
    '实现', '使用', '用', '做', '写', '让', '使', '给', '添加', '删除',
    '创建', '生成', '获取', '设置', '获得', '想', '要', '需要', '想要',
    '希望', '能够', '应该', '可以', '帮', '请',
    // 介词 / 代词
    '把', '被', '叫', '称', '从', '到', '在', '上', '下', '里', '外',
    '中', '间', '后', '前', '一个', '这个', '关于',
    // 无区分价值的词
    'layaair', 'laya', '引擎', '版本',
]);

class QuestionProcessor {
  constructor(db) {
    this.db = db;
    this.aiService = new AIService();
    this.aiUserId = parseInt(process.env.AI_USER_ID) || 4;
    this.mcpClient = new LayaMCPClient();
    this.mcpConnected = false;
  }

  /**
   * 从帖子标题和正文提炼 MCP 查询列表。
   * 返回：[{ tool: 'get_api_detail'|'query_api'|'query_docs', query: string }]
   * 调用方使用 tool 字段路由到对应 MCP 接口。
   */
  extractMCPQueries(title, content) {
    const text = (title || '') + ' ' + (content || '');
    const results = [];
    const seen = new Set();

    const add = (tool, query) => {
        const q = (query || '').trim();
        if (q && !seen.has(q)) {
            seen.add(q);
            results.push({ tool, query: q });
        }
    };

    // ── 1. Laya.类名.方法名 → get_api_detail（精确，最高优先）
    const classMethods = [...text.matchAll(/Laya\.([A-Z]\w+\.[a-z]\w+)/g)];
    classMethods.slice(0, 3).forEach(m => add('get_api_detail', m[1]));

    // ── 2. Laya.类名 → get_api_detail
    const layaClasses = [...text.matchAll(/Laya\.([A-Z]\w+)/g)];
    layaClasses.slice(0, 3).forEach(m => {
        if (!results.some(r => r.query.startsWith(m[1] + '.'))) {
            add('get_api_detail', m[1]);
        }
    });

    // ── 3. 裸类名（无 Laya. 前缀）→ get_api_detail
    const bareClasses = [...text.matchAll(/(?<![.\w])([A-Z][a-zA-Z0-9]{2,})\b/g)];
    bareClasses
        .map(m => m[1])
        .filter(name => !['LayaAir', 'IDE', 'API', 'HTML', 'URL', 'JSON'].includes(name))
        .slice(0, 3)
        .forEach(name => {
            if (!results.some(r => r.query === name || r.query.startsWith(name + '.'))) {
                add('get_api_detail', name);
            }
        });

    // ── 4. 报错信息 → query_api
    const errorMatch = text.match(
        /(TypeError|ReferenceError|Cannot\s+\w+|未定义)[^\n]{0,60}/i
    );
    if (errorMatch) add('query_api', errorMatch[0].trim().substring(0, 60));

    // ── 5. 继承链断点补查（向量搜索跨不过继承关系，必须显式补）
    const lowerText = text.toLowerCase();
    if (['点击', '事件', '监听', '回调', 'click', 'event', 'on(', '.on(']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'EventDispatcher');
    }
    if (['触摸', '滑动', '手势', 'touch', 'swipe'].some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Input');
    }
    if (['碰撞', '物理', '刚体', 'collision', 'rigidbody'].some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Physics3D');
    }
    if (['场景切换', '场景加载', 'loadscene'].some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Scene');
    }
    if (['资源加载', '预加载', 'loader', 'load('].some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Loader');
    }
    if (['定时', '计时', 'timer', 'setinterval', 'settimeout']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Timer');
    }

    // ── 6. 标题关键词 → query_docs
    const titleKw = this._extractKeywords(title, 4);
    if (titleKw) add('query_docs', titleKw);

    // ── 7. 补充正文关键词（查询不足 2 条时）
    if (results.length < 2) {
        const contentKw = this._extractKeywords(content, 4);
        if (contentKw) add('query_api', contentKw);
    }

    return results.slice(0, 5);
  }

  /**
   * 从文本中提炼技术核心词，去除自然语言噪音。
   * 依赖模块顶部的 NOISE_WORDS 常量。
   * @param {string} text
   * @param {number} maxWords 最多保留几个词
   * @returns {string}
   */
  _extractKeywords(text, maxWords = 4) {
      if (!text) return '';
      // 去 HTML 标签
      let clean = text.replace(/<[^>]*>/g, '');
      // 去标点
      clean = clean.replace(/[？?！!，,。.【】\[\]()（）「」""'']/g, ' ');

      const words = clean.split(/\s+/).filter(Boolean);

      // 优先级：大写开头 API 名 > 其他非噪音词
      const filtered = words.filter(w => {
          if (w.length < 2) return false;
          if (/^[A-Z][a-zA-Z0-9_]+$/.test(w)) return true;  // API 名，保留
          if (NOISE_WORDS.has(w.toLowerCase())) return false; // 噪音，去除
          return true;
      });

      const apiNames = filtered.filter(w => /^[A-Z]/.test(w));
      const others   = filtered.filter(w => !/^[A-Z]/.test(w));

      return [...apiNames, ...others].slice(0, maxWords).join(' ');
  }

  /**
   * 预过滤检查（v4.0 规范）
   * 以下情况不回复：吐槽、建议、招聘、灌水、内容太少、纯截图
   */
  shouldSkipReply(discussion) {
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    const cleanContent = stripHtml(discussion.content);
    const cleanTitle = discussion.title.trim();

    // 检查是否已有人工回复
    // 注意：这里不检查，因为这是首次回复
    
    // 帖子内容少于20字且无代码
    if (cleanContent.length < 20 && !cleanContent.includes('```') && !cleanContent.includes('代码')) {
      console.log(`   ⏭️  内容太少（${cleanContent.length}字），跳过`);
      return true;
    }

    // 检查是否是纯吐槽/灌水（简单判断）
    const spamKeywords = ['吐槽', '无语', '坑爹', '垃圾', '难受', '烦'];
    const hasSpamKeyword = spamKeywords.some(kw => 
      cleanContent.includes(kw) || cleanTitle.includes(kw)
    );
    if (hasSpamKeyword && cleanContent.length < 50) {
      console.log(`   ⏭️  识别为吐槽/灌水，跳过`);
      return true;
    }

    // 检查是否是招聘/求职
    const jobKeywords = ['招聘', '求职', '招人', '找工作', '招聘信息'];
    const isJobPost = jobKeywords.some(kw => 
      cleanTitle.includes(kw) || cleanContent.includes(kw)
    );
    if (isJobPost) {
      console.log(`   ⏭️  招聘/求职帖，跳过`);
      return true;
    }

    return false;
  }

  async ensureMCPConnected() {
    if (!this.mcpConnected) {
      try {
        console.log('   🔗 连接 MCP 服务器...');
        await this.mcpClient.connect();
        this.mcpConnected = true;
      } catch (error) {
        console.warn(`   ⚠️  MCP 连接失败: ${error.message}`);
        console.warn('   ⚠️  将不使用知识库上下文');
      }
    }
  }

  /**
   * 并行执行所有MCP查询，合并结果
   * @param {string} title
   * @param {string} content
   * @returns {Promise<{success: boolean, context: string}>}
   */
  async searchMCP(title, content) {
    await this.ensureMCPConnected();

    const queries = this.extractMCPQueries(title, content);

    if (queries.length === 0) {
      console.log('   ⚠️  没有提取到有效关键词');
      return { success: false, context: '' };
    }

    console.log(`\n   🔍 MCP 查询列表 (${queries.length}条):`);
    queries.forEach((q, i) => {
      console.log(`      ${i + 1}. [${q.tool}] "${q.query}"`);
    });

    // 并行执行所有查询
    const promises = queries.map(q =>
      this.mcpClient.search(q.tool, q.query).catch(err => {
        console.warn(`      ⚠️  [${q.tool}] "${q.query}" 失败: ${err.message}`);
        return null;
      })
    );

    const results = await Promise.all(promises);

    // 合并非空结果
    const contexts = results
      .filter(r => r && r.success && r.context)
      .map(r => r.context);

    if (contexts.length === 0) {
      console.log('   ⚠️  所有查询均无结果');
      return { success: false, context: '' };
    }

    const mergedContext = contexts.join('\n\n---\n\n');
    console.log(`   ✅ 查询成功，合并上下文 ${mergedContext.length} 字符`);

    return { success: true, context: mergedContext };
  }

  async processDiscussion(discussionId) {
    try {
      console.log(`\n⚙️  处理讨论 #${discussionId}...`);

      // 1. 获取讨论信息（带重试机制，等待数据库写入完成）
      let discussion = null;
      let retries = 0;
      const maxRetries = 5;

      while (!discussion && retries < maxRetries) {
        discussion = await this.db.getDiscussionById(discussionId);
        
        if (!discussion) {
          retries++;
          if (retries < maxRetries) {
            console.log(`   ⏳ 等待讨论数据写入... (${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
          }
        }
      }

      if (!discussion) {
        console.log(`   ❌ 讨论不存在（已重试${maxRetries}次）`);
        return;
      }

      console.log(`   📝 标题: ${discussion.title}`);
      console.log(`   👤 作者: ${discussion.username}`);
      console.log(`   📄 内容: ${discussion.content.substring(0, 100)}...`);

      // 2. 预过滤检查
      if (this.shouldSkipReply(discussion)) {
        console.log(`   ⏭️  预过滤：跳过此帖子`);
        return;
      }

      // 3. 检查是否已有 AI 回复
      const existingAnswers = await this.db.query(
        `SELECT COUNT(*) as count FROM posts WHERE discussion_id = ? AND user_id = ?`,
        [discussionId, this.aiUserId]
      );

      if (existingAnswers[0].count > 0) {
        console.log(`   ⏭️  已有 AI 回复，跳过`);
        return;
      }

      // 4. 查询 MCP 知识库（如果可用）
      console.log(`\n   📚 查询 LayaAir 知识库...`);
      const mcpResult = await this.searchMCP(discussion.title, discussion.content);
      const mcpContext = mcpResult.success ? mcpResult.context : '';

      // 5. 生成 AI 回答（带 MCP 上下文）
      console.log(`\n   🤖 调用 AI 生成回答...`);
      const result = await this.aiService.generateAnswer(discussion, mcpContext);

      if (!result.success) {
        console.log(`   ❌ AI 生成失败，使用备用答案`);
      }

      // 6. 发布回答
      const answer = result.answer;

      // 将 Markdown 转换为 HTML
      const htmlAnswer = marked.parse(answer);

      // 包装在 <t> 标签中（Flarum 格式要求）
      const formattedAnswer = `<t>${htmlAnswer}</t>`;

      console.log(`\n   📤 发布回答到论坛...`);
      
      // 获取当前讨论的帖子数量
      const postCount = await this.db.query(
        `SELECT COUNT(*) as count FROM posts WHERE discussion_id = ?`,
        [discussionId]
      );
      
      // AI 回复的 number = 当前帖子数 + 1
      const postNumber = postCount[0].count + 1;
      
      const insertResult = await this.db.query(
        `INSERT INTO posts (discussion_id, user_id, content, created_at, is_approved, number, type)
         VALUES (?, ?, ?, UTC_TIMESTAMP(), 1, ?, 'comment')`,
        [discussionId, this.aiUserId, formattedAnswer, postNumber]
      );

      // 更新讨论
      await this.db.query(
        `UPDATE discussions SET comment_count = comment_count + 1, last_posted_at = UTC_TIMESTAMP(), last_posted_user_id = ? WHERE id = ?`,
        [this.aiUserId, discussionId]
      );

      // 更新用户
      await this.db.query(
        `UPDATE users SET comment_count = comment_count + 1 WHERE id = ?`,
        [this.aiUserId]
      );

      if (insertResult.insertId) {
        console.log(`   ✅ 回复已发布 (帖子 ID: ${insertResult.insertId}, 序号: ${postNumber})`);
      } else {
        console.log(`   ❌ 发布失败`);
      }

      console.log(`\n   ✅ 处理完成\n`);

    } catch (error) {
      console.error(`   ❌ 处理失败:`, error.message);
    }
  }

  async testAI() {
    return await this.aiService.testConnection();
  }
}

module.exports = QuestionProcessor;
