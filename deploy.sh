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