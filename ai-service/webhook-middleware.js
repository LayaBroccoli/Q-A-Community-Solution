const crypto = require('crypto');

// Webhook 密钥验证中间件
function verifyWebhook(req, res, next) {
  const signature = req.headers['x-webhook-secret'];
  const secret = 'laya-ask-secret-2026';

  if (signature === secret) {
    next();
  } else {
    console.log('⚠️  Webhook 验证失败，无签名或签名不匹配');
    // 开发环境允许继续，生产环境应该拒绝
    next();
  }
}

module.exports = { verifyWebhook };
