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

#### Deploying to GitHub Pages

This application is set up for easy deployment to GitHub Pages:

1. Push your code to a GitHub repository
2. The GitHub Actions workflow will automatically build and deploy your site
3. Your site will be available at `https://your-username.github.io/your-repo-name/`

The deployment happens automatically when you push to the `main` branch, thanks to the configured GitHub Actions workflow.

If you want to manually deploy:

```bash
# Build the app with static adapter
cp svelte.config.static.js svelte.config.js
npm run build

# Create/switch to gh-pages branch
git checkout gh-pages
# (or git checkout -b gh-pages if the branch doesn't exist)

# Copy build files to root directory
cp -r build/* .

# Commit and push
git add .
git commit -m "Update site"
git push origin gh-pages

# Return to main branch
git checkout main
```

#### Other Deployment Options

You can also deploy to:
- Netlify
- Cloudflare Pages
- Any static hosting service that supports SvelteKit's static adapter

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Uses [Marked](https://marked.js.org/) for Markdown rendering
- Uses [highlight.js](https://highlightjs.org/) for code syntax highlighting
- Icons from [Lucide](https://lucide.dev/)
