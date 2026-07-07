# Sarvam Voice Research Assistant

A reference implementation showcasing the power of [Sarvam AI's](https://sarvam.ai) multilingual voice APIs through an agentic research assistant built with Claude and Next.js.

**[Live Demo](https://github.com/ArasanDev/sarvam-voice-research) | [Report Issues](https://github.com/ArasanDev/sarvam-voice-research/issues)**

## 🎯 What This Is

A single-page web application that demonstrates how to build a voice-native AI assistant that speaks, understands, and reasons across Indian languages. Inspired by J.A.R.V.I.S., it features:

- **Voice Input**: Speak your question in Tamil, Hindi, English, or code-mixed (Tanglish)
- **Multilingual Processing**: Automatic language detection, translation, transliteration, and text analysis via Sarvam APIs
- **Real-Time Agent Thinking**: Watch the AI think through problems step-by-step
- **Live Tool Execution**: See every API call and result as it happens
- **Voice Output**: Responses spoken back in your language
- **Minimalist JARVIS UI**: Green monospace terminal aesthetic with smooth transitions

## 🚀 Key Features

### Sarvam-Native Capabilities

This app is **powered entirely by Sarvam's APIs** — no generic LLM tools, no external search engines. Every capability comes from the Sarvam MCP server:

| Tool | Sarvam API | Purpose |
|------|------------|---------|
| **Translate** | Mayura v1 | Translate between any Indian language (formal/casual modes) |
| **Detect Language** | Text-LID | Auto-detect language of input (Tamil, Hindi, English, etc.) |
| **Analyze Text** | Text-Analytics | Extract sentiment, entities, and key points from content |
| **Transliterate** | Transliterate | Convert Tamil ↔ romanized, Hindi ↔ romanized, etc. |
| **Extract from Images** | Vision-Extract | OCR: extract text from photos in any script |
| **Text-to-Speech** | Bulbul v3 | Synthesize speech with multiple speakers and accents |

### Agent Orchestration

Built with Claude's tool use and streaming, the assistant:

1. **Receives voice input** → Transcribes via Sarvam STT
2. **Detects language** → Calls `detect_language` tool
3. **Narrates its thinking** → Streams reasoning to UI
4. **Executes tools** → Translate, analyze, extract, transliterate as needed
5. **Generates response** → Natural conversational reply
6. **Speaks output** → Sarvam TTS in your language

Real-time SSE streaming shows every step.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Next.js API routes
- **Database**: SQLite with WAL mode (minimal: conversation + message tables)
- **Voice APIs**: Sarvam AI REST APIs
- **Agent**: Claude Opus (via Anthropic SDK)
- **Deployment-Ready**: Vercel, Docker, or self-hosted

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- `npm` or `pnpm`
- Sarvam API key (free tier available at [sarvam.ai](https://sarvam.ai))
- Anthropic API key (Claude access)

### 1. Clone & Install

```bash
git clone https://github.com/ArasanDev/sarvam-voice-research.git
cd sarvam-voice-research
npm install
```

### 2. Environment Setup

Create `.env.local`:

```bash
# Sarvam AI API Key (get from https://sarvam.ai)
SARVAM_API_KEY=your_sarvam_api_key_here

# Anthropic API Key (for Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: override Sarvam model
SARVAM_CHAT_MODEL=sarvam-30b

# Optional: override TTS speaker
SARVAM_TTS_SPEAKER=vijay
```

**Never commit `.env.local`** — it's in `.gitignore`.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## 🎮 How to Use

1. **Allow Microphone**: Click the app, grant microphone access in browser
2. **Record**: Hold the **🎤 RECORD** button to speak (release to send)
3. **Or Type**: Use the text box to type your question
4. **Watch**: See the assistant's thinking, tool calls, and results stream live
5. **Listen**: Response is automatically spoken back to you

### Example Interactions

**Example 1: Multilingual Translation**
> *Speak in Tamil*: "நன்றி" (thank you)  
> *Assistant*: Detects Tamil → Translates to English → Responds "You said thank you. That's kind!"

**Example 2: Text Analysis**
> *Paste a sentence*: "The AI innovation is transformative and exciting"  
> *Assistant*: Analyzes sentiment → Extracts entities → Provides summary

**Example 3: OCR + Translation**
> *Upload image of Tamil signboard*  
> *Assistant*: Extracts Tamil text → Transliterates → Translates → Explains in English/Tamil

## 📁 Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # Main orchestrator endpoint (SSE)
│   │   ├── stt/route.ts          # Speech-to-text wrapper
│   │   └── tts/route.ts          # Text-to-speech wrapper
│   ├── page.tsx                  # Single-page JARVIS UI
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Tailwind + custom styles
├── lib/
│   ├── orchestrator.ts           # Agent loop: Claude + tools
│   ├── tools.ts                  # Sarvam tool implementations
│   ├── sarvam.ts                 # Sarvam REST API client
│   ├── events.ts                 # SSE event type definitions
│   ├── useBazaarChat.ts          # React hook for chat state
│   ├── db.ts                     # SQLite singleton
│   └── schema.sql                # Database schema
├── .mcp.json                     # MCP server config (Sarvam, shadcn)
├── .env.example                  # Template for .env.local
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### MCP Server (`.mcp.json`)

The app uses the **Sarvam MCP server** for tool definitions:

```json
{
  "mcpServers": {
    "sarvam": {
      "command": "uvx",
      "args": ["sarvam-mcp"],
      "env": {
        "SARVAM_API_KEY": "${SARVAM_API_KEY}"
      }
    }
  }
}
```

The MCP server exposes all Sarvam APIs as tools. The orchestrator (`lib/orchestrator.ts`) uses these tool specs.

### Claude Model & Temperature

Edit `lib/sarvam.ts` to adjust:

```typescript
const opts = {
  model: "sarvam-30b",        // Change to sarvam-30b-instruct if needed
  temperature: 0.2,            // Lower = deterministic, Higher = creative
  max_tokens: 900,
};
```

## 📊 How It Works: Architecture

### Request Flow

```
User speaks (mic) or types
    ↓
Browser records audio → /api/stt → Sarvam STT → Transcript
    ↓
Transcript appears with typewriter effect
    ↓
User clicks SEND → /api/chat (SSE stream)
    ↓
Orchestrator:
  1. Claude thinks: "I need to analyze this text in Tamil"
  2. Emit "thinking" event → UI shows reasoning
  3. Claude calls tools (translate, detect_language, analyze_text, etc.)
  4. Each tool call → Sarvam REST API
  5. Stream results back via SSE
    ↓
UI streams: thinking → tool_call → tool_result → thinking → ... → message
    ↓
Final message → /api/tts → Sarvam TTS → Audio playback
```

### Agent Loop (`lib/orchestrator.ts`)

```typescript
MAX_TOOL_ITERATIONS = 6  // Safety limit
For each iteration:
  - Call Claude with current messages + available tools
  - If Claude says "call tools" → emit tool_call event
    - Execute Sarvam tool
    - Emit tool_result event with outcome
  - If Claude says "respond" → emit message event
    - Call TTS (if wantsAudio=true)
    - Emit audio event
    - Emit done event → stop loop
```

## 🎨 UI Design

### Idle State
- Centered square chat box with green monospace borders
- Minimal header, input box, record button, send button

### Active State
- Box slides left (40% offset, 400ms easing)
- Left panel: thinking narration + tool calls/results
- Right panel: final response + error handling

### Styling
- **Font**: IBM Plex Mono (monospace, terminal aesthetic)
- **Colors**: Green (#22c55e) on dark slate (#0f172a)
- **Theme**: Dark mode only (inspired by hacker/JARVIS aesthetic)
- **Animations**: CSS transitions only (no animation libraries)

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add env vars: `SARVAM_API_KEY`, `ANTHROPIC_API_KEY`
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV SARVAM_API_KEY=your_key
CMD ["npm", "start"]
```

```bash
docker build -t sarvam-voice .
docker run -p 3000:3000 -e SARVAM_API_KEY=xxx sarvam-voice
```

### Self-Hosted

```bash
npm run build
npm start
# App runs on localhost:3000
```

## 🧪 Testing

### Manual Testing

1. **Voice Input**: Record and speak a sentence in Tamil
   - Check: Transcript appears, language detected correctly
   - Check: Response in Tamil

2. **Translation**: Type a Tamil phrase
   - Check: Tool calls translate_text
   - Check: English translation provided

3. **Error Handling**: Speak gibberish or leave empty
   - Check: Error message shown gracefully
   - Check: App remains responsive

### Debugging

Enable verbose logging:

```typescript
// In lib/orchestrator.ts
console.log("Tool call:", call.function.name, args);  // Add debug lines
```

Check browser DevTools → Network → `/api/chat` for SSE stream.

## 📝 Limitations & Future Work

### Current Limitations

- No user authentication (single shared conversation space)
- No persistent user history (resets on page reload)
- No image upload UI (can paste base64 encoded images)
- Sarvam API rate limits apply (free tier: ~100 requests/day)
- No mobile app (web-only for now)

### Future Enhancements

- [ ] Multi-turn conversation history persistence
- [ ] User authentication + per-user conversation storage
- [ ] Image upload widget (camera + file picker)
- [ ] Conversation export (markdown, PDF)
- [ ] Custom speaker selection via UI
- [ ] Real-time transcription (streaming STT)
- [ ] Mobile app (React Native)
- [ ] Voice commands ("send", "clear", "repeat")
- [ ] Accessibility: ARIA labels, keyboard navigation
- [ ] Analytics: usage patterns, language distribution

## 🤝 Contributing

This is a reference implementation. Improvements welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m "Add my feature"`)
4. Push to GitHub (`git push origin feature/my-feature`)
5. Open a Pull Request

### Ideas for Contributions

- Better error messages
- More Sarvam tools (dub, localize, etc.)
- Performance optimizations
- UI accessibility improvements
- Translation of README to Tamil/Hindi
- Docker Compose setup for local dev

## 📜 License

MIT License — see `LICENSE` file for details.

## 🙏 Acknowledgments

- **Sarvam AI** — for the incredible multilingual APIs powering this app
- **Anthropic** — for Claude and the tool use framework
- **Next.js & Vercel** — for the excellent framework
- **Tailwind CSS** — for rapid UI development
- **The open-source community** — for inspiration and libraries

## 📧 Support

- **Questions?** Open an issue on GitHub
- **Found a bug?** Report it with steps to reproduce
- **Feature request?** Let us know in Discussions

---

Built with 🎙️ and 💚 for the Sarvam community.  
**Star this repo if it helped you understand agentic systems with voice! ⭐**
