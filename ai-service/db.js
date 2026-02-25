const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'flarum',
      password: process.env.DB_PASSWORD || 'Flarum@2026!',
      database: process.env.DB_NAME || 'flarum',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+08:00' // 设置为北京时间 UTC+8
    });
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  async getNewDiscussions(limit = 10) {
    const sql = `
      SELECT 
        d.id,
        d.title,
        d.first_post_id,
        d.user_id,
        d.created_at,
        u.username,
        p.content
      FROM discussions d
      JOIN users u ON d.user_id = u.id
      JOIN posts p ON d.first_post_id = p.id
      ORDER BY d.created_at DESC
      LIMIT ?
    `;
    return await this.query(sql, [limit]);
  }

  async getDiscussionById(discussionId) {
    const sql = `
      SELECT 
        d.id,
        d.title,
        d.first_post_id,
        d.user_id,
        d.created_at,
        d.slug,
        u.username,
        u.email,
        p.content
      FROM discussions d
      JOIN users u ON d.user_id = u.id
      JOIN posts p ON d.first_post_id = p.id
      WHERE d.id = ?
    `;
    const rows = await this.query(sql, [discussionId]);
    return rows[0];
  }

  async insertAIAnswer(discussionId, content, authorId = 4) {
    // AI助手用户ID默认是4
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 插入帖子
      const [postResult] = await connection.execute(
        `INSERT INTO posts (discussion_id, user_id, content, created_at, edited_at, is_approved, number)
         VALUES (?, ?, ?, NOW(), NULL, 1, 1)`,
        [discussionId, authorId, content]
      );

      const postId = postResult.insertId;

      // 更新讨论的评论数
      await connection.execute(
        `UPDATE discussions SET comment_count = comment_count + 1, last_posted_at = NOW(), last_posted_user_id = ? WHERE id = ?`,
        [authorId, discussionId]
      );

      // 更新用户的评论数
      await connection.execute(
        `UPDATE users SET comment_count = comment_count + 1 WHERE id = ?`,
        [authorId]
      );

      await connection.commit();
      return { success: true, postId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
