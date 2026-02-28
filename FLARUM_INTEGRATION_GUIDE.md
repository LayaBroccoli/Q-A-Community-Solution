# Flarum论坛 - AI评分系统集成指南

## 📋 系统信息

- **论坛类型**: Flarum
- **论坛地址**: http://43.128.56.125
- **API地址**: http://43.128.56.125:3000
- **AI用户ID**: 4

---

## 🚀 集成方法（3种，选一种）

### 方法1：Flarum管理后台集成（推荐，最简单）

#### 步骤1：添加CSS样式

1. 登录Flarum管理后台
2. 左侧菜单：**Appearance** → **Custom CSS**
3. 复制以下代码粘贴到编辑器：

```css
/**
 * AI评分系统样式
 * 从以下文件复制完整内容：
 * /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/public/rating-widget.css
 */
```

或者直接从服务器文件读取：
```bash
cat /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/public/rating-widget.css
```

4. 点击 **Save Changes**

#### 步骤2：添加JavaScript

1. 左侧菜单：**Appearance** → **Custom Header**
2. 在 **Header HTML** 文本框中添加：

```html
<script>
(function() {
  'use strict';

  const CONFIG = {
    apiBaseUrl: 'http://43.128.56.125:3000/api',
    aiUserId: 4,
    ratingTypes: [
      { id: 'helpful', icon: '✅', label: '解决问题', value: 5 },
      { id: 'partial', icon: '⚠️', label: '部分解决', value: 3 },
      { id: 'not_helpful', icon: '❌', label: '未解决', value: 1 },
      { id: 'irrelevant', icon: '🤔', label: '不相关', value: 0 }
    ]
  };

  // 这里添加完整的JavaScript代码
  // 从 rating-widget.js 复制

  function init() {
    console.log('[AI评分] 初始化...');

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            checkAndAddRatingBox(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    checkAndAddRatingBox(document.body);
  }

  function checkAndAddRatingBox(node) {
    const posts = node.nodeType === 1 ?
      node.querySelectorAll('.Post-userid-4') : [];

    posts.forEach(function(post) {
      if (post.querySelector('.ai-rating-box')) return;

      const postId = extractPostId(post);
      if (!postId) return;

      const ratingBox = createRatingBox(postId);
      post.querySelector('.Post-body').appendChild(ratingBox);
      loadRatingStats(postId, ratingBox);
    });
  }

  function extractPostId(post) {
    const idAttr = post.getAttribute('id');
    if (idAttr && idAttr.match(/^Post-(\d+)$/)) {
      return parseInt(idAttr.match(/^Post-(\d+)$/)[1]);
    }
    return null;
  }

  function createRatingBox(postId) {
    const box = document.createElement('div');
    box.className = 'ai-rating-box';
    box.innerHTML =
      '<div class="ai-rating-title">这个回答有帮助吗？</div>' +
      '<div class="ai-rating-buttons">' +
        CONFIG.ratingTypes.map(function(type) {
          return '<button class="rating-btn rating-' + type.id + '" data-rating="' + type.id + '">' +
            '<span class="icon">' + type.icon + '</span>' +
            '<span class="text">' + type.label + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<div class="ai-rating-feedback"></div>';

    box.querySelectorAll('.rating-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        handleRating(postId, this.dataset.rating, box);
      });
    });

    return box;
  }

  function handleRating(postId, rating, box) {
    const feedback = box.querySelector('.ai-rating-feedback');
    const buttons = box.querySelectorAll('.rating-btn');

    buttons.forEach(function(btn) {
      btn.disabled = true;
    });

    feedback.textContent = '提交中...';

    fetch(CONFIG.apiBaseUrl + '/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: postId,
        discussion_id: app.discussion?.id,
        rating: rating,
        user_id: app.session.user?.id
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        feedback.textContent = '✅ 感谢您的反馈！';
        box.querySelector('.rating-btn[data-rating="' + rating + '"]')
          .classList.add('active');
      } else {
        feedback.textContent = '❌ ' + data.error;
        buttons.forEach(function(btn) { btn.disabled = false; });
      }
    })
    .catch(function(err) {
      feedback.textContent = '❌ 网络错误';
      buttons.forEach(function(btn) { btn.disabled = false; });
    });
  }

  function loadRatingStats(postId, box) {
    fetch(CONFIG.apiBaseUrl + '/ratings/' + postId)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data.total_ratings > 0) {
          const stats = data.data;
          box.querySelector('.ai-rating-feedback').innerHTML =
            '<div class="rating-stats">' +
              '<span class="rating-count">' + stats.total_ratings + ' 人评价</span>' +
              (stats.average_score > 0 ?
                '<span class="rating-avg">平均 ' + stats.average_score + ' 分</span>' : '') +
            '</div>';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
```

3. 点击 **Save Changes**

4. 刷新论坛页面，查看AI回复下方是否出现评分按钮

---

### 方法2：通过Flarum扩展（生产环境推荐）

创建独立的Flarum扩展：

```bash
# 安装Flarum CLI
npm install -g @flarum/cli

# 创建扩展
cd /path/to/flarum/extensions
flarum-cli make extension ai-rating

# 编辑扩展文件
cd ai-rating
```

扩展结构：
```
ai-rating/
├── composer.json
├── LICENSE
├── README.md
├── js/
│   └── dist/
│       └── extension.js
├── src/
│   ├── AiRatingBox.js       # 评分组件
│   └── extendPost.js         # 扩展帖子
├── locale/
│   └── en.yml
└── resources/
    └── icons/
```

**src/AiRatingBox.js**:
```javascript
import Component from 'flarum/common/component/Component';

export default class AiRatingBox extends Component {
  view() {
    return (
      <div className="ai-rating-box">
        <div className="ai-rating-title">这个回答有帮助吗？</div>
        <div className="ai-rating-buttons">
          {this.ratingButtons()}
        </div>
      </div>
    );
  }

  ratingButtons() {
    const types = [
      { id: 'helpful', icon: '✅', label: '解决问题' },
      { id: 'partial', icon: '⚠️', label: '部分解决' },
      { id: 'not_helpful', icon: '❌', label: '未解决' },
      { id: 'irrelevant', icon: '🤔', label: '不相关' }
    ];

    return types.map(type => (
      <button
        className={'rating-btn rating-' + type.id}
        onclick={() => this.handleRating(type.id)}
      >
        <span className="icon">{type.icon}</span>
        <span className="text">{type.label}</span>
      </button>
    ));
  }

  handleRating(rating) {
    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/ratings',
      data: {
        post_id: this.attrs.post.id(),
        rating: rating
      }
    }).then(() => {
      alert('感谢您的反馈！');
    });
  }
}
```

**src/extendPost.js**:
```javascript
import extendPost from 'flarum/common/extendPost';
import AiRatingBox from './AiRatingBox';

export default function () {
  extendPost(PostContent => {
    PostContent.prototype.aiRatingBox = function () {
      const post = this.props.post;
      const aiUserId = 4;

      if (post.user().id() !== aiUserId) return null;

      return <AiRatingBox post={post} />;
    };
  });
}
```

---

### 方法3：直接修改Flarum模板（不推荐，升级会丢失）

```bash
cd /path/to/flarum

# 编辑主布局
nano public/views/app.blade.php
```

在 `</head>` 前添加：
```html
<style>
  /* 粘贴 rating-widget.css 内容 */
</style>
<script>
  // 粘贴 rating-widget.js 内容
</script>
```

---

## ✅ 验证安装

### 1. 检查控制台

打开浏览器开发者工具（F12），查看Console：

```
[AI评分] 初始化...
```

### 2. 查看AI回复

打开任意有AI回复的讨论，在AI回复下方应该看到：

```
📊 这个回答有帮助吗？
[✅ 解决问题] [⚠️ 部分解决] [❌ 未解决] [🤔 不相关]
```

### 3. 测试评分

点击任意按钮，应该显示"✅ 感谢您的反馈！"

### 4. 检查数据库

```bash
mysql -u flarum -p flarum

SELECT * FROM ai_ratings ORDER BY created_at DESC LIMIT 5;
```

---

## 🔧 故障排查

### 问题1：评分按钮不显示

**检查**:
1. 浏览器控制台是否有错误
2. AI用户ID是否正确（默认4）
3. 检查元素是否有 `.Post-userid-4` 类

**解决**:
```javascript
// 在Custom Header中添加调试代码
console.log('当前用户:', app.session.user);
console.log('讨论ID:', app.discussion?.id);
```

### 问题2：点击按钮没反应

**检查**:
1. Network标签，查看API请求
2. 服务器日志：`tail -f /root/.openclaw/workspace/Q-A-Community-Solution/ai-service/server.log`

**解决**:
确认API地址可访问：
```bash
curl http://43.128.56.125:3000/health
```

### 问题3：CORS错误

**解决**:
已在server.js中配置CORS支持。如果仍有问题，检查：
```bash
curl -H "Origin: http://43.128.56.125" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://43.128.56.125:3000/api/ratings
```

---

## 📊 查看评分数据

### 在线查看

访问：http://43.128.56.125:3000/api/ratings/report

### 数据库查询

```bash
mysql -u flarum -p flarum

-- 查看所有评分
SELECT * FROM v_ai_rating_report;

-- 查看低分回复
SELECT * FROM v_ai_rating_report
WHERE average_score < 2.5
ORDER BY average_score ASC;

-- 查看今日评分统计
SELECT
  rating_type,
  COUNT(*) as count
FROM ai_ratings
WHERE DATE(created_at) = CURDATE()
GROUP BY rating_type;
```

---

## 🎨 自定义样式

### 修改按钮颜色

在Custom CSS中添加：
```css
.rating-btn.helpful:hover {
  border-color: #4caf50;
  background: #e8f5e9;
}

.rating-btn.partial:hover {
  border-color: #ff9800;
  background: #fff3e0;
}

.rating-btn.not-helpful:hover {
  border-color: #f44336;
  background: #ffebee;
}

.rating-btn.irrelevant:hover {
  border-color: #9e9e9e;
  background: #f5f5f5;
}
```

### 调整按钮大小

```css
.rating-btn {
  min-width: 100px;  /* 默认80px */
  padding: 12px;     /* 默认10px */
}

.rating-btn .icon {
  font-size: 28px;   /* 默认24px */
}

.rating-btn .text {
  font-size: 14px;   /* 默认12px */
}
```

---

## 📞 支持

如遇问题，请提供：
1. 浏览器控制台错误截图
2. Network请求详情
3. 服务器日志

---

**推荐使用方法1（管理后台集成）**，最简单且升级友好！
