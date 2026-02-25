const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'flarum',
  password: 'Flarum@2026!',
  database: 'flarum',
  timezone: '+08:00'
});

async function fixPostContent() {
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
  console.log('原内容前100字符:', content.substring(0, 100));

  // 移除外层的 <r> 标签，添加 <t> 标签
  if (content.startsWith('<r>')) {
    content = content.substring(3); // 移除 <r>
    content = content.substring(0, content.length - 4); // 移除 </r>
    content = `<t>${content}</t>`; // 添加 <t>

    // 更新数据库
    await db.execute(
      'UPDATE posts SET content = ? WHERE id = ?',
      [content, postId]
    );

    console.log('✅ 帖子内容已修复');
  } else {
    console.log('⚠️ 内容格式不是 <r> 开头，跳过');
  }

  await db.end();
}

fixPostContent().catch(console.error);
