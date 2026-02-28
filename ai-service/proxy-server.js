const http = require('http');
const httpProxy = require('http');
const url = require('url');

// 目标API服务器
const TARGET_HOST = 'localhost';
const TARGET_PORT = 3000;

// 创建代理服务器
const server = http.createServer((req, res) => {
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
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
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('代理错误:', err);
    res.writeHead(500);
    res.end('代理服务器错误');
  });

  req.pipe(proxyReq);
});

const PORT = 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 代理服务器启动成功`);
  console.log(`📍 地址: http://0.0.0.0:${PORT}`);
  console.log(`🔄 转发到: http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);
});
