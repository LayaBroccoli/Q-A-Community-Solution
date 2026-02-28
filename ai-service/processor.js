const AIService = require('./ai-service');
const Database = require('./db');
const { marked } = require('marked');
const LayaMCPClient = require('./mcp-client');
require('dotenv').config();

// ============================================================
// 噪音词列表（全局常量）
// ============================================================
const NOISE_WORDS = new Set([
  // 基础疑问词
  '怎么', '如何', '什么', '为什么', '哪里', '哪个', '哪些', '怎样', '如何',
  // 动词
  '实现', '问题', '请问', '关于', '我想', '可以', '帮我', '谢谢', '求助',
  '使用', '用', '给', '添加', '删除', '创建', '生成', '获取', '设置', '获得',
  '写', '做', '让', '使', '把', '被', '叫', '称', '为', '从', '到', '在',
  '想', '要', '需要', '想要', '希望', '应该', '能够', '能够',
  // 介词/连词
  '通过', '根据', '按照', '由于', '因为', '所以', '但是', '然后', '接着',
  '最后', '如果', '虽然', '还是', '或者', '而且', '并且',
  // 代词
  '一个', '这个', '那个', '哪些', '什么', '有些',
  // 助词
  '的', '了', '吗', '呢', '啊', '哦', '呀', '嘛', '吧', '着', '过',
  // 方位词
  '上', '下', '里', '外', '中', '间', '后', '前', '左', '右',
  // 常见通用词
  'layaair', 'laya', '引擎', '版本', '代码', '方法', '功能', '效果', '东西',
  '情况', '时候', '位置', '地方', '部分', '内容', '类型', '方式', '状态'
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
   * 从文本中提炼技术核心词，去自然语言噪音
   * @param {string} text - 输入文本
   * @param {number} maxWords - 最多返回几个词
   * @returns {string} 提取的关键词（空格分隔）
   */
  _extractKeywords(text, maxWords = 4) {
    // 去HTML标签
    const clean = text.replace(/<[^>]*>/g, '');

    // 去标点
    const noPunctuation = clean.replace(/[？?！!，,。.【】\[\]()（）「」""''\s]/g, ' ');

    // 分词
    const words = noPunctuation.split(/\s+/);

    // 优先级排序：API名称 > 中文技术词 > 普通词
    const prioritized = words.filter(w => {
      // 1. 去除单字符
      if (w.length < 2) return false;

      // 2. 去除噪音词
      if (NOISE_WORDS.has(w.toLowerCase())) return false;

      // 3. 优先保留：大写开头的API名称
      if (/^[A-Z][a-zA-Z0-9_]*$/.test(w)) return true;

      // 4. 保留：中文词（2个字以上）
      if (/^[\u4e00-\u9fa5]{2,}$/.test(w)) return true;

      // 5. 保留：数字+字母组合（如 3D, 2D, PLY）
      if (/^[A-Za-z0-9]+$/.test(w)) return true;

      return false;
    });

    return prioritized.slice(0, maxWords).join(' ');
  }

  /**
   * 从帖子中提炼 MCP 查询列表
   * 返回格式：[{ tool: 'get_api_detail' | 'query_api' | 'query_docs', query: string }]
   *
   * 优先级：
   * 1. Laya.类名.方法名 → get_api_detail（精确查询）
   * 2. Laya.类名 → get_api_detail（精确查询）
   * 3. 报错信息 → query_api
   * 4. 标题提炼 → query_docs
   * 5. 正文补充 → query_api
   */
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
    const errorMatch = text.match(/(TypeError|ReferenceError|Cannot\s+\w+|未定义)[^\n]{0,60}/i);
    if (errorMatch) add('query_api', errorMatch[0].trim().substring(0, 60));

    // ── 5. 继承链断点补查（向量搜索跨不过继承关系，必须显式补）
    const lowerText = text.toLowerCase();
    if (['点击', '事件', '监听', '回调', 'click', 'event', 'on(', '.on('].some(k => lowerText.includes(k))) {
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
    if (['定时', '计时', 'timer', 'setinterval', 'settimeout'].some(k => lowerText.includes(k))) {
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

    console.log(`   ✅ 成功: ${contexts.length}/${queries.length} 条查询有结果`);

    // 搜索失败时用更短的词重试一次
    if (contexts.length === 0) {
      console.log('   ⚠️  首次搜索无结果，尝试简化关键词重试...');
      const retryQuery = this._extractKeywords(title, 2);
      if (retryQuery) {
        try {
          const retryResult = await this.mcpClient.search('query_api', retryQuery);
          if (retryResult && retryResult.context) {
            contexts.push(retryResult.context);
            console.log(`   ✅ 重试成功: "${retryQuery}"`);
          }
        } catch (err) {
          console.warn(`   ⚠️  重试失败: ${err.message}`);
        }
      }
    }

    return {
      success: contexts.length > 0,
      context: contexts.join('\n\n---\n\n'),
    };
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
   * 预过滤检查（v4.0 规范）
   * 以下情况不回复：吐槽、建议、招聘、灌水、内容太少、纯截图
   */
  shouldSkipReply(discussion) {
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    const title = stripHtml(discussion.title);
    const content = stripHtml(discussion.content);
    const fullText = (title + ' ' + content).toLowerCase();

    // 规则1: 内容太少（<20字符）
    if (fullText.length < 20) {
      console.log(`   ⏭️  预过滤：内容太少 (${fullText.length} 字符)`);
      return true;
    }

    // 规则2: 纯截图或附件（没有文字内容）
    if (content.length < 10) {
      console.log(`   ⏭️  预过滤：纯截图/附件`);
      return true;
    }

    // 规则3: 吐槽/抱怨（关键词：垃圾,烂,恶心,烦,烦死了,无语）
    const complainKeywords = ['垃圾', '烂', '恶心', '烦死了', '无语', '坑', 'bug一堆'];
    if (complainKeywords.some(k => fullText.includes(k))) {
      console.log(`   ⏭️  预过滤：吐槽/抱怨`);
      return true;
    }

    // 规则4: 招聘信息（关键词：招聘,招人,岗位,职位,简历）
    const jobKeywords = ['招聘', '招人', '岗位', '职位', '简历', '面试'];
    if (jobKeywords.some(k => fullText.includes(k))) {
      console.log(`   ⏭️  预过滤：招聘信息`);
      return true;
    }

    // 规则5: 建议/反馈（关键词：建议,希望,能不能加,求支持）
    const suggestionKeywords = ['建议', '希望', '能不能加', '求支持', '求功能'];
    if (suggestionKeywords.some(k => fullText.includes(k))) {
      console.log(`   ⏭️  预过滤：建议/反馈`);
      return true;
    }

    // 规则6: 灌水（重复字符超过5次）
    const repeatPattern = /(.)\1{5,}/;
    if (repeatPattern.test(fullText)) {
      console.log(`   ⏭️  预过滤：灌水（重复字符）`);
      return true;
    }

    return false;
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

      // 4. 查询 MCP 知识库（并行搜索）
      console.log(`\n   📚 查询 LayaAir 知识库...`);
      const mcpResult = await this.searchMCP(discussion.title, discussion.content);

      const mcpContext = mcpResult.success ? mcpResult.context : '';

      if (mcpContext) {
        console.log(`   ✅ 获取到 ${mcpContext.length} 字符的上下文`);
      } else {
        console.log(`   ⚠️  未获取到上下文，AI将根据常识回答`);
      }

      // 5. 生成 AI 回答（带 MCP 上下文）
      console.log(`\n   🤖 调用 AI 生成回答...`);
      const result = await this.aiService.generateAnswer(discussion, mcpContext);

      if (!result.success) {
        console.log(`   ❌ AI 生成失败，使用备用答案`);
      }

      // 6. 发布回答
      const answer = result.answer;

      // 检查空内容
      if (!answer || answer.trim().length < 10) {
        console.log(`   ❌ AI 回复内容为空或太短，跳过发布`);
        return;
      }

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

      console.log(`   ✅ 回复已发布 (帖子 ID: ${insertResult.insertId}, 序号: ${postNumber})`);
      console.log(`   📊 回复长度: ${answer.length} 字符`);

      // 7. 更新讨论的评论数（Flarum 要求）
      await this.db.query(
        `UPDATE discussions SET comment_count = comment_count + 1, last_posted_at = UTC_TIMESTAMP() WHERE id = ?`,
        [discussionId]
      );

      console.log(`   ✅ 处理完成`);

    } catch (error) {
      console.error(`   ❌ 处理讨论 #${discussionId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 测试 AI 连接
   */
  async testAI() {
    try {
      console.log('\n🧪 测试 AI 连接...');
      const result = await this.aiService.generate({
        messages: [{ role: 'user', content: '你好' }]
      });
      console.log('✅ AI 连接正常');
    } catch (error) {
      console.error('❌ AI 连接失败:', error.message);
    }
  }
}

module.exports = QuestionProcessor;
