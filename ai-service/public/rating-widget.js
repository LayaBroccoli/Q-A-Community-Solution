/**
 * AI回复评分系统 - Flarum前端组件
 *
 * 安装方法：
 * 1. 在Flarum的custom.css中添加评分样式
 * 2. 在Flarum的custom头部脚本中添加评分逻辑
 * 3. 或创建Flarum扩展
 */

// ============================================================
// 方法1: 简单JavaScript注入（快速测试）
// ============================================================

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    apiBaseUrl: 'http://43.128.56.125:3000/api', // 修改为实际API地址
    aiUserId: 4, // AI用户ID
    ratingTypes: [
      { id: 'helpful', icon: '✅', label: '解决问题', value: 5, color: '#4caf50' },
      { id: 'partial', icon: '⚠️', label: '部分解决', value: 3, color: '#ff9800' },
      { id: 'not_helpful', icon: '❌', label: '未解决', value: 1, color: '#f44336' },
      { id: 'irrelevant', icon: '🤔', label: '不相关', value: 0, color: '#9e9e9e' }
    ]
  };

  // 等待DOM加载完成
  function init() {
    console.log('[AI评分] 初始化...');

    // 监听帖子加载
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            checkAndAddRatingBox(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初始检查
    checkAndAddRatingBox(document.body);
  }

  // 检查并添加评分框
  function checkAndAddRatingBox(node) {
    // 查找AI回复的帖子
    const posts = node.nodeType === 1 ?
      node.querySelectorAll('.Post-userid-' + CONFIG.aiUserId) : [];

    posts.forEach(function(post) {
      // 如果已经添加过评分框，跳过
      if (post.querySelector('.ai-rating-box')) {
        return;
      }

      // 获取帖子ID
      const postId = extractPostId(post);
      if (!postId) return;

      // 创建评分框
      const ratingBox = createRatingBox(postId);
      post.querySelector('.Post-body').appendChild(ratingBox);

      // 加载评分统计
      loadRatingStats(postId, ratingBox);
    });
  }

  // 提取帖子ID
  function extractPostId(post) {
    const idAttr = post.getAttribute('id');
    if (idAttr && idAttr.match(/^Post-(\d+)$/)) {
      return parseInt(idAttr.match(/^Post-(\d+)$/)[1]);
    }
    return null;
  }

  // 创建评分框
  function createRatingBox(postId) {
    const box = document.createElement('div');
    box.className = 'ai-rating-box';
    box.dataset.postId = postId;

    const title = document.createElement('div');
    title.className = 'ai-rating-title';
    title.textContent = '这个回答有帮助吗？';
    box.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'ai-rating-buttons';

    CONFIG.ratingTypes.forEach(function(type) {
      const btn = document.createElement('button');
      btn.className = 'rating-btn rating-' + type.id;
      btn.dataset.rating = type.id;
      btn.innerHTML =
        '<span class="icon">' + type.icon + '</span>' +
        '<span class="text">' + type.label + '</span>';

      btn.addEventListener('click', function() {
        handleRating(postId, type.id, box);
      });

      buttons.appendChild(btn);
    });

    box.appendChild(buttons);

    const feedback = document.createElement('div');
    feedback.className = 'ai-rating-feedback';
    box.appendChild(feedback);

    return box;
  }

  // 处理评分
  function handleRating(postId, rating, box) {
    const feedback = box.querySelector('.ai-rating-feedback');
    const buttons = box.querySelectorAll('.rating-btn');

    // 禁用所有按钮
    buttons.forEach(function(btn) {
      btn.disabled = true;
      btn.classList.add('disabled');
    });

    feedback.textContent = '提交中...';

    // 提交评分
    fetch(CONFIG.apiBaseUrl + '/ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_id: postId,
        discussion_id: getDiscussionId(),
        rating: rating,
        user_id: getUserId() // 从Flarum获取用户ID
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        feedback.textContent = '✅ ' + (data.message || '感谢您的反馈！');
        feedback.style.color = '#4caf50';

        // 标记选中的按钮
        box.querySelector('.rating-btn[data-rating="' + rating + '"]')
          .classList.add('active');
      } else {
        feedback.textContent = '❌ ' + (data.error || '提交失败');
        feedback.style.color = '#f44336';

        // 重新启用按钮
        buttons.forEach(function(btn) {
          btn.disabled = false;
          btn.classList.remove('disabled');
        });
      }
    })
    .catch(function(err) {
      console.error('提交评分失败:', err);
      feedback.textContent = '❌ 网络错误，请稍后重试';
      feedback.style.color = '#f44336';

      // 重新启用按钮
      buttons.forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
      });
    });
  }

  // 加载评分统计
  function loadRatingStats(postId, box) {
    fetch(CONFIG.apiBaseUrl + '/ratings/' + postId)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.data.total_ratings > 0) {
          const stats = data.data;
          const feedback = box.querySelector('.ai-rating-feedback');

          let html = '<div class="rating-stats">';
          html += '<span class="rating-count">' + stats.total_ratings + ' 人评价</span>';
          if (stats.average_score > 0) {
            html += '<span class="rating-avg">平均 ' + stats.average_score + ' 分</span>';
          }
          html += '</div>';

          feedback.innerHTML = html;
        }
      })
      .catch(function(err) {
        console.error('加载评分统计失败:', err);
      });
  }

  // 获取当前用户ID
  function getUserId() {
    // 从Flarum的session中获取
    try {
      return app.session.user?.id || null;
    } catch (e) {
      return null;
    }
  }

  // 获取讨论ID
  function getDiscussionId() {
    try {
      return app.discussion?.id || null;
    } catch (e) {
      return null;
    }
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// ============================================================
// 方法2: Flarum扩展（推荐，生产环境）
// ============================================================

/*
// 安装: flarum-cli make extension ai-rating

// src/components/AiRatingBox.js
import Component from 'flarum/common/component/Component';

export default class AiRatingBox extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.post = this.attrs.post;
    this.loading = false;
    this.rated = false;
  }

  view() {
    return (
      <div className="ai-rating-box">
        <div className="ai-rating-title">这个回答有帮助吗？</div>
        <div className="ai-rating-buttons">
          {this.ratingButtons()}
        </div>
        <div className="ai-rating-feedback">{this.feedbackText()}</div>
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
        disabled={this.loading || this.rated}
        onclick={() => this.handleRating(type.id)}
      >
        <span className="icon">{type.icon}</span>
        <span className="text">{type.label}</span>
      </button>
    ));
  }

  handleRating(rating) {
    this.loading = true;

    app.request({
      method: 'POST',
      url: app.forum.attribute('apiUrl') + '/ratings',
      data: {
        post_id: this.post.id(),
        discussion_id: this.post.discussion().id(),
        rating: rating
      }
    }).then(() => {
      this.rated = true;
      this.loading = false;
      m.redraw();
    }).catch(err => {
      this.loading = false;
      m.redraw();
    });
  }
}

// src/extendPost.js
import extendPost from 'flarum/common/extendPost';
import AiRatingBox from './components/AiRatingBox';

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
*/
