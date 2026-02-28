-- AI回复评分系统 - 数据库迁移脚本
-- 版本: v1.0
-- 日期: 2026-02-28

USE flarum;

-- ============================================================
-- 表1: AI评分表（存储每次评价）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_ratings (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '评分ID',
  post_id INT NOT NULL COMMENT 'AI回复的帖子ID',
  discussion_id INT NOT NULL COMMENT '讨论ID',
  user_id INT DEFAULT NULL COMMENT '评价用户ID（NULL表示匿名）',
  rating_type VARCHAR(20) NOT NULL COMMENT '评分类型: helpful/partial/not_helpful/irrelevant',
  rating_value INT NOT NULL COMMENT '评分值: 5/3/1/0',
  rating_comment TEXT DEFAULT NULL COMMENT '评价备注',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址（防止刷分）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '评价时间',

  INDEX idx_post_id (post_id),
  INDEX idx_discussion_id (discussion_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rating_type (rating_type),
  INDEX idx_created_at (created_at),

  UNIQUE KEY uk_user_post (user_id, post_id) COMMENT '防止重复评价'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI回复评分记录表';

-- ============================================================
-- 表2: AI评分统计表（存储汇总数据）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rating_stats (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '统计ID',
  post_id INT NOT NULL UNIQUE COMMENT 'AI回复的帖子ID',
  discussion_id INT NOT NULL COMMENT '讨论ID',
  total_ratings INT DEFAULT 0 COMMENT '总评价数',
  helpful_count INT DEFAULT 0 COMMENT '解决问题数',
  partial_count INT DEFAULT 0 COMMENT '部分解决数',
  not_helpful_count INT DEFAULT 0 COMMENT '未解决数',
  irrelevant_count INT DEFAULT 0 COMMENT '不相关数',
  average_score DECIMAL(3,2) DEFAULT 0.00 COMMENT '平均分',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  INDEX idx_discussion_id (discussion_id),
  INDEX idx_average_score (average_score),
  INDEX idx_total_ratings (total_ratings)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI回复评分统计表';

-- ============================================================
-- 测试数据（可选）
-- ============================================================
-- 插入测试评分
-- INSERT INTO ai_ratings (post_id, discussion_id, user_id, rating_type, rating_value, ip_address)
-- VALUES
--   (123, 45, 1, 'helpful', 5, '127.0.0.1'),
--   (123, 45, 2, 'helpful', 5, '127.0.0.2'),
--   (123, 45, 3, 'partial', 3, '127.0.0.3');

-- ============================================================
-- 视图1: AI回复质量报告
-- ============================================================
CREATE OR REPLACE VIEW v_ai_rating_report AS
SELECT
  p.id as post_id,
  p.discussion_id,
  d.title as discussion_title,
  d.slug as discussion_slug,
  p.content as post_content,
  p.created_at as post_created_at,
  s.total_ratings,
  s.helpful_count,
  s.partial_count,
  s.not_helpful_count,
  s.irrelevant_count,
  s.average_score,
  CASE
    WHEN s.total_ratings = 0 THEN '无评分'
    WHEN s.average_score >= 4.5 THEN '优秀'
    WHEN s.average_score >= 3.5 THEN '良好'
    WHEN s.average_score >= 2.5 THEN '一般'
    WHEN s.average_score >= 1.5 THEN '较差'
    ELSE '很差'
  END as quality_level,
  ROUND((s.helpful_count / NULLIF(s.total_ratings, 0)) * 100, 1) as helpful_rate
FROM posts p
JOIN discussions d ON p.discussion_id = d.id
LEFT JOIN ai_rating_stats s ON p.id = s.post_id
WHERE p.user_id = 4  -- AI用户ID
ORDER BY p.created_at DESC;

-- ============================================================
-- 验证表结构
-- ============================================================
-- SHOW CREATE TABLE ai_ratings;
-- SHOW CREATE TABLE ai_rating_stats;
-- SELECT * FROM v_ai_rating_report LIMIT 10;

-- ============================================================
-- 完成
-- ============================================================
SELECT '✅ AI评分系统数据库表创建完成！' as status;
