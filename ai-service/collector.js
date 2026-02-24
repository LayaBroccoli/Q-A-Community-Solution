const Database = require('./db');
require('dotenv').config();

class QuestionCollector {
  constructor(db) {
    this.db = db;
    this.lastCheckTime = new Date();
    this.processedDiscussions = new Set();
  }

  async start() {
    console.log('🔍 问题采集器启动...');
    console.log(`⏰ 轮询间隔: 30秒`);
    console.log(`🕐 开始时间: ${this.lastCheckTime.toLocaleString('zh-CN')}\n`);

    // 每30秒检查一次
    setInterval(async () => {
      await this.checkNewDiscussions();
    }, 30000); // 30秒

    // 立即执行一次
    await this.checkNewDiscussions();
  }

  async checkNewDiscussions() {
    try {
      console.log(`\n🔍 检查新讨论... (${new Date().toLocaleString('zh-CN')})`);

      const discussions = await this.db.query(
        `SELECT id, title, created_at 
         FROM discussions 
         WHERE created_at > ?
         ORDER BY created_at DESC`,
        [this.lastCheckTime]
      );

      if (discussions.length > 0) {
        console.log(`✅ 发现 ${discussions.length} 个新讨论:`);

        for (const discussion of discussions) {
          // 避免重复处理
          if (this.processedDiscussions.has(discussion.id)) {
            continue;
          }

          this.processedDiscussions.add(discussion.id);

          console.log(`\n  📝 ID: ${discussion.id}`);
          console.log(`  标题: ${discussion.title}`);
          console.log(`  时间: ${discussion.created_at}`);

          // 触发处理
          await this.processDiscussion(discussion.id);
        }

        // 更新最后检查时间
        this.lastCheckTime = new Date();
      } else {
        console.log('  暂无新讨论');
      }

      // 清理旧的已处理记录（保留最近100个）
      if (this.processedDiscussions.size > 100) {
        const arr = Array.from(this.processedDiscussions);
        this.processedDiscussions = new Set(arr.slice(-100));
      }

    } catch (error) {
      console.error('❌ 检查新讨论时出错:', error.message);
    }
  }

  async processDiscussion(discussionId) {
    try {
      console.log(`\n  ⚙️  处理讨论 #${discussionId}...`);

      // 获取完整讨论信息
      const discussion = await this.db.getDiscussionById(discussionId);

      if (!discussion) {
        console.log(`  ❌ 无法找到讨论详情`);
        return;
      }

      // TODO: 这里可以调用分类引擎和 AI 回答服务
      console.log(`  📊 问题信息:`);
      console.log(`     - 标题: ${discussion.title}`);
      console.log(`     - 作者: ${discussion.username}`);
      console.log(`     - 内容: ${discussion.content.substring(0, 100)}...`);
      console.log(`  ✅ 讨论已记录，等待后续处理`);

      // 触发后续处理（可以发送到队列或直接处理）
      // await this.classifyAndAnswer(discussion);

    } catch (error) {
      console.error(`  ❌ 处理讨论 #${discussionId} 失败:`, error.message);
    }
  }

  async classifyAndAnswer(discussion) {
    // TODO: 实现分类和 AI 回答
    console.log(`  🤖 AI 处理中... (功能开发中)`);
  }
}

module.exports = QuestionCollector;
