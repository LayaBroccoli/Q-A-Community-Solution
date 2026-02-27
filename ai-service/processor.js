const AIService = require('./ai-service');
const Database = require('./db');
const { marked } = require('marked');
const LayaMCPClient = require('./mcp-client');
require('dotenv').config();

class QuestionProcessor {
  constructor(db) {
    this.db = db;
    this.aiService = new AIService();
    this.aiUserId = parseInt(process.env.AI_USER_ID) || 4;
    this.mcpClient = new LayaMCPClient();
    this.mcpConnected = false;
  }

  /**
   * 提取搜索关键词（v4.0 规范）
   * 原则：拆原子 → 去噪音 → 英文优先 → 不加 Laya. 前缀
   */
  extractSearchQuery(title, content) {
    // 去除HTML标签
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    };

    // 去噪音词（无效词列表）
    const noiseWords = new Set([
      '怎么', '如何', '我想', '实现', '请问', '关于', 'LayaAir', '引擎',
      '什么', '怎么', '怎么写', '如何写', '怎样', '吗', '呢', '啊',
      '使用', '通过', '可以', '需要', '有没有', '是否', '问题'
    ]);

    // 提取API名称（英文类名，不加Laya.前缀）
    const extractApiNames = (text) => {
      const matches = text.match(/[A-Z][a-zA-Z0-9_]*/g) || [];
      // 过滤掉常见的非API词
      return [...new Set(matches)]
        .filter(name => 
          name.length > 1 && 
          !noiseWords.has(name) &&
          name !== 'HTML' && 
          name !== 'URL' &&
          !name.startsWith('http')
        );
    };

    // 拆原子：从标题和内容中提取独立技术点
    const titleApis = extractApiNames(title);
    const cleanContent = stripHtml(content);
    const contentApis = extractApiNames(cleanContent);

    // 合并去重，最多4个词
    const allApis = [...new Set([...titleApis, ...contentApis])]
      .slice(0, 4)
      .filter(name => !name.includes('Laya')); // 去除带Laya前缀的

    // 如果找到API名称，直接使用
    if (allApis.length > 0) {
      return allApis.join(' ');
    }

    // 如果没有找到API名称，提取核心关键词（去噪音）
    const titleWords = title
      .replace(/[？?！!，,。.\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !noiseWords.has(word))
      .slice(0, 2);

    return titleWords.join(' ').substring(0, 50);
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
      await this.ensureMCPConnected();

      // 提取搜索关键词
      const searchQuery = this.extractSearchQuery(discussion.title, discussion.content);
      console.log(`   🔍 搜索关键词: "${searchQuery}"`);

      // 智能选择 MCP 工具并带重试机制
      let mcpDocResult = { success: false, context: '' };
      let mcpCodeResult = { success: false, context: '' };

      // 检查搜索查询是否包含多个关键词
      const keywords = searchQuery.split(' ').filter(k => k.length > 0);

      if (keywords.length > 1) {
        // 多个关键词：分别搜索每个关键词，然后合并结果
        console.log(`   📌 检测到${keywords.length}个关键词，分别搜索...`);

        const allDocResults = [];
        const allCodeResults = [];

        for (let i = 0; i < keywords.length; i++) {
          const keyword = keywords[i];
          console.log(`   📌 搜索${i + 1}/${keywords.length}: "${keyword}"`);

          const docResult = await this.mcpClient.searchDocumentation(keyword);
          const codeResult = await this.mcpClient.searchCode(keyword);

          if (docResult.success) allDocResults.push(docResult.context);
          if (codeResult.success) allCodeResults.push(codeResult.context);
        }

        // 合并所有结果
        mcpDocResult = {
          success: allDocResults.length > 0,
          context: allDocResults.join('\n\n---\n\n')
        };

        mcpCodeResult = {
          success: allCodeResults.length > 0,
          context: allCodeResults.join('\n\n---\n\n')
        };

        console.log(`   ✅ 合并结果: ${allDocResults.length}个文档 + ${allCodeResults.length}个API`);
      } else {
        // 单个关键词：直接搜索
        console.log(`   📌 搜索 "${searchQuery}"`);
        mcpDocResult = await this.mcpClient.searchDocumentation(searchQuery);
        mcpCodeResult = await this.mcpClient.searchCode(searchQuery);
      }

      // 合并 MCP 上下文
      const mcpContext = `
${mcpDocResult.context}

${mcpCodeResult.context}
`;

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
