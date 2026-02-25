const AIService = require('./ai-service');
const Database = require('./db');
require('dotenv').config();

class QuestionProcessor {
  constructor(db) {
    this.db = db;
    this.aiService = new AIService();
    this.aiUserId = parseInt(process.env.AI_USER_ID) || 4;
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

      // 3. 生成 AI 回答
      console.log(`\n   🤖 调用 AI 生成回答...`);
      const result = await this.aiService.generateAnswer(discussion);

      if (!result.success) {
        console.log(`   ❌ AI 生成失败，使用备用答案`);
      }

      // 4. 发布回答
      const answer = result.answer;
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
         VALUES (?, ?, ?, NOW(), 1, ?, 'comment')`,
        [discussionId, this.aiUserId, answer, postNumber]
      );

      // 更新讨论
      await this.db.query(
        `UPDATE discussions SET comment_count = comment_count + 1, last_posted_at = NOW(), last_posted_user_id = ? WHERE id = ?`,
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
