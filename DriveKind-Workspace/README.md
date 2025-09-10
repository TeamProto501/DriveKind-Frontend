# DriveKind Full Stack Workspace

This workspace contains both the frontend and API components of the DriveKind application.

## Repository Structure

```
DriveKind-Workspace/
├── frontend/          # SvelteKit frontend application
├── api/              # Express.js API server
├── database/         # Database schema and migrations
└── docs/            # Documentation
```

## Quick Start

### 1. Setup Environment Variables

Copy the environment files and configure them:

```bash
# Frontend
cp ../DriveKind-Frontend/.env.example .env.frontend

# API
cp ../DriveKind-API/.env.example .env.api
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend && npm install

# Install API dependencies  
cd ../api && npm install
```

### 3. Setup Database

Run the database schema setup:

```bash
cd database && ./setup-database.sh
```

### 4. Start Development Servers

```bash
# Terminal 1: Start API server
cd api && npm start

# Terminal 2: Start frontend dev server
cd frontend && npm run dev
```

## Database Schema

The application uses PostgreSQL with Supabase and includes:

- **Organizations**: Multi-tenant organization management
- **Profiles**: User profiles with role-based access
- **Clients**: Client management for ride services
- **Drivers**: Driver management and vehicle tracking
- **Volunteers**: Volunteer management
- **Rides**: Ride scheduling and management
- **Audit Logs**: Transaction and activity logging

## Role-Based Access Control

The system implements comprehensive RLS (Row Level Security) policies:

- **Super Admin**: Full system access
- **Admin**: Organization-level access
- **Dispatcher**: Ride management access
- **Driver**: Driver-specific access
- **Volunteer**: Volunteer-specific access
- **Client**: Client-specific access

## API Endpoints

The API provides RESTful endpoints for:

- Authentication and user management
- Organization management
- Client, driver, and volunteer management
- Ride scheduling and tracking
- Audit logging and reporting

## Frontend Features

The SvelteKit frontend includes:

- Role-based navigation and access control
- Admin dashboard with comprehensive management tools
- Dispatcher interface for ride management
- User profile management
- Audit logging and reporting interface

