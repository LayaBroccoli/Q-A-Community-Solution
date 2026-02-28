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
   * v4.0 规范：拆原子、去噪音、≤4词、继承链补查
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
        .filter(name => !['LayaAir', 'IDE', 'API', 'HTML', 'URL', 'JSON', 'FBX', 'GLTF'].includes(name))
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

    // ── 5. 继承链断点补查（v4.0 新增完整规则）
    const lowerText = text.toLowerCase();

    // 事件/回调相关
    if (['点击', '事件', '监听', '回调', 'click', 'event', 'on(', '.on(']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'EventDispatcher');
    }

    // 输入/触摸相关
    if (['触摸', '滑动', '手势', 'touch', 'swipe', '输入', 'input', '键盘', 'keyboard']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Input');
    }

    // 物理相关
    if (['碰撞', '物理', '刚体', 'collision', 'rigidbody', '物理引擎', 'physics']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Physics3D');
        add('get_api_detail', 'Physics2D');
    }

    // 场景相关
    if (['场景切换', '场景加载', 'loadscene', 'openscene', '场景管理', 'scene']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Scene');
        add('get_api_detail', 'Scene2D');
        add('get_api_detail', 'Scene3D');
    }

    // 资源加载相关
    if (['资源加载', '预加载', 'loader', 'load(', '资源管理', 'asset']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Loader');
    }

    // 定时器相关
    if (['定时', '计时', 'timer', 'setinterval', 'settimeout', '帧循环', 'frame_loop']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Timer');
        add('get_api_detail', 'Stat');
    }

    // 动画相关
    if (['动画', 'animation', 'animator', '骨骼', 'spine', 'dragonbones']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'Animator');
        add('get_api_detail', 'Animation');
    }

    // UI相关
    if (['ui', '界面', '按钮', 'button', '列表', 'list', '面板', 'panel', '对话框', 'dialog']
            .some(k => lowerText.includes(k))) {
        add('get_api_detail', 'UIComponent');
        add('get_api_detail', 'Button');
        add('get_api_detail', 'List');
    }

    // ── 6. 标题关键词提炼（≤4词）
    const titleKw = this._extractKeywords(title, 4);
    if (titleKw) add('query_docs', titleKw);

    // ── 7. 补充正文关键词（查询不足 2 条时）
    if (results.length < 2) {
        const contentKw = this._extractKeywords(content, 4);
        if (contentKw) add('query_api', contentKw);
    }

    // 最多返回5个查询
    return results.slice(0, 5);
  }

  /**
   * 从文本中提炼技术核心词，去除自然语言噪音。
   * v4.0 规范：删除噪音词、≤4词、英文类名优先
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
   * 帖子类型判断（v4.0 核心功能）
   * 返回类型：非技术帖/功能建议/用户已解决/极简帖子/多问题帖子/技术问题
   */
  classifyPost(discussion) {
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    const cleanContent = stripHtml(discussion.content);
    const cleanTitle = discussion.title.trim();
    const text = (cleanTitle + ' ' + cleanContent).toLowerCase();

    // 调试日志
    console.log(`   [classifyPost] cleanTitle: "${cleanTitle}"`);
    console.log(`   [classifyPost] cleanContent: "${cleanContent}"`);
    console.log(`   [classifyPost] text: "${text}"`);

    // 策略 A：非技术帖（招聘/外包/闲聊/广告）
    const jobKeywords = ['招聘', '求职', '招人', '找工作', '招聘信息', '外包', '合作'];
    const chatKeywords = ['大家好', '新人报到', '签到', '闲聊', '聊天'];
    if (jobKeywords.some(kw => text.includes(kw)) ||
        chatKeywords.some(kw => text.includes(kw))) {
      return '非技术帖';
    }

    // 策略 B：功能建议（v4.0规范）
    // 匹配模式：关键词可以不连续，但要都出现在text中
    const suggestKeywordGroups = [
      ['希望', '支持'],  // "希望...支持"
      ['建议', '增加'],  // "建议...增加"
      ['能不能', '加'],  // "能不能...加"
      ['能不能', '支持'], // "能不能...支持"
      ['期待'],
      ['希望', '有'],    // "希望...有"
      ['功能', '建议'],
      ['建议'],
      ['能不能', '实现']
    ];

    for (const group of suggestKeywordGroups) {
      if (group.every(kw => text.includes(kw))) {
        console.log(`   [classifyPost] 匹配到功能建议关键词: ${group.join(' + ')}`);
        return '功能建议';
      }
    }

    // 策略 C：用户已自行解决
    const solvedKeywords = ['搞定了', '已解决', '解决了', '我搞错了', '是我错了', '找到原因了',
                           '已修复', '没问题了', '可以了', '成功了'];
    if (solvedKeywords.some(kw => text.includes(kw))) {
      return '用户已解决';
    }

    // 策略 D：极简帖子
    if (cleanTitle.length < 5 && cleanContent.length < 20) {
      return '极简帖子';
    }

    // 策略 E：多问题帖子（正文含 ≥ 3 个独立问题）
    const questionMarks = (cleanContent.match(/\?|？|怎么|如何|为什么/g) || []).length;
    if (questionMarks >= 3) {
      return '多问题帖子';
    }

    // 策略 F：技术问题（默认）
    return '技术问题';
  }

  /**
   * 预过滤检查（v4.0 规范）
   * 以下情况跳过：纯灌水/广告、已有官方人工回复且已解决、纯截图无文字
   * 注意：功能建议、求职招聘不跳过
   */
  shouldSkipReply(discussion) {
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    const cleanContent = stripHtml(discussion.content);
    const cleanTitle = discussion.title.trim();

    // 检查是否已有人工回复（这部分在实际处理中会检查）
    // 这里暂时跳过，因为这是首次回复逻辑

    // 纯灌水/广告检测
    const spamKeywords = ['加群', '代练', '卖号', '外挂', '刷单', '菠菜', '博彩'];
    if (spamKeywords.some(kw => cleanContent.includes(kw) || cleanTitle.includes(kw))) {
      console.log(`   ⏭️  识别为灌水/广告，跳过`);
      return true;
    }

    // 纯截图无文字描述
    if (cleanContent.length < 10 && !cleanContent.includes('```')) {
      console.log(`   ⏭️  纯截图无文字描述，跳过`);
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
    return this.mcpConnected;
  }

  /**
   * 查询 MCP 获取上下文（v4.0 规范）
   */
  async queryMCP(title, content) {
    const mcpConnected = await this.ensureMCPConnected();
    if (!mcpConnected) return '';

    const queries = this.extractMCPQueries(title, content);
    if (queries.length === 0) return '';

    console.log(`\n   🔍 执行 ${queries.length} 个 MCP 查询...`);
    let mcpContext = '';

    for (const q of queries) {
      try {
        console.log(`      [${q.tool}] ${q.query}`);
        let result = null;

        // 根据tool字段路由到对应的MCP接口
        if (q.tool === 'get_api_detail') {
          result = await this.mcpClient.getApiDetail(q.query);
        } else if (q.tool === 'query_docs') {
          result = await this.mcpClient.queryDocs(q.query);
        } else {
          result = await this.mcpClient.queryApi(q.query);
        }

        if (result && result.content) {
          mcpContext += this.formatMCPResult(result);
          console.log(`         ✅ 找到 ${result.api_entries?.length || 0} 个API, ` +
                     `${result.doc_links?.length || 0} 个文档`);
        } else {
          console.log(`         ⚠️  无结果`);
        }

        // 短暂延迟，避免过快请求
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`         ❌ 查询失败: ${error.message}`);
      }
    }

    return mcpContext;
  }

  /**
   * 格式化 MCP 结果为 Markdown（v4.0 规范）
   */
  formatMCPResult(result) {
    let out = '';

    if (result.api_entries && result.api_entries.length > 0) {
      out += '### API 参考\n\n';
      for (const api of result.api_entries) {
        out += `**${api.name}** (${api.type}) - ${api.description}\n`;
        if (api.signature) {
          out += '```typescript\n' + api.signature + '\n```\n';
        }
      }
      out += '\n';
    }

    if (result.doc_content && result.doc_content.trim()) {
      out += '### 文档内容\n\n';
      out += result.doc_content.substring(0, 2000) + '\n\n';
    }

    if (result.doc_links && result.doc_links.length > 0) {
      out += '### 文档链接\n\n';
      for (const link of result.doc_links) {
        out += `- [${link.title}](${link.url})\n`;
      }
      out += '\n';
    }

    return out;
  }

  /**
   * 处理单个讨论（v4.0 完整流程）
   */
  async processDiscussion(discussion) {
    try {
      console.log(`\n📋 处理讨论 #${discussion.id}: ${discussion.title}`);
      console.log(`   用户: ${discussion.username}`);
      console.log(`   链接: http://43.128.56.125/d/${discussion.id}`);

      // 1. 帖子类型判断（v4.0 核心，必须先执行）
      const postType = this.classifyPost(discussion);
      console.log(`   📝 帖子类型: ${postType}`);

      // 2. 预过滤检查（只对技术问题执行）
      // 功能建议、非技术帖、用户已解决、极简帖子、多问题帖子都不过滤
      if (postType === '技术问题') {
        if (this.shouldSkipReply(discussion)) {
          console.log(`   ⏭️  跳过此帖\n`);
          return;
        }
      } else {
        console.log(`   ℹ️  ${postType}，跳过预过滤检查`);
      }

      // 3. 版本检测
      const detectedVersion = this.aiService.detectVersion(discussion.title, discussion.content);
      console.log(`   🔧 版本: ${detectedVersion}`);

      // 3. MCP 检索
      console.log(`\n   📚 检索知识库...`);
      const mcpContext = await this.queryMCP(discussion.title, discussion.content);
      const hasMcp = mcpContext.trim().length > 0;
      console.log(`   ${hasMcp ? '✅' : '⚠️ '}  MCP 结果: ${hasMcp ? '有' : '无'}`);

      // 4. 生成 AI 回答（v4.0 规范）
      console.log(`\n   🤖 调用 AI 生成回答...`);
      const result = await this.aiService.generateAnswer(
        discussion,
        mcpContext,
        postType  // 传入帖子类型
      );

      if (!result.success) {
        console.log(`   ❌ AI 生成失败，跳过回复`);
        return;
      }

      // 5. 发布回答
      const answer = result.answer;
      const htmlAnswer = marked.parse(answer);
      const formattedAnswer = `<t>${htmlAnswer}</t>`;

      console.log(`\n   📤 发布回答到论坛...`);

      const discussionId = discussion.id;

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
