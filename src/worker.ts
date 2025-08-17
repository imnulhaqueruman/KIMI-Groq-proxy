import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { OpenAI } from 'openai';
import { MessagesRequestSchema, type AnthropicResponse } from './types.ts';
import {
  convertMessages,
  convertTools,
  convertToolCallsToAnthropic,
  generateMessageId,
  GROQ_MODEL,
  GROQ_MAX_OUTPUT_TOKENS,
} from './converters.ts';

// Cloudflare Workers environment interface
interface Env {
  GROQ_API_KEY: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({ message: 'Groq Anthropic Tool Proxy is alive 💡' });
});

// Main proxy endpoint
app.post('/v1/messages', async (c) => {
  try {
    const groqApiKey = c.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return c.json(
        {
          error: {
            type: 'invalid_request_error',
            message: 'GROQ_API_KEY environment variable is required',
          },
        },
        400
      );
    }

    const client = new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const body = await c.req.json();
    console.log('🚀 Anthropic → Groq | Model:', body.model);
    
    // Validate request
    const request = MessagesRequestSchema.parse(body);
    
    // Convert messages and tools
    const openaiMessages = convertMessages(request.messages);
    const tools = request.tools ? convertTools(request.tools) : undefined;
    
    // Cap max tokens
    const maxTokens = Math.min(
      request.max_tokens || GROQ_MAX_OUTPUT_TOKENS,
      GROQ_MAX_OUTPUT_TOKENS
    );
    
    if (request.max_tokens && request.max_tokens > GROQ_MAX_OUTPUT_TOKENS) {
      console.log(`⚠️  Capping max_tokens from ${request.max_tokens} to ${GROQ_MAX_OUTPUT_TOKENS}`);
    }
    
    // Make request to Groq
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: openaiMessages,
      temperature: request.temperature,
      max_tokens: maxTokens,
      tools: tools,
      tool_choice: typeof request.tool_choice === 'string' ? request.tool_choice as any : request.tool_choice,
    });
    
    const choice = completion.choices[0];
    const message = choice.message;
    
    // Convert response back to Anthropic format
    let content: any[];
    let stopReason: 'tool_use' | 'end_turn';
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      content = convertToolCallsToAnthropic(message.tool_calls);
      stopReason = 'tool_use';
    } else {
      content = [{ type: 'text', text: message.content || '' }];
      stopReason = 'end_turn';
    }
    
    const response: AnthropicResponse = {
      id: generateMessageId(),
      model: `groq/${GROQ_MODEL}`,
      role: 'assistant',
      type: 'message',
      content,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
      },
    };
    
    return c.json(response);
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    if (error instanceof Error) {
      return c.json(
        {
          error: {
            type: 'invalid_request_error',
            message: error.message,
          },
        },
        400
      );
    }
    
    return c.json(
      {
        error: {
          type: 'internal_server_error',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  }
});

export default app;