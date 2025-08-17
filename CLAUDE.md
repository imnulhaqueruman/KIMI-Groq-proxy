# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lightweight proxy server that enables using the Kimi K2 model (via Groq) with Claude Code. It translates between Anthropic's API format and Groq's OpenAI-compatible format, featuring TypeScript implementation with full type safety. Can be deployed locally or on Cloudflare Workers.

**Key Components:**
- **src/proxy.ts** (144 lines) - Local Hono server for development
- **src/worker.ts** (112 lines) - Cloudflare Workers-compatible version
- **src/types.ts** (67 lines) - TypeScript types and Zod validation schemas
- **src/converters.ts** (77 lines) - Message and tool conversion utilities

## Commands

### Setup and Development
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install project dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Development server with auto-reload
bun run dev

# Production server
bun run start

# The proxy will start on http://localhost:7187
```

### Development Commands
```bash
# Install dependencies
bun install

# Code formatting and linting
bun run lint        # Lint TypeScript code
bun run format      # Format code with Prettier

# Build for production
bun run build       # Build TypeScript to JavaScript

# Server modes
bun run dev         # Development with auto-reload
bun run start       # Production mode
```

### Environment Setup
```bash
# Required environment variable
export GROQ_API_KEY=your_groq_api_key_here

# Optional: Set custom port
export PORT=7187

# Create .env file for persistent config
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
```

### Using with Claude Code (Local Development)
```bash
# Set environment variables to redirect Claude Code to the proxy
export ANTHROPIC_BASE_URL=http://localhost:7187
export ANTHROPIC_API_KEY=NOT_NEEDED  # if not already authenticated

# Run Claude Code as normal
claude
```

### Cloudflare Workers Deployment
```bash
# First-time setup
npm install -g wrangler
wrangler login

# Set your API key as a secret
wrangler secret put GROQ_API_KEY

# Deploy to Cloudflare Workers
bun run deploy

# For development with wrangler
bun run dev:worker
```

## Architecture

### Core Components

1. **src/proxy.ts** - Local development server (144 lines)
   - Hono web framework application that intercepts Anthropic API calls at `/v1/messages`
   - Converts Anthropic message format to OpenAI format for Groq using converter utilities
   - Handles tool use blocks and converts between formats with full type safety
   - Returns responses in Anthropic's expected format with proper `stop_reason`
   - Built-in error handling and request validation with Zod schemas
   - Runs on localhost:7187 for local development

2. **src/worker.ts** - Cloudflare Workers implementation (112 lines)
   - Same functionality as proxy.ts but adapted for Cloudflare Workers runtime
   - Uses Cloudflare environment bindings for secure API key storage
   - Optimized for serverless edge deployment
   - No process.env dependencies, uses c.env bindings instead

3. **src/types.ts** - Type definitions and validation (67 lines)
   - Zod schemas for runtime validation of all API requests and responses
   - TypeScript interfaces derived from schemas for compile-time type safety
   - Anthropic API format definitions (ContentBlock, ToolUseBlock, ToolResultBlock, etc.)
   - OpenAI format definitions for conversion
   - Complete type coverage for all data structures

4. **src/converters.ts** - Message conversion utilities (77 lines)
   - `convertMessages()` - Converts Anthropic message format to OpenAI format
   - `convertTools()` - Maps Anthropic tool schemas to OpenAI function format
   - `convertToolCallsToAnthropic()` - Converts OpenAI tool calls back to Anthropic format
   - `generateMessageId()` - Creates unique message identifiers
   - Constants for Groq model configuration

### Key Technical Details

- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: Hono (fast, lightweight web framework)
- **Model**: Uses `moonshotai/kimi-k2-instruct` via Groq API
- **Port**: Runs on port 7187 by default (configurable via PORT env var)
- **Authentication**: Requires `GROQ_API_KEY` in environment
- **Max Tokens**: Caps at 16384 tokens (GROQ_MAX_OUTPUT_TOKENS)
- **Validation**: Zod for runtime type checking and request validation
- **Type Safety**: Full TypeScript coverage with strict compiler settings

### Message Flow Architecture

1. **Incoming Request**: Anthropic API format (`MessagesRequest`) at `/v1/messages`
2. **Validation**: Zod schema validation ensures type safety and data integrity
3. **Message Conversion**: `convertMessages()` flattens content blocks into strings
   - Text content: Passed directly to OpenAI format
   - Tool use blocks: Converted to `[Tool Use: name] input` format
   - Tool results: Wrapped in `<tool_result>` XML tags for context
4. **Tool Schema Conversion**: `convertTools()` maps Anthropic tools to OpenAI function format
5. **Groq API Call**: Standard OpenAI chat completion with `moonshotai/kimi-k2-instruct`
6. **Response Conversion**: `convertToolCallsToAnthropic()` for tool use responses
7. **Output**: Anthropic-compatible response with proper `stop_reason` ("tool_use" or "end_turn")

### Key Functions

- **Local Proxy Server** (src/proxy.ts:41-129) - Main `/v1/messages` endpoint handler for local development
- **Cloudflare Worker** (src/worker.ts:25-101) - Main endpoint handler optimized for edge deployment
- **Message Conversion** (src/converters.ts:9-31) - Anthropic to OpenAI format conversion
- **Tool Conversion** (src/converters.ts:38-46) - Tool schema mapping between formats
- **Tool Call Conversion** (src/converters.ts:52-67) - OpenAI tool calls to Anthropic format

### Environment Variables

**Local Development:**
- `GROQ_API_KEY` - Required for Groq API access (store in .env file)
- `PORT` - Server port (defaults to 7187)
- `ANTHROPIC_BASE_URL` - Set to http://localhost:7187 when using the proxy
- `ANTHROPIC_API_KEY` - Can be set to any value when using the proxy

**Cloudflare Workers:**
- `GROQ_API_KEY` - Set via `wrangler secret put GROQ_API_KEY` (secure storage)
- `ANTHROPIC_BASE_URL` - Set to your deployed worker URL (e.g., https://kimi-groq-proxy.your-subdomain.workers.dev)
- `ANTHROPIC_API_KEY` - Can be set to any value when using the proxy

### Package Dependencies

**Runtime dependencies:**
- `hono` - Fast, lightweight web framework for both local and edge deployment
- `openai` - Groq API client (OpenAI-compatible interface)
- `zod` - Runtime type validation and schema parsing

**Development dependencies:**
- `typescript` - TypeScript compiler and language support
- `@types/bun` - Bun runtime type definitions
- `@types/node` - Node.js type definitions
- `eslint` + `@typescript-eslint/*` - TypeScript-aware linting
- `prettier` - Code formatting and style consistency
- `wrangler` - Cloudflare Workers CLI for deployment
- `esbuild` - Fast bundler for Cloudflare Workers build

### Performance Characteristics

**Local Development (Bun):**
- **Fast Startup**: Sub-second server initialization with Bun
- **Low Memory**: Efficient memory usage compared to Node.js
- **Native TypeScript**: No compilation step needed in development

**Cloudflare Workers:**
- **Global Edge**: Deploy to 300+ locations worldwide
- **Zero Cold Start**: V8 isolates with instant startup
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost Effective**: Pay per request, generous free tier

**Both Environments:**
- **High Throughput**: Excellent concurrent request handling
- **Type Safety**: Compile-time and runtime type checking