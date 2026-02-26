const OpenAI = require('openai');

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  async generateAnswer(question, mcpContext = '') {
    try {
      console.log(`\n🤖 生成 AI 回答...`);
      console.log(`   问题: ${question.title}`);
      console.log(`   模型: ${this.model}`);

      const prompt = this.buildPrompt(question, mcpContext);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是 LayaAir 官方技术支持工程师，精通 LayaAir 游戏引擎。你的任务是回答开发者关于 LayaAir 的问题。'
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

  buildPrompt(question, mcpContext = '') {
    let prompt = `
# 用户问题
标题：${question.title}
内容：${question.content}
作者：${question.username}

# 你的任务
请回答以上关于 LayaAir 的问题。要求：
1. 准确、专业
2. 如果需要，提供完整的代码示例
3. 使用标准 Markdown 格式
4. 如果问题不清楚，明确说明
5. 保持友好和帮助的态度
`;

    // 如果有 MCP 上下文，添加到 prompt
    if (mcpContext && mcpContext.trim().length > 0) {
      prompt += `
# 参考资料（来自 LayaAir 知识库）
${mcpContext}

**重要**：请优先参考以上资料回答问题。如果资料中有相关代码示例或文档，请基于这些内容给出准确答案。
`;
    } else {
      prompt += `
# 参考资料
- [LayaAir 官方文档](https://www.layaair.com/#/doc)
- [LayaAir API 文档](https://www.layaair.com/#/doc/API/2D/laya/display/Sprite)
`;
    }

    prompt += `
# Markdown 格式要求
- 标题：## 或 ###
- 加粗：**文字**
- 列表：- 或 1.
- 代码：\`\`\`typescript 或 \`
- 链接：[文字](链接)
- 换行：两个空格 + 回车

# 回答格式模板
## 问题分析
[简要分析问题]

## 解决方案
[给出具体答案]

### 代码示例（如果需要）
\`\`\`typescript
// 代码示例
\`\`\`

## 相关文档（使用正确的官方文档链接）
文档链接格式：https://www.layaair.com/#/doc/API/2D/laya/display/Sprite
- [文档名称](https://www.layaair.com/#/doc/...)
- 或使用：https://www.layaair.com/#/doc 主页

## 注意事项
- 注意点1
- 注意点2

现在请回答：
`;

    return prompt;
  }

  getFallbackAnswer(question) {
    return `
感谢你的提问：**${question.title}**

这是一个很好的问题。作为 LayaAir AI 助手，我正在学习中，目前暂时无法提供完整的答案。

**建议：**
1. 查看 [LayaAir 官方文档](https://www.layaair.com/#/doc)
2. 在 [LayaAir 社区](https://ask.layabox.com/) 搜索类似问题
3. 咨询官方技术支持

我会继续学习，争取下次能给你更好的答案！
`;
  }

  async testConnection() {
    try {
      console.log('\n🧪 测试 LLM 连接...');
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: '你好，请回复"连接成功"' }
        ],
        max_tokens: 50
      });

      const response = completion.choices[0].message.content;
      console.log(`   ✅ ${response}`);
      console.log(`   模型: ${this.model}\n`);

      return true;
    } catch (error) {
      console.error(`   ❌ 连接失败:`, error.message);
      console.error(`   提示: 请检查 .env 文件中的 OPENAI_API_KEY\n`);
      return false;
    }
  }
}

module.exports = AIService;
