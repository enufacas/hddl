# Use Node.js 24 (matches your local version)
FROM node:24-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
# Note: GOOGLE_CLOUD_PROJECT must be provided at runtime via -e flag
# Example: docker run -e GOOGLE_CLOUD_PROJECT=your-project-id ...

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "api/server.mjs"]
