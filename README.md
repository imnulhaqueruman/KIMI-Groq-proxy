# Kimi Groq Proxy

A lightweight proxy server that enables using the Kimi K2 model (via Groq) with Claude Code. It translates between Anthropic's API format and Groq's OpenAI-compatible format, featuring TypeScript implementation with full type safety. Can be deployed locally or on Cloudflare Workers.

## Features

- 🚀 **Dual Deployment**: Local development or Cloudflare Workers
- 🔄 **API Translation**: Converts Anthropic API calls to Groq format
- 🛡️ **Type Safety**: Full TypeScript with Zod validation
- ⚡ **High Performance**: Bun runtime for local dev, V8 isolates for edge
- 🌐 **Global Edge**: Deploy to 300+ Cloudflare locations

## Quick Start

### Option 1: Cloudflare Workers (Recommended)

1. **Setup and Deploy**:
```bash
# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Set your Groq API key securely
wrangler secret put GROQ_API_KEY
# Enter your actual Groq API key when prompted

# Deploy to Cloudflare Workers
npm run deploy
```

2. **Use with Claude Code**:
```bash
# Set environment variables (replace with your deployed URL)
export ANTHROPIC_BASE_URL=https://kimi-groq-proxy.your-subdomain.workers.dev
export ANTHROPIC_API_KEY=dummy  # Can be anything when using the proxy

# Run Claude Code normally
claude
```

### Option 2: Local Development

1. **Setup**:
```bash
# Install dependencies
npm install

# Create .env file with your Groq API key
echo "GROQ_API_KEY=your_actual_groq_key" > .env
```

2. **Start Local Server**:
```bash
# Start local proxy (runs on http://localhost:7187)
npm run start
```

3. **Configure Claude Code**:
```bash
# In another terminal, set Claude Code to use local proxy
export ANTHROPIC_BASE_URL=http://localhost:7187
export ANTHROPIC_API_KEY=dummy

# Run Claude Code
claude
```

## Testing the Proxy

Test the proxy directly with curl:

```bash
curl -X POST https://your-deployed-worker.workers.dev/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Architecture

### Core Components

- **`src/proxy.ts`** - Local development server (Bun runtime)
- **`src/worker.ts`** - Cloudflare Workers version (V8 isolates)
- **`src/types.ts`** - TypeScript types and Zod validation schemas  
- **`src/converters.ts`** - Message and tool conversion utilities

### Message Flow

1. **Incoming**: Anthropic API format at `/v1/messages`
2. **Validation**: Zod schema validation for type safety
3. **Conversion**: Anthropic messages → OpenAI format for Groq
4. **API Call**: Request to Groq with `moonshotai/kimi-k2-instruct`
5. **Response**: Convert back to Anthropic format with proper `stop_reason`

## Environment Variables

### Local Development
- `GROQ_API_KEY` - Your Groq API key (store in `.env` file)
- `PORT` - Server port (defaults to 7187)

### Cloudflare Workers  
- `GROQ_API_KEY` - Set via `wrangler secret put GROQ_API_KEY` (secure storage)

### Claude Code Configuration
- `ANTHROPIC_BASE_URL` - Set to your proxy URL
- `ANTHROPIC_API_KEY` - Can be any value when using the proxy

## Available Scripts

```bash
npm run start         # Start local proxy server
npm run dev           # Start with auto-reload
npm run deploy        # Deploy to Cloudflare Workers  
npm run dev:worker    # Develop with Cloudflare Workers locally
npm run build         # Build for local deployment
npm run lint          # Lint TypeScript code
npm run format        # Format code with Prettier
```

## Dependencies

### Runtime
- **hono** - Fast web framework for both local and edge
- **openai** - Groq API client (OpenAI-compatible)
- **zod** - Runtime type validation

### Development
- **typescript** - TypeScript compiler
- **wrangler** - Cloudflare Workers CLI
- **eslint** - TypeScript linting
- **prettier** - Code formatting

## Performance

**Local Development (Bun):**
- Sub-second startup
- Low memory usage
- Native TypeScript support

**Cloudflare Workers:**  
- Global edge deployment (300+ locations)
- Zero cold start with V8 isolates
- Auto-scaling and cost-effective pay-per-request

## License

MIT