import { z } from 'zod';

// ---------- Anthropic Schema ----------
export const ContentBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ToolUseBlockSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.any()),
});

export const ToolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.any(),
});

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(
      z.union([ContentBlockSchema, ToolUseBlockSchema, ToolResultBlockSchema])
    ),
  ]),
});

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input_schema: z.record(z.any()),
});

export const MessagesRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  max_tokens: z.number().optional().default(1024),
  temperature: z.number().optional().default(0.7),
  stream: z.boolean().optional().default(false),
  tools: z.array(ToolSchema).optional(),
  tool_choice: z.union([z.string(), z.record(z.string())]).optional().default('auto'),
});

// Type inference from schemas
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type ToolUseBlock = z.infer<typeof ToolUseBlockSchema>;
export type ToolResultBlock = z.infer<typeof ToolResultBlockSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type MessagesRequest = z.infer<typeof MessagesRequestSchema>;

// OpenAI types for conversion
export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenAIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Response types
export interface AnthropicResponse {
  id: string;
  model: string;
  role: 'assistant';
  type: 'message';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, any>;
  }>;
  stop_reason: 'tool_use' | 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}