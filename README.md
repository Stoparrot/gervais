# LLM Chat Application

A versatile chat interface for interacting with various Large Language Models (LLMs), built with SvelteKit.

## Features

- **Multiple LLM Support**: Connect to Claude, GPT-4, Gemini, and local models via Ollama
- **Media Handling**: Upload and process images, audio, video, and documents
- **Audio & Video Capture**: Record audio for speech-to-text and capture video frames for analysis
- **Tool Integration**: Toggle tools like web search for enhanced capabilities
- **Responsive Design**: Full functionality on both desktop and mobile devices
- **Persistent Storage**: Save chats and settings for future sessions
- **Markdown Support**: Rich text formatting with code syntax highlighting

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/llm-chat-app.git
   cd llm-chat-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Configuration

To use cloud-based LLMs, you'll need to add your API keys in the settings panel:

- OpenAI API key for GPT models
- Anthropic API key for Claude models
- Google API key for Gemini models

For local models, ensure you have Ollama running with your desired models installed.

## Development

### Project Structure

- `src/lib/components/` - UI components
- `src/lib/services/` - LLM API integrations
- `src/lib/stores/` - Svelte stores for state management
- `src/lib/types/` - TypeScript interfaces and types
- `src/routes/` - SvelteKit routes

### Building for Production

```bash
npm run build
```

### Deployment

#### Deploying to Vercel (Recommended)

The easiest way to deploy this application is using Vercel:

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/) and sign up or log in
3. Click "New Project" and import your repository
4. Vercel will automatically detect SvelteKit and configure the build settings
5. Click "Deploy" and your application will be live in minutes

For automatic deployments via GitHub Actions, you'll need to set up the following repository secrets:
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

#### Other Deployment Options

You can also deploy to:
- Netlify
- Cloudflare Pages
- GitHub Pages
- Any static hosting service that supports SvelteKit's static adapter

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Uses [Marked](https://marked.js.org/) for Markdown rendering
- Uses [highlight.js](https://highlightjs.org/) for code syntax highlighting
- Icons from [Lucide](https://lucide.dev/)
