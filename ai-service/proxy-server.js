const http = require('http');
const httpProxy = require('http');

// 目标API服务器
const TARGET_HOST = 'localhost';
const TARGET_PORT = 3000;

// 创建代理服务器
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  // 处理OPTIONS preflight请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // 转发请求到目标服务器
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${TARGET_HOST}:${TARGET_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // 添加CORS头到响应
    const headers = {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);

    console.log(`✅ ${req.method} ${req.url} → ${proxyRes.statusCode}`);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ 代理错误:', err.message);

    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: false,
      error: '代理服务器错误: ' + err.message
    }));
  });

  req.pipe(proxyReq);
});

const PORT = 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 代理服务器启动成功（CORS修复版）`);
  console.log(`📍 地址: http://0.0.0.0:${PORT}`);
  console.log(`🔄 转发到: http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`🌐 CORS: 已启用（允许所有来源）`);
  console.log(`\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);
});
