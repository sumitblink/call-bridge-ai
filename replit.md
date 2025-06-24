# CallCenter Pro - Replit Markdown

## Overview

CallCenter Pro is a comprehensive call center management platform built with React, Express.js, and PostgreSQL. The system enables businesses to manage inbound call campaigns, route calls to buyers/agents, track performance metrics, and integrate with external services like Twilio for voice communications.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and building

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication system
- **Voice Integration**: Twilio SDK for call handling and webhooks

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Supabase
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL sessions table
- **Schema Management**: Drizzle Kit for migrations

## Key Components

### Call Management System
- **Campaign Management**: Create and manage call campaigns with phone number assignments
- **Call Routing**: Intelligent routing system supporting priority-based, round-robin, and pool-based routing
- **Number Pool Management**: Dynamic number insertion (DNI) with exclusive number assignments
- **Buyer/Agent Management**: Configure buyers and agents with capacity limits and priorities

### Twilio Integration
- **Voice Webhooks**: Handle incoming calls at `/api/webhooks/voice`
- **Call Status Tracking**: Monitor call progress and completion
- **Recording Management**: Automatic call recording with URL generation
- **Number Provisioning**: Search and purchase phone numbers through Twilio API

### Campaign Routing Types
- **Direct Routing**: Single phone number per campaign
- **Pool-based Routing**: Dynamic number assignment from managed pools
- **Priority-based Selection**: Route calls based on buyer/agent priority levels
- **Capacity Management**: Respect concurrent call limits per buyer/agent

### Analytics and Tracking
- **Call Logs**: Detailed tracking of all call routing decisions
- **Performance Metrics**: Campaign statistics, success rates, and buyer performance
- **DNI Tracking**: Dynamic number insertion for campaign attribution
- **Pixel Integration**: Postback pixels for external system integration

## Data Flow

### Incoming Call Flow
1. **Call Received**: Twilio webhook hits `/api/webhooks/voice` endpoint
2. **Campaign Lookup**: System identifies campaign by phone number or pool assignment
3. **Buyer Selection**: CallRouter selects best available buyer using priority and capacity rules
4. **Call Connection**: TwiML response connects caller to selected buyer
5. **Call Tracking**: Real-time status updates and recording management

### Campaign Setup Flow
1. **Campaign Creation**: Define routing type (direct or pool-based)
2. **Number Assignment**: Either assign direct number or connect to number pool
3. **Buyer Configuration**: Add buyers with priorities and capacity limits
4. **Webhook Setup**: Configure Twilio webhooks for assigned numbers

### Pool Management Flow
1. **Pool Creation**: Create number pools with unique names per user
2. **Number Assignment**: Assign numbers exclusively to one pool (prevents conflicts)
3. **Campaign Assignment**: Connect campaigns to pools for dynamic routing
4. **Webhook Updates**: Automatically configure pool-based webhook URLs

## External Dependencies

### Core Services
- **Twilio**: Voice communication, number provisioning, and webhooks
- **Supabase**: PostgreSQL database hosting
- **Neon Database**: Alternative PostgreSQL provider support

### NPM Packages
- **Express**: Web framework
- **Drizzle ORM**: Database operations
- **React Query**: Client-side data fetching
- **Zod**: Runtime type validation
- **React Hook Form**: Form management

### UI Components
- **Radix UI**: Headless UI components
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Development**: `npm run dev` on port 5000
- **Production Build**: Vite build + esbuild for server bundling
- **Autoscale**: Configured for automatic scaling on deployment

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `SESSION_SECRET`: Session encryption key

### Database Management
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Managed through Drizzle Kit
- **Connection**: Neon serverless PostgreSQL client

## Changelog
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.