#!/bin/bash

echo "🚀 Starting Student Management Backend..."

# Check if MongoDB is running
echo "📊 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "❌ MongoDB is not running on localhost:27017"
    echo "💡 Please start MongoDB first:"
    echo "   - macOS: brew services start mongodb-community"
    echo "   - Or use MongoDB Atlas (cloud service)"
    echo "   - Update config.env with your MongoDB URI"
    exit 1
fi

echo "✅ MongoDB connection available"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🌐 Starting server on port 5001..."
echo "📱 API will be available at: http://localhost:5001"
echo "🔑 Health check: http://localhost:5001/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
