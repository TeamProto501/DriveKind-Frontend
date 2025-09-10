#!/bin/bash

# DriveKind Full Stack Setup Script
# This script sets up both the frontend and API components

set -e

echo "🚀 Setting up DriveKind Full Stack Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    print_error "Please run this script from the DriveKind-Workspace directory"
    exit 1
fi

# Create symlinks to the repositories
print_status "Creating symlinks to repositories..."

if [ ! -L "frontend" ]; then
    ln -s ../DriveKind-Frontend frontend
    print_success "Created frontend symlink"
else
    print_warning "Frontend symlink already exists"
fi

if [ ! -L "api" ]; then
    ln -s ../DriveKind-API api
    print_success "Created API symlink"
else
    print_warning "API symlink already exists"
fi

# Setup environment files
print_status "Setting up environment files..."

# Frontend environment
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        print_success "Created frontend .env file"
    else
        print_warning "No .env.example found for frontend"
    fi
else
    print_warning "Frontend .env file already exists"
fi

# API environment
if [ ! -f "api/.env" ]; then
    if [ -f "api/.env.example" ]; then
        cp api/.env.example api/.env
        print_success "Created API .env file"
    else
        print_warning "No .env.example found for API"
    fi
else
    print_warning "API .env file already exists"
fi

# Install dependencies
print_status "Installing frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_error "No package.json found in frontend directory"
    exit 1
fi

print_status "Installing API dependencies..."
cd ../api
if [ -f "package.json" ]; then
    npm install
    print_success "API dependencies installed"
else
    print_error "No package.json found in API directory"
    exit 1
fi

cd ..

# Create development scripts
print_status "Creating development scripts..."

# Start script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DriveKind Development Servers..."

# Start API server in background
echo "Starting API server on port 3000..."
cd api && npm start &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start frontend dev server
echo "Starting frontend dev server on port 5173..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "API: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $API_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for processes
wait
EOF

chmod +x start-dev.sh
print_success "Created start-dev.sh script"

# Database setup script
cat > setup-database.sh << 'EOF'
#!/bin/bash
echo "🗄️  Setting up DriveKind Database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we have the required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables"
    echo "You can find these in your Supabase project settings"
    exit 1
fi

echo "📋 Applying database schema..."
# Note: You'll need to run these SQL files in your Supabase SQL editor
echo "Please run the following files in your Supabase SQL editor:"
echo "1. database/schema.sql"
echo "2. database/rls-policies.sql"
echo "3. database/seed-data.sql"

echo "✅ Database setup instructions provided"
EOF

chmod +x setup-database.sh
print_success "Created setup-database.sh script"

# Create a comprehensive environment template
print_status "Creating environment template..."

cat > .env.template << 'EOF'
# DriveKind Environment Configuration
# Copy this file to .env.frontend and .env.api and fill in your values

# ========================================================
# SUPABASE CONFIGURATION
# ========================================================
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ========================================================
# API CONFIGURATION
# ========================================================
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret_key

# ========================================================
# FRONTEND CONFIGURATION
# ========================================================
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ========================================================
# DATABASE CONFIGURATION (if using direct PostgreSQL)
# ========================================================
DATABASE_URL=postgresql://username:password@localhost:5432/drivekind
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=drivekind
EOF

print_success "Created .env.template file"

# Create a comprehensive README for the workspace
print_status "Updating workspace README..."

cat >> README.md << 'EOF'

## Quick Setup Guide

### 1. Environment Configuration

Copy the environment template and configure your Supabase credentials:

```bash
cp .env.template .env.frontend
cp .env.template .env.api
```

Edit both files with your Supabase project details:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 2. Database Setup

Run the database setup script:

```bash
./setup-database.sh
```

This will provide instructions for setting up your database schema in Supabase.

### 3. Start Development

Start both servers with a single command:

```bash
./start-dev.sh
```

This will start:
- API server on http://localhost:3000
- Frontend dev server on http://localhost:5173

### 4. Manual Setup (Alternative)

If you prefer to start servers manually:

```bash
# Terminal 1: Start API
cd api && npm start

# Terminal 2: Start Frontend
cd frontend && npm run dev
```

## Project Structure

```
DriveKind-Workspace/
├── frontend/              # SvelteKit frontend (symlink)
├── api/                   # Express.js API (symlink)
├── database/              # Database schema and migrations
│   ├── schema.sql         # Main database schema
│   ├── rls-policies.sql   # Row Level Security policies
│   └── seed-data.sql      # Sample data
├── start-dev.sh           # Development server starter
├── setup-database.sh      # Database setup helper
└── .env.template          # Environment configuration template
```

## Features

### Frontend (SvelteKit)
- Role-based navigation and access control
- Admin dashboard with comprehensive management tools
- Dispatcher interface for ride management
- User profile management
- Audit logging and reporting interface
- Modern UI with Tailwind CSS and shadcn/ui components

### API (Express.js)
- RESTful API endpoints
- JWT authentication with Supabase
- Role-based access control
- Comprehensive CRUD operations
- Audit logging
- CORS configuration for development and production

### Database (PostgreSQL + Supabase)
- Multi-tenant organization structure
- Comprehensive role-based access control (RLS)
- Audit logging for all transactions
- Optimized indexes for performance
- Automated timestamp management

## Development Workflow

1. **Database Changes**: Update schema files in `database/` directory
2. **API Changes**: Modify files in `api/` directory
3. **Frontend Changes**: Modify files in `frontend/` directory
4. **Testing**: Use the development servers for testing
5. **Deployment**: Deploy API to Vercel, Frontend to Vercel

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 5173 are available
2. **Environment variables**: Ensure all required Supabase credentials are set
3. **Database connection**: Verify Supabase project is active and accessible
4. **Dependencies**: Run `npm install` in both frontend and api directories

### Getting Help

- Check the individual README files in frontend/ and api/ directories
- Review the database schema files for data structure
- Check Supabase logs for database-related issues
EOF

print_success "Updated workspace README"

# Final status
echo ""
print_success "🎉 DriveKind workspace setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment variables in .env.frontend and .env.api"
echo "2. Set up your Supabase database using the files in database/"
echo "3. Run ./start-dev.sh to start development servers"
echo ""
echo "For detailed instructions, see the README.md file"
echo ""
print_status "Happy coding! 🚀"

