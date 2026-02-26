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

      // 1. 获取讨论信息
      const discussion = await this.db.getDiscussionById(discussionId);
      if (!discussion) {
        console.log(`   ❌ 讨论不存在`);
        return;
      }

      console.log(`   📝 标题: ${discussion.title}`);
      console.log(`   👤 作者: ${discussion.username}`);
      console.log(`   📄 内容: ${discussion.content.substring(0, 100)}...`);

      // 2. 检查是否已有 AI 回复
      const existingAnswers = await this.db.query(
        `SELECT COUNT(*) as count FROM posts WHERE discussion_id = ? AND user_id = ?`,
        [discussionId, this.aiUserId]
      );

      if (existingAnswers[0].count > 0) {
        console.log(`   ⏭️  已有 AI 回复，跳过`);
        return;
      }

      // 3. 查询 MCP 知识库（如果可用）
      console.log(`\n   📚 查询 LayaAir 知识库...`);
      await this.ensureMCPConnected();

      const mcpDocResult = await this.mcpClient.searchDocumentation(
        `${discussion.title} ${discussion.content}`
      );

      const mcpCodeResult = await this.mcpClient.searchCode(
        discussion.title
      );

      // 合并 MCP 上下文
      const mcpContext = `
${mcpDocResult.context}

${mcpCodeResult.context}
`;

      // 4. 生成 AI 回答（带 MCP 上下文）
      console.log(`\n   🤖 调用 AI 生成回答...`);
      const result = await this.aiService.generateAnswer(discussion, mcpContext);

      if (!result.success) {
        console.log(`   ❌ AI 生成失败，使用备用答案`);
      }

      // 4. 发布回答
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
