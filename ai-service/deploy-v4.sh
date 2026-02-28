#!/bin/bash

# AI回复系统 v4.0 部署脚本
# 严格按照v4.0规范修改AI回复规则

echo "======================================"
echo "AI回复系统 v4.0 部署脚本"
echo "======================================"
echo ""

# 进入ai-service目录
cd /root/.openclaw/workspace/Q-A-Community-Solution/ai-service

# 备份旧文件
echo "📦 备份现有文件..."
cp processor.js processor.js.backup-$(date +%Y%m%d-%H%M%S)
cp ai-service.js ai-service.js.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ 备份完成"
echo ""

# 停止当前服务
echo "🛑 停止当前AI服务..."
PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -n "$PID" ]; then
  kill -9 $PID
  echo "✅ 已停止服务 (PID: $PID)"
else
  echo "⚠️  未找到运行中的服务"
fi
echo ""

# 部署新文件
echo "🚀 部署v4.0版本..."
cp processor-v4.js processor.js
cp ai-service-v4.js ai-service.js
echo "✅ 文件替换完成"
echo ""

# 等待2秒
sleep 2

# 启动服务
echo "🔄 启动AI服务..."
nohup node server.js > server.log 2>&1 &

# 等待服务启动
sleep 3

# 检查服务状态
NEW_PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -n "$NEW_PID" ]; then
  echo "✅ 服务启动成功 (PID: $NEW_PID)"
  echo ""
  echo "======================================"
  echo "✅ v4.0 部署完成！"
  echo "======================================"
  echo ""
  echo "📊 v4.0 新特性："
  echo "  ✅ 帖子分类路由（6种策略）"
  echo "  ✅ 功能建议/非技术帖独立处理"
  echo "  ✅ 用户已解决/极简帖子策略"
  echo "  ✅ 多问题帖子分条回答"
  echo "  ✅ 完整的幻觉防御机制"
  echo "  ✅ 继承链补查规则"
  echo ""
  echo "📝 查看日志："
  echo "  tail -f /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log"
  echo ""
else
  echo "❌ 服务启动失败，请检查日志"
  echo "   tail -50 /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log"
  exit 1
fi
