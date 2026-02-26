// 测试用例定义
const testCases = [
  // 基础功能测试（Level 1）
  {
    id: 'TC001',
    type: 'basic',
    category: 'Sprite',
    question: '如何创建 Sprite 精灵？',
    useMCP: true,
    passLine: 75,
    expectations: {
      minLength: 800,
      maxLength: 1500,
      hasCode: true,
      hasLinks: true,
      structure: ['问题分析', '解决方案', '代码示例', '相关文档']
    }
  },
  {
    id: 'TC002',
    type: 'basic',
    category: 'Scene3D',
    question: '如何创建 3D 场景？',
    useMCP: true,
    passLine: 70,
    expectations: {
      minLength: 600,
      maxLength: 1200,
      hasCode: true,
      hasLinks: true
    }
  },
  {
    id: 'TC003',
    type: 'basic',
    category: 'Events',
    question: '如何监听鼠标点击事件？',
    useMCP: true,
    passLine: 75,
    expectations: {
      minLength: 700,
      maxLength: 1500,
      hasCode: true
    }
  },

  // 中级功能测试（Level 2）
  {
    id: 'TC101',
    type: 'intermediate',
    category: 'Animation',
    question: '如何播放骨骼动画？',
    useMCP: true,
    passLine: 70,
    expectations: {
      minLength: 600,
      maxLength: 1500,
      hasCode: true
    }
  },
  {
    id: 'TC102',
    type: 'intermediate',
    category: 'Physics',
    question: '如何给物体添加刚体组件？',
    useMCP: true,
    passLine: 65,
    expectations: {
      minLength: 500,
      maxLength: 1200,
      hasCode: true
    }
  },

  // 高级功能测试（Level 3）
  {
    id: 'TC201',
    type: 'advanced',
    category: 'IK',
    question: 'IK 功能如何使用？',
    useMCP: true,
    passLine: 50,  // 降低及格线，因为文档有限
    expectations: {
      minLength: 400,
      maxLength: 1000,
      hasCode: false  // 文档有限，可能没有完整代码
    }
  },
  {
    id: 'TC202',
    type: 'advanced',
    category: 'Shader',
    question: '如何编写自定义 Shader？',
    useMCP: true,
    passLine: 60,
    expectations: {
      minLength: 500,
      maxLength: 1200,
      hasCode: true
    }
  },

  // 边界情况测试
  {
    id: 'TC301',
    type: 'edge',
    category: 'Version',
    question: '如何使用 LayaAir 2.0 的 API？',
    useMCP: false,  // 这个问题不依赖 MCP
    passLine: 70,
    expectations: {
      minLength: 600,
      maxLength: 1200,
      hasCode: false  // 主要是说明迁移
    }
  },
  {
    id: 'TC302',
    type: 'edge',
    category: 'Unclear',
    question: '引擎怎么用？',
    useMCP: false,
    passLine: 65,
    expectations: {
      minLength: 500,
      maxLength: 1000,
      hasCode: false
    }
  }
];

module.exports = testCases;
