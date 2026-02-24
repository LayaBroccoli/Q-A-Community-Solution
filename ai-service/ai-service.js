const OpenAI = require('openai');

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  async generateAnswer(question) {
    try {
      console.log(`\n🤖 生成 AI 回答...`);
      console.log(`   问题: ${question.title}`);
      console.log(`   模型: ${this.model}`);

      const prompt = this.buildPrompt(question);

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

  buildPrompt(question) {
    return `
# 用户问题
标题：${question.title}
内容：${question.content}
作者：${question.username}

# 你的任务
请回答以上关于 LayaAir 的问题。要求：
1. 准确、专业
2. 如果需要，提供完整的代码示例
3. 使用 Markdown 格式
4. 如果问题不清楚，明确说明
5. 保持友好和帮助的态度

# 回答格式
## 问题分析
[简要分析问题]

## 解决方案
[给出具体答案]

### 代码示例（如果需要）
\`\`\`typescript
// 代码示例
\`\`\`

## 相关文档
[列出相关文档链接]

## 注意事项
[需要注意的地方]

现在请回答：
`;
  }

  getFallbackAnswer(question) {
    return `
感谢你的提问：**${question.title}**

这是一个很好的问题。作为 LayaAir AI 助手，我正在学习中，目前暂时无法提供完整的答案。

**建议：**
1. 查看 [LayaAir 官方文档](https://layaair.com/)
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
