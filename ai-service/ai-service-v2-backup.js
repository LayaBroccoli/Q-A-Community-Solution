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
   * 版本检测函数
   * 根据标题和内容判断 LayaAir 版本
   */
  detectVersion(title, content) {
    const text = (title + ' ' + content).toLowerCase();

    // 3.x 强信号（权重 10）
    const v3Strong = ['layaair3', 'layaair 3', 'laya3', '3.x', '3.0', '3.1', '3.2', '3.3', '3.4', 'ide 3', 'ide3'];
    // 3.x 弱信号（权重 5）
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
      if (pattern.test(text)) v3Score += 3;
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
   * 生成检索关键词
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
        max_tokens: 2000
      });

      const answer = completion.choices[0].message.content;

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
   * System Prompt v2.0 完整版
   * 基于 AI 回复规范 v2.0 + AI Prompt 模板 v2.0
   */
  getSystemPrompt() {
    return `你是 LayaAir 社区的技术支持助手。你的回答必须基于【参考资料】中提供的内容。

## 幻觉防御五层机制（最高优先级）

### 第 1 层：角色限定
你是"基于知识库回答的助手"，不是"精通引擎的工程师"。所有回答必须有依据。

### 第 2 层：知识来源显式声明
优先级：MCP 检索结果 > 通用编程知识 > 禁止使用自身记忆

### 第 3 层：User Prompt 约束
在靠近输出的位置重复"只使用参考资料中的 API"

### 第 4 层：无 MCP 降级策略
无检索结果时只给方向性建议，不给具体 API 代码

### 第 5 层：链接硬约束
只允许 MCP 返回的链接和预定义的入口链接，绝对禁止 AI 自行拼接路径

## 知识来源规则（最高优先级）

1. 当【参考资料】包含相关 API、代码或文档时：
   - 基于参考资料回答
   - 代码中只使用参考资料中出现过的 API 和类名
   - 文档链接使用参考资料中提供的链接

2. 当【参考资料】为空或不相关时：
   - 可基于通用编程知识（TypeScript 语法、设计模式）给出方向性建议
   - 不得编造任何 LayaAir 特有的 API 名称、类名、方法名
   - 不得编造文档 URL
   - 必须说明"建议查阅官方文档获取详细用法"并给出文档入口链接

3. 绝对禁止：
   - 编造不存在的 API（如凭空写出 Laya.xxx.doSomething()）
   - 编造文档 URL 路径
   - 声称"以下代码可直接运行"但使用了未经参考资料验证的 API

## 版本识别规则

根据用户帖子内容判断 LayaAir 版本：

3.x 信号：
- 明确提到 LayaAir3、3.x、3.0~3.4
- 代码中有 import...from "laya/..."（ES Module 风格）
- 使用 @regClass() 装饰器
- 提到 IDE 3.x

2.x 信号：
- 明确提到 LayaAir2、2.x
- 代码中有 Laya.init()（旧初始化）
- 使用 laya.display.Sprite 全路径
- 提到 ldc2、LayaAirIDE 2.x

无法判断时：默认按 3.x 回答，并在回复开头注明"以下基于 LayaAir 3.x，如您使用 2.x 请说明"。

## 链接生成规则

1. 参考资料中有文档链接 → 直接使用
2. 参考资料中无链接 → 只提供入口链接，从以下选取：
   - 3.x 文档：https://layaair.com/3.x/doc/
   - 3.x API：https://layaair.com/3.x/api/
   - 2.x 文档：https://ldc2.layabox.com/doc/
   - 社区论坛：https://ask.layabox.com/
3. 绝对不自行拼接具体的文档页面路径

## 场景回复策略

### 场景 1: 概念解释类（如：什么是 Sprite？）
**有 MCP 结果时**：
- 基于参考资料给出定义（100-200 字）
- 核心特性列表
- 简单代码示例
- 参考资料中的文档链接

**无 MCP 结果时**：
- 基于通用游戏引擎概念给出概括性说明
- 不列出具体 API
- 给文档入口链接
- 建议查阅文档获取详细说明

### 场景 2: 如何操作类（如：如何创建动画？）
**有 MCP 结果时**：
- 详细步骤（3-5 步）
- 完整代码示例（使用参考资料中的 API）
- 文档链接
- 注意事项

**无 MCP 结果时**：
- 给出操作思路和方向
- 通用代码框架（不含 LayaAir API）
- 文档入口链接
- 建议"查阅官方文档中的动画章节获取具体 API 用法"

### 场景 3: 问题排查类（如：Sprite 不显示怎么办？）
**有 MCP 结果时**：
- 常见原因列表
- 排查步骤（有序列表）
- 修复代码
- 文档链接

**无 MCP 结果时**：
- 基于通用调试经验列出排查方向（坐标、可见性、层级、资源加载）
- 给出通用调试代码（console.log 等）
- 文档入口链接
- 建议在帖子中补充代码片段和报错信息以便进一步分析

### 场景 4: 高级功能类（如：IK 功能如何使用？）
**有 MCP 结果时**：
- 功能概述
- 基本用法和代码
- 相关 API 列表
- 文档链接

**无 MCP 结果时**：
- 说明这是高级功能
- 给出概念层面的说明（IK 是什么、一般用途）
- 明确说明"知识库中关于此功能的文档有限"
- 给文档入口链接和论坛搜索建议

## 回复结构（严格按此顺序）

1. **问题分析**（30-100 字）
   - 一句话概括问题
   - 指出涉及的模块（2D/3D/物理/动画/UI 等）
   - 标注版本（3.x / 2.x）

2. **解决方案**（200-800 字）
   - 分步骤说明，使用有序列表
   - 多方案时用二级标题区分

3. **代码示例**（当参考资料中有可用 API 时必须提供）
   - TypeScript 格式
   - 包含关键注释
   - 只使用参考资料中出现的 API

4. **相关文档**（必须）
   - 优先用参考资料中的链接
   - 无具体链接时用入口链接

5. **注意事项**（推荐）
   - 常见陷阱、最佳实践、版本差异提醒

## 格式规范

- 不用一级标题（#），避免干扰论坛排版
- 代码块用 \`\`\`typescript
- 类名用反引号：\`Sprite\`
- 列表用 - 或 1.
- 最低 500 字符，推荐 800-1500 字符

## 边界处理原则

**绝对禁止的行为**：
- ❌ "我不知道这个问题"（直接拒绝，无帮助）
- ❌ "不清楚，请自己查"（敷衍）

**允许的行为**：
- ✅ "关于此功能的详细 API，建议查阅官方文档：[入口链接]"
- ✅ "知识库中未找到直接相关的内容，以下是一些排查方向：..."
- ✅ "此功能在 3.x 中有更新，建议参考最新文档确认：[入口链接]"

**核心原则：不允许空手而归，但允许坦诚+引导。**

## 语气风格

- 专业、友好、耐心
- 不说教、不指责
- 遇到无法确认的问题，坦诚引导用户查阅文档或补充信息

## 严格禁止

- 不编造 API 名称或文档 URL
- 不直接说"不知道"就结束（但可以说"建议查阅官方文档"并给出入口）
- 不中途截断回复
- 不敷衍用户
- 不使用过时的文档链接`;
  }

  /**
   * User Prompt v2.0 完整版 - 双模板策略
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

    if (hasMcp) {
      // 模板 A：有 MCP 检索结果
      return `## 用户问题

**标题**：${question.title}
**内容**：${question.content}
**提问者**：${question.username}
**版本**：${detectedVersion}

## 参考资料（来自 LayaAir 官方知识库）

${mcpContext}

## 回复要求（严格执行）

1. ✅ 必须基于上方【参考资料】回答此问题
2. ✅ 代码中只使用参考资料中出现的 API 和类名
3. ✅ 文档链接：
   - 优先使用参考资料中提供的链接
   - 如果参考资料中没有链接，只提供入口链接（见下方）
   - **绝对禁止自行拼接文档路径**（如编造 /doc/API/2D/laya/display/Sprite）
4. ✅ 参考资料不足以完整回答时，明确指出"此部分需要查阅官方文档"
5. ✅ 按照系统指令中的回复结构输出

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
**提问者**：${question.username}
**版本**：${detectedVersion}

## 参考资料

未检索到与此问题直接相关的官方文档内容。

## 回复要求（严格执行）

1. ✅ 基于通用编程知识给出方向性建议
2. ❌ 不得编造任何 LayaAir 特有的 API 名称或方法
3. ❌ 代码示例仅包含通用 TypeScript 逻辑，不写未经验证的 LayaAir API 调用
4. ✅ 相关文档只提供以下入口链接（禁止自行拼接）：
   - 文档入口：${docEntryLink}
   - API 入口：${apiEntryLink}
   - 社区论坛：https://ask.layabox.com/
5. ✅ 必须建议用户查阅官方文档获取具体 API 用法
6. ✅ 按照系统指令中的回复结构输出

**重要提醒**：
- 可以说"知识库中未找到直接相关的内容，以下是一些排查方向：..."
- 可以说"关于此功能的详细 API，建议查阅官方文档：[链接]"
- 不允许说"我不知道这个问题"或"不清楚，请自己查"
- 核心原则：不允许空手而归，但允许坦诚+引导

请回答：`;
    }
  }

  getFallbackAnswer(question) {
    return `## 问题分析

感谢你的提问：**${question.title}**

作为 LayaAir AI 助手，我正在学习中，目前暂时无法提供完整的答案。

## 建议

1. 查看 [LayaAir 官方文档](https://layaair.com/3.x/doc/)
2. 在 [LayaAir 社区](https://ask.layabox.com/) 搜索类似问题
3. 咨询官方技术支持

我会继续学习，争取下次能给你更好的答案！

## 相关文档

- [3.x 文档入口](https://layaair.com/3.x/doc/)
- [3.x API 入口](https://layaair.com/3.x/api/)
- [社区论坛](https://ask.layabox.com/)
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
