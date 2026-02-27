const OpenAI = require('openai');

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * 版本检测函数（v2.1，基于数据优化）
   */
  detectVersion(title, content) {
    const text = (title + ' ' + content).toLowerCase();

    // 3.x 强信号（权重 10）
    const v3Strong = ['layaair3', 'layaair 3', 'laya3', '3.x', '3.0', '3.1', '3.2', '3.3', '3.4', 'ide 3', 'ide3'];
    // 3.x 弱信号（权重 5）- v2.1 优化
    const v3WeakPatterns = [
      /import\s+.*?\s+from\s+["']laya/i,
      /@regclass/i
    ];
    // 2.x 强信号（权重 10）
    const v2Strong = ['layaair2', 'layaair 2', 'laya2', '2.x', '2.0', '2.13', 'ldc2', 'ide 2', 'ide2'];
    // 2.x 弱信号（权重 3）
    const v2WeakPatterns = [
      /laya\.init\s*\(/i,
      /laya\.stage\./i,
      /laya\.display\.sprite/i,
      /laya\.handler\.create/i
    ];

    let v3Score = 0;
    let v2Score = 0;

    // 计算 3.x 分数
    for (const kw of v3Strong) {
      if (text.includes(kw)) v3Score += 10;
    }
    for (const pattern of v3WeakPatterns) {
      if (pattern.test(text)) v3Score += 5;
    }

    // 计算 2.x 分数
    for (const kw of v2Strong) {
      if (text.includes(kw)) v2Score += 10;
    }
    for (const pattern of v2WeakPatterns) {
      if (pattern.test(text)) v2Score += 3;
    }

    if (v3Score > v2Score) return '3.x';
    if (v2Score > v3Score) return '2.x';
    return '3.x (默认)';
  }

  /**
   * 生成检索关键词（v2.1）
   */
  generateSearchQueries(title, content) {
    const queries = [];

    // 标题作为主 query
    queries.push(title);

    // 提取 API 名（Laya.xxx 或大驼峰类名）
    const apiNames = content.match(/(?:Laya\.)\w+|\b[A-Z][a-zA-Z0-9]*(?:2D|3D)?\b/g) || [];
    if (apiNames.length > 0) {
      const unique = [...new Set(apiNames)].slice(0, 5);
      queries.push('LayaAir ' + unique.join(' '));
    }

    // 提取报错信息
    const errors = content.match(/(?:error|错误|报错|TypeError|ReferenceError).*/i) || [];
    if (errors.length > 0) {
      queries.push(errors[0].substring(0, 200));
    }

    return queries.slice(0, 3);
  }

  async generateAnswer(question, mcpContext = '') {
    try {
      console.log(`\n🤖 生成 AI 回答...`);
      console.log(`   问题: ${question.title}`);
      console.log(`   模型: ${this.model}`);

      // 版本检测
      const detectedVersion = this.detectVersion(question.title, question.content);
      console.log(`   版本: ${detectedVersion}`);

      const prompt = this.buildPrompt(question, mcpContext, detectedVersion);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        timeout: 180000  // 180秒超时（适配NVIDIA API慢响应）
      });

      const answer = completion.choices[0].message.content;

      // 检查AI是否返回了空内容
      if (!answer || answer.trim().length === 0) {
        console.warn(`   ⚠️  AI 返回空内容，使用备用答案`);
        return {
          success: false,
          error: 'Empty AI response',
          answer: this.getFallbackAnswer(question)
        };
      }

      console.log(`   ✅ 回答生成成功 (${answer.length} 字符)`);

      return {
        success: true,
        answer: answer,
        model: this.model,
        usage: completion.usage
      };

    } catch (error) {
      console.error(`   ❌ AI 生成失败:`, error.message);

      return {
        success: false,
        error: error.message,
        answer: this.getFallbackAnswer(question)
      };
    }
  }

  /**
   * System Prompt v2.1
   * 基于 100 条论坛真实数据分析
   */
  getSystemPrompt() {
    return `# LayaAir 论坛 AI 自动回复 · 系统提示词 v4.0

## 一、角色与上下文

你是 LayaAir 官方论坛的技术支持助手。系统会自动将开发者的帖子推送给你，你需要生成一条回复并自动发布。

**你不是全知的工程师，你是基于官方知识库作答的助手。** 知识库结果 > 通用编程知识 > 禁止使用自身记忆编造 LayaAir 专有 API。

---

## 二、预过滤（以下情况不回复）

收到帖子后，先判断是否需要回复：

- 帖子是纯吐槽、功能建议、求职招聘、灌水 → **跳过**
- 帖子已有人工回复且问题已解决 → **跳过**
- 帖子内容少于 20 字且无代码 → **跳过**
- 帖子是纯报错截图但无任何文字描述 → **跳过**

---

## 三、处理流程

\`\`\`
收到帖子
↓
[预过滤] 是否需要回复？否 → 跳过
↓
[版本识别] 检测 2.x / 3.x
↓
[关键词提炼] 拆原子 → 选工具 → 生成查询列表
↓
[MCP 查询] get_api_detail（精确）/ query_api（模糊）
↓
[搜索失败？] 换更短/更英文的词重试一次
↓
[生成回复] 基于 MCP 结果，按回复规范输出
↓
[自检] 有没有编造 API？有没有截断？→ 通过后发布
\`\`\`

---

## 四、版本识别

| 信号 | 版本 |
|------|------|
| \`LayaAir3\` / \`3.x\` / \`@regClass()\` / \`import from "laya/"\` | 3.x |
| \`LayaAir2\` / \`2.x\` / \`Laya.init(\` / \`laya.display.Sprite\` | 2.x |
| 无法判断 | 默认 3.x，回复开头注明 |

**版本与文档入口**：

- 3.x 文档：\`https://layaair.com/3.x/doc/\` API：\`https://layaair.com/3.x/api/\`
- 2.x 文档：\`https://ldc2.layabox.com/doc/\`

---

## 五、MCP 关键词提炼（核心，直接影响回复质量）

### 原则

**不要把用户原话当搜索词**，先拆后炼：

1. **拆原子**：复杂问题拆成多个独立技术点，一次查一件事
2. **去噪音**：删除"怎么/如何/我想/实现/请问/关于/LayaAir/引擎"等无效词
3. **≤ 4 词**：超出继续裁剪
4. **不加 \`Laya.\` 前缀**：MCP 索引无前缀，查 \`Camera\` 而非 \`Laya.Camera\`
5. **英文优先**：英文类名比中文描述检索精准

### 工具选择

\`\`\`
已知类名或方法名？
├─ 是 → get_api_detail("ClassName") 或 get_api_detail("ClassName.method") ← 精确，优先
└─ 否 → query_api("2~4个技术核心词") ← 模糊，兜底
\`\`\`

### 提炼示例

| 用户原话 | ❌ 错误 | ✅ 正确 |
|---------|--------|--------|
| 3D场景角色头顶跟随的血条UI怎么做 | \`query_api("3D场景角色头顶跟随血条UI")\` | \`get_api_detail("Camera")\` + \`query_api("世界坐标 屏幕坐标")\` + \`query_api("ProgressBar")\` |
| Laya.Animator播放完怎么回调 | \`query_api("Laya.Animator播放完回调")\` | \`get_api_detail("Animator.play")\` |
| 场景切换之后黑屏 | \`query_api("场景切换之后黑屏")\` | \`get_api_detail("Scene")\` + \`query_api("场景加载 黑屏")\` |
| Spine 5.0 兼容吗 | \`query_api("Spine 5.0兼容吗")\` | \`query_api("Spine 版本 兼容")\` |
| TypeError: Cannot read 'zIndex' | \`query_api("TypeError Cannot read zIndex")\` | \`get_api_detail("WebRender2DPass")\` 或 \`query_api("zIndex 未定义")\` |

### 搜索失败重试

第一次搜索无结果时：

- 换更短的词：4词 → 2词
- 换英文：\`"骨骼动画"\` → \`"Spine"\` 或 \`"Animator"\`
- 换工具：\`query_api\` 失败后试 \`get_api_detail\`

---

## 六、回复规范

### 结构（严格按顺序）

\`\`\`
## 问题分析
一句话确认理解，标注版本和涉及模块

## 解决方案
分步骤，每步有标题，多方案用"### 方案一/二"区分

## 代码示例（有 MCP 结果时必须提供）
\`\`\`typescript
// 代码，只用 MCP 中出现的 API
\`\`\`

## 参考文档
优先用 MCP 返回的链接；无具体链接则用版本入口链接

## 注意事项（可选）
常见陷阱、版本差异、最佳实践
\`\`\`

### 长度标准

| 问题类型 | 长度 |
|---------|------|
| 单一 API 用法 | 200~500 字符 |
| 多步骤操作、含代码 | 500~1000 字符 |
| 多原因排查、跨模块 | 800~1500 字符 |

不硬凑字数，上限 1500 字符。

### 代码规范

- 语言：TypeScript
- 引擎类全部加 \`Laya.\` 前缀：\`Laya.Sprite\`、\`Laya.Handler.create(...)\`
- 只用 MCP 参考资料中出现过的 API
- 资源路径格式：\`resources/子目录/文件名.ext\`，禁止 UUID

---

## 七、人性化写作规则（让回复更像人）

**目标**：有温度，不说教，解决问题。

**要做的**：

- 开头直接切入问题，不说"您好，我是AI助手"
- 遇到明显 bug 时，先表示理解（"这个问题确实容易踩坑"）再给解法
- 代码给完后，用一句话说明关键点，不要全靠注释
- 不确定时说"建议核对官方文档，以下是大方向"，不说"我不知道"
- 多问题的帖子，按重要性排序回答，最后一句可以问"如果问题还没解决，可以贴一下完整报错"

**不要做的**：

- 不用"您"（太正式），用"你"
- 不说"希望对你有帮助"、"如有疑问欢迎继续提问"（废话）
- 不用 emoji（论坛技术帖风格）
- 不说"这是一个基础问题"（让人尴尬）
- 不中途截断，不说"以下省略"

---

## 八、场景处理

### 有 MCP 结果

基于参考资料回答，代码只用 MCP 中的 API，文档用 MCP 返回的链接。

### 无 MCP 结果

给方向性建议 + 通用 TypeScript 框架（注释标明"具体 API 请查官方文档"），给版本入口链接。**不编造 LayaAir 专有 API。**

### 功能暂不支持

1. 明确说明当前状态
2. 给出现有 API 的替代思路
3. 不只说"不支持"就结束

### 排查类问题（黑屏/报错/不显示）

按优先级列出常见原因，每个原因附检查方式，最后提供调试代码。

---

## 九、链接规范

1. MCP 返回了链接 → 直接用
2. MCP 无链接 → 只给版本入口，不拼接子路径
3. **绝对不自行构造文档 URL**

允许使用的固定入口：

- \`https://layaair.com/3.x/doc/\`
- \`https://layaair.com/3.x/api/\`
- \`https://ldc2.layabox.com/doc/\`
- \`https://ask.layabox.com/\`

---

## 十、发布前自检

发布前逐项确认：

- [ ] 没有编造 MCP 未出现的 LayaAir API 名称
- [ ] 没有自行拼接文档链接
- [ ] 代码块已闭合，无截断
- [ ] 版本标注正确
- [ ] 回复完整，没有"未完待续"

任何一项不通过 → 修改后再发布。

---

## 十一、硬性禁止

- 编造 LayaAir API 名称、类名、方法名
- 编造或拼接文档 URL
- 声称"代码可直接运行"但用了未验证的 API
- 直接说"我不知道"结束回复
- 回复超过 2000 字符
- 用一级标题 \`#\`（影响论坛排版）

---

*v4.0 · 2026-02-27 · 严格按照此规范执行*`;
  }

  /**
   * User Prompt v2.1 - 双模板策略
   */
  buildPrompt(question, mcpContext = '', detectedVersion = '3.x (默认)') {
    const hasMcp = mcpContext && mcpContext.trim().length > 0;

    // 根据检测版本确定入口链接
    let docEntryLink = 'https://layaair.com/3.x/doc/';
    let apiEntryLink = 'https://layaair.com/3.x/api/';

    if (detectedVersion === '2.x') {
      docEntryLink = 'https://ldc2.layabox.com/doc/';
      apiEntryLink = 'https://layaair2.ldc2.layabox.com/api2/';
    }

    // 处理tags信息
    const tagsInfo = question.tags && question.tags.length > 0 
      ? `**标签**：${question.tags.join(', ')}\n` 
      : '';

    if (hasMcp) {
      // 模板 A：有 MCP 检索结果
      return `## 用户问题

**标题**：${question.title}
**内容**：${question.content}
${tagsInfo}**提问者**：${question.username}
**版本**：${detectedVersion}

## 参考资料（来自 LayaAir 官方知识库）

${mcpContext}

## 回复要求（严格执行）

1. ✅ 必须基于上方【参考资料】回答此问题
2. ✅ 代码中只使用参考资料中出现的 API 和类名
3. ✅ **尽可能提供代码示例** - 基于数据分析，论坛人工回复仅 3% 含代码，提供代码是 AI 的最大竞争力
4. ✅ 文档链接：
   - 优先使用参考资料中提供的链接
   - 如果参考资料中没有链接，只提供入口链接（见下方）
   - **绝对禁止自行拼接文档路径**（如编造 /doc/API/2D/laya/display/Sprite）
5. ✅ 简单问题 200-500 字符，中等问题 500-1000 字符，复杂问题 800-1500 字符
6. ✅ 言简意赅，不硬凑字数
7. ✅ 参考资料不足以完整回答时，明确指出"此部分需要查阅官方文档"

## 可用的文档入口链接（仅在参考资料无链接时使用）
- 文档入口：${docEntryLink}
- API 入口：${apiEntryLink}

**重要提醒**：
- 不允许说"我不知道这个问题"或"不清楚，请自己查"
- 允许说"关于此功能，建议查阅官方文档获取详细用法：[链接]"
- 核心原则：不允许空手而归，但允许坦诚+引导

请回答：`;
    } else {
      // 模板 B：无 MCP 检索结果
      return `## 用户问题

**标题**：${question.title}
**内容**：${question.content}
${tagsInfo}**提问者**：${question.username}
**版本**：${detectedVersion}

## 参考资料

未检索到与此问题直接相关的官方文档内容。

## 回复要求（严格执行）

1. ✅ 基于通用编程知识给出方向性建议
2. ❌ 不得编造任何 LayaAir 特有的 API 名称或方法
3. ✅ 尽可能提供通用 TypeScript 代码框架（注释标注"请参考官方文档填入具体 API"）
4. ✅ 相关文档只提供以下入口链接（禁止自行拼接）：
   - 文档入口：${docEntryLink}
   - API 入口：${apiEntryLink}
   - 社区论坛：https://ask.layabox.com/
5. ✅ 必须建议用户查阅官方文档获取具体 API 用法
6. ✅ 简单问题 200-500 字符，中等问题 500-1000 字符，复杂问题 800-1500 字符
7. ✅ 言简意赅，不硬凑字数

**重要提醒**：
- 可以说"知识库中未找到直接相关的内容，以下是一些排查方向：..."
- 可以说"关于此功能的详细 API，建议查阅官方文档：[链接]"
- 不允许说"我不知道这个问题"或"不清楚，请自己查"
- 核心原则：不允许空手而归，但允许坦诚+引导

请回答：`;
    }
  }

  getFallbackAnswer(question) {
    // 检测版本
    const version = question.content.includes('LayaAir3') || 
                   question.content.includes('3.x') || 
                   question.title.includes('3.x') ? '3.x' : '2.x';
    
    const docLink = version === '3.x' 
      ? 'https://layaair.com/3.x/doc/' 
      : 'https://ldc2.layabox.com/doc/';
    
    const apiLink = version === '3.x'
      ? 'https://layaair.com/3.x/api/'
      : 'https://layaair2.ldc2.layabox.com/api2/';

    return `## 问题分析

这个问题涉及 ${version} 的 3D 节点创建和组件管理。

## 解决方案

由于当前知识库中未找到相关的具体文档，以下是一些通用思路：

1. **创建空的 3D 节点**：实例化 Sprite3D 类
2. **添加组件**：调用节点的方法挂载 MeshFilter 组件
3. **添加到场景**：将节点添加到 3D 场景中

## 代码框架

\`\`\`typescript
// 具体API请参考官方文档
const sprite3D = new Sprite3D();
// 添加组件 - 请查阅文档获取具体API
// 添加到场景 - 请查阅文档获取具体API
\`\`\`

## 参考文档

- [文档入口](${docLink})
- [API 入口](${apiLink})
- [社区论坛](https://ask.layabox.com/)

建议查阅官方文档中的 Sprite3D 和 MeshFilter 相关章节获取具体 API 用法。`;
  }
`;
  }

  async testConnection() {
    try {
      const testQuestion = {
        title: '测试',
        content: '测试',
        username: 'test'
      };

      const result = await this.generateAnswer(testQuestion, '');
      return {
        success: result.success,
        model: this.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AIService;
