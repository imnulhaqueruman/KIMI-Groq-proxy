import { type Message, type Tool, type OpenAIMessage, type OpenAIFunction, type OpenAIToolCall } from './types.ts';

export const GROQ_MODEL = 'moonshotai/kimi-k2-instruct';
export const GROQ_MAX_OUTPUT_TOKENS = 16384;

/**
 * Converts Anthropic message format to OpenAI format
 */
export function convertMessages(messages: Message[]): OpenAIMessage[] {
  const converted: OpenAIMessage[] = [];
  
  for (const m of messages) {
    if (typeof m.content === 'string') {
      converted.push({ role: m.role, content: m.content });
    } else {
      const parts: string[] = [];
      for (const block of m.content) {
        if (block.type === 'text') {
          parts.push(block.text);
        } else if (block.type === 'tool_use') {
          const toolInfo = `[Tool Use: ${block.name}] ${JSON.stringify(block.input)}`;
          parts.push(toolInfo);
        } else if (block.type === 'tool_result') {
          console.log(`📥 Tool Result for ${block.tool_use_id}:`, JSON.stringify(block.content, null, 2));
          parts.push(`<tool_result>${JSON.stringify(block.content)}</tool_result>`);
        }
      }
      converted.push({ role: m.role, content: parts.join('\n') });
    }
  }
  
  return converted;
}

/**
 * Converts Anthropic tools to OpenAI function format
 */
export function convertTools(tools: Tool[]): OpenAIFunction[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema,
    },
  }));
}

/**
 * Converts OpenAI tool calls back to Anthropic format
 */
export function convertToolCallsToAnthropic(toolCalls: OpenAIToolCall[]) {
  const content = [];
  
  for (const call of toolCalls) {
    const fn = call.function;
    const arguments_ = JSON.parse(fn.arguments);
    
    console.log(`🛠 Tool Call: ${fn.name}(${JSON.stringify(arguments_, null, 2)})`);
    
    content.push({
      type: 'tool_use' as const,
      id: call.id,
      name: fn.name,
      input: arguments_,
    });
  }
  
  return content;
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
}