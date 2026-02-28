/**
 * AI回复评分系统 - 后端API
 *
 * 功能：
 * 1. 提交评分
 * 2. 查询评分统计
 * 3. 检查用户是否已评价
 * 4. 获取AI回复质量报告
 */

const express = require('express');
const router = express.Router();

class RatingService {
  constructor(db) {
    this.db = db;
    this.aiUserId = parseInt(process.env.AI_USER_ID) || 4;
  }

  /**
   * 提交评分
   * POST /api/ratings
   */
  async submitRating(req, res) {
    try {
      const { post_id, discussion_id, rating, user_id, comment } = req.body;

      // 参数验证
      if (!post_id || !discussion_id || !rating) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数'
        });
      }

      // 验证评分类型
      const ratingTypes = {
        'helpful': 5,
        'partial': 3,
        'not_helpful': 1,
        'irrelevant': 0
      };

      if (!ratingTypes[rating]) {
        return res.status(400).json({
          success: false,
          error: '无效的评分类型'
        });
      }

      // 验证是否为AI回复
      const post = await this.db.query(
        'SELECT user_id, discussion_id FROM posts WHERE id = ?',
        [post_id]
      );

      if (post.length === 0) {
        return res.status(404).json({
          success: false,
          error: '帖子不存在'
        });
      }

      if (post[0].user_id !== this.aiUserId) {
        return res.status(400).json({
          success: false,
          error: '只能评价AI回复'
        });
      }

      // 检查是否已评价（防重复）
      const existing = await this.db.query(
        `SELECT id FROM ai_ratings
         WHERE post_id = ? AND (user_id = ? OR (user_id IS NULL AND ip_address = ?))`,
        [post_id, user_id || null, req.ip]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: '您已经评价过该回复'
        });
      }

      // 插入评分记录
      await this.db.query(
        `INSERT INTO ai_ratings
         (post_id, discussion_id, user_id, rating_type, rating_value, rating_comment, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [post_id, discussion_id, user_id || null, rating, ratingTypes[rating], comment || null, req.ip]
      );

      // 更新统计表
      await this.updateStats(post_id, discussion_id);

      res.json({
        success: true,
        message: '评分成功，感谢您的反馈！'
      });

    } catch (error) {
      console.error('提交评分失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  }

  /**
   * 更新评分统计
   */
  async updateStats(postId, discussionId) {
    // 计算统计数据
    const stats = await this.db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN rating_type = 'helpful' THEN 1 ELSE 0 END) as helpful,
        SUM(CASE WHEN rating_type = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN rating_type = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful,
        SUM(CASE WHEN rating_type = 'irrelevant' THEN 1 ELSE 0 END) as irrelevant,
        AVG(rating_value) as avg_score
       FROM ai_ratings
       WHERE post_id = ?`,
      [postId]
    );

    const stat = stats[0];

    // 插入或更新统计表
    await this.db.query(
      `INSERT INTO ai_rating_stats
       (post_id, discussion_id, total_ratings, helpful_count, partial_count,
        not_helpful_count, irrelevant_count, average_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_ratings = VALUES(total_ratings),
       helpful_count = VALUES(helpful_count),
       partial_count = VALUES(partial_count),
       not_helpful_count = VALUES(not_helpful_count),
       irrelevant_count = VALUES(irrelevant_count),
       average_score = VALUES(average_score)`,
      [postId, discussionId, stat.total, stat.helpful, stat.partial,
       stat.not_helpful, stat.irrelevant, stat.avg_score || 0]
    );
  }

  /**
   * 查询评分统计
   * GET /api/ratings/:post_id
   */
  async getRatings(req, res) {
    try {
      const { post_id } = req.params;

      const stats = await this.db.query(
        'SELECT * FROM ai_rating_stats WHERE post_id = ?',
        [post_id]
      );

      if (stats.length === 0) {
        return res.json({
          success: true,
          data: {
            post_id: parseInt(post_id),
            total_ratings: 0,
            helpful_count: 0,
            partial_count: 0,
            not_helpful_count: 0,
            irrelevant_count: 0,
            average_score: 0
          }
        });
      }

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('查询评分失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  }

  /**
   * 检查用户是否已评价
   * GET /api/ratings/:post_id/check
   */
  async checkRated(req, res) {
    try {
      const { post_id } = req.params;
      const { user_id } = req.query;

      const rating = await this.db.query(
        `SELECT rating_type, rating_value
         FROM ai_ratings
         WHERE post_id = ? AND user_id = ?`,
        [post_id, user_id || null]
      );

      res.json({
        success: true,
        data: {
          rated: rating.length > 0,
          rating: rating.length > 0 ? rating[0].rating_type : null
        }
      });

    } catch (error) {
      console.error('检查评价状态失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  }

  /**
   * 获取AI回复质量报告
   * GET /api/ratings/report
   */
  async getQualityReport(req, res) {
    try {
      const { limit = 50, min_ratings = 2 } = req.query;

      const report = await this.db.query(
        `SELECT * FROM v_ai_rating_report
         WHERE total_ratings >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [min_ratings, limit]
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('获取质量报告失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  }

  /**
   * 获取低分回复列表
   * GET /api/ratings/low-score
   */
  async getLowScoreReplies(req, res) {
    try {
      const { max_score = 3.0, min_ratings = 2 } = req.query;

      const replies = await this.db.query(
        `SELECT * FROM v_ai_rating_report
         WHERE average_score < ? AND total_ratings >= ?
         ORDER BY average_score ASC`,
        [max_score, min_ratings]
      );

      res.json({
        success: true,
        data: replies
      });

    } catch (error) {
      console.error('获取低分回复失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  }
}

// 导出路由
function createRatingRoutes(db) {
  const service = new RatingService(db);

  router.post('/ratings', (req, res) => service.submitRating(req, res));
  router.get('/ratings/:post_id', (req, res) => service.getRatings(req, res));
  router.get('/ratings/:post_id/check', (req, res) => service.checkRated(req, res));
  router.get('/ratings/report', (req, res) => service.getQualityReport(req, res));
  router.get('/ratings/low-score', (req, res) => service.getLowScoreReplies(req, res));

  return router;
}

module.exports = { RatingService, createRatingRoutes };
