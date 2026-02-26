const AIService = require('./ai-service');
require('dotenv').config();

async function testAIWithIK() {
  const aiService = new AIService();
  
  const mockQuestion = {
    title: 'IK 功能如何使用？',
    content: '请问在 LayaAir 中如何使用 IK（反向运动学）功能？有没有示例代码？',
    username: 'admin'
  };

  const mcpContext = `
### API 搜索结果 (共 5 个)

**IkConstraint** (Class)

**IK_Constraint1** (Interface)

**I** (Property) in Keyboard - The constant associated with the key code value (73) for the I key.

**ikcomp** (Property) in IK_System

**ik_result** (Property) in IK_ChainBase
`;

  console.log('测试 AI 生成（带 MCP 上下文）\n');
  console.log('MCP 上下文长度:', mcpContext.length);
  
  const result = await aiService.generateAnswer(mockQuestion, mcpContext);
  
  console.log('\n生成结果:');
  console.log('成功:', result.success);
  console.log('回答长度:', result.answer ? result.answer.length : 0);
  
  if (result.answer) {
    console.log('\n回答内容:');
    console.log('='.repeat(60));
    console.log(result.answer);
    console.log('='.repeat(60));
  }
  
  if (result.usage) {
    console.log('\nToken 使用:');
    console.log(result.usage);
  }
}

testAIWithIK();
