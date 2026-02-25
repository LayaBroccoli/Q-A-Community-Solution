const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'flarum',
  password: 'Flarum@2026!',
  database: 'flarum',
  timezone: '+08:00'
});

async function cleanCustomTags() {
  const postId = 37; // 讨论 #19 的 AI 回复

  // 读取当前内容
  const [rows] = await db.execute(
    'SELECT content FROM posts WHERE id = ?',
    [postId]
  );

  if (rows.length === 0) {
    console.log('帖子不存在');
    process.exit(1);
  }

  let content = rows[0].content;
  console.log('原内容长度:', content.length);

  // 移除 <t> 和 </t>
  content = content.replace(/^<t>/, '').replace(/<\/t>$/, '');

  // 移除所有自定义 XML 标签，保留内容
  const tagPatterns = [
    /<H2>/g, /<\/H2>/g,
    /<H3>/g, /<\/H3>/g,
    /<s>/g, /<\/s>/g,
    /<e>/g, /<\/e>/g,
    /<STRONG>/g, /<\/STRONG>/g,
    /<CODE[^>]*>/g, /<\/CODE>/g,
    /<LIST[^>]*>/g, /<\/LIST>/g,
    /<LI>/g, /<\/LI>/g,
    /<r>/g, /<\/r>/g,
    /<URL[^>]*>.*?<\/URL>/g, // 移除 URL 标签，保留里面的链接
    /<C>/g, /<\/C>/g, // 代码标签
  ];

  tagPatterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  // 添加 <t> 标签
  content = `<t>${content}</t>`;

  // 更新数据库
  await db.execute(
    'UPDATE posts SET content = ? WHERE id = ?',
    [content, postId]
  );

  console.log('✅ 自定义标签已清理');
  console.log('新内容长度:', content.length);
  console.log('新内容预览:', content.substring(0, 200));

  await db.end();
}

cleanCustomTags().catch(console.error);
