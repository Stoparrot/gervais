#!/bin/bash

# Exit on error
set -e

# Display usage information
function show_usage {
  echo "Deployment script for SvelteKit application"
  echo "Usage: ./deploy.sh [option]"
  echo "Options:"
  echo "  vercel    - Prepare and deploy to Vercel"
  echo "  netlify   - Prepare and deploy to Netlify"
  echo "  github    - Prepare and deploy to GitHub Pages"
  echo "  static    - Build for static hosting"
  echo "  help      - Show this help message"
}

# Check if command is provided
if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

# Process command
case "$1" in
  vercel)
    echo "Preparing for Vercel deployment..."
    npm run build
    echo "Ready for Vercel deployment. Push to your GitHub repository and connect to Vercel."
    ;;
    
  netlify)
    echo "Preparing for Netlify deployment..."
    cp svelte.config.static.js svelte.config.js
    npm run build
    echo "Ready for Netlify deployment. Push to your GitHub repository and connect to Netlify."
    ;;
    
  github)
    echo "Deploying to GitHub Pages..."
    # Make sure the working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
      echo "ERROR: Working directory is not clean. Commit or stash your changes first."
      exit 1
    fi
    
    # Copy the static configuration
    cp svelte.config.static.js svelte.config.js
    
    # Run tests 
    npm run test:unit -- --run
    
    # Install Playwright browsers if they don't exist
    npx playwright install --with-deps chromium
    
    # Run basic Playwright tests
    npx playwright test tests/e2e/app.spec.js --project=chromium || echo "Some tests failed, but continuing with deployment"
    
    # Build the project
    NODE_ENV=production npm run build
    
    # Commit changes if any
    git add .
    git commit -m "Update build for GitHub Pages deployment" || echo "No changes to commit"
    
    # Push changes to trigger the GitHub Actions workflow
    git push origin main
    
    # Manually trigger the GitHub Pages deployment workflow
    gh workflow run "Deploy to GitHub Pages"
    
    echo "GitHub Pages deployment triggered! Check the Actions tab in your GitHub repository for progress."
    echo "Your site will be available at: https://$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\)\.git/\1/' | sed 's/\//\.github.io\//')"
    ;;
    
  static)
    echo "Building for static hosting..."
    cp svelte.config.static.js svelte.config.js
    npm run build
    echo "Build completed. Files are in the 'build' directory."
    ;;
    
  help)
    show_usage
    ;;
    
  *)
    echo "Unknown option: $1"
    show_usage
    exit 1
    ;;
esac 