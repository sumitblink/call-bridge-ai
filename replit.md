# CallCenter Pro

## Overview
CallCenter Pro is a comprehensive call center management platform designed to streamline inbound call campaigns, intelligent call routing, and performance tracking. It aims to integrate seamlessly with voice communication services like Twilio to offer a robust solution for businesses to manage their call center operations efficiently. The project's ambition is to provide an enterprise-grade platform akin to leading industry solutions, focusing on dynamic number insertion (DNI), real-time bidding (RTB) for call routing, and detailed analytics to maximize call campaign effectiveness and revenue potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication
- **Voice Integration**: Twilio SDK for call handling and webhooks

### Data Storage & Management
- **Primary Database**: PostgreSQL (Supabase/Neon support)
- **ORM**: Drizzle ORM for type-safe operations
- **Schema Management**: Drizzle Kit for migrations
- **ID Strategy**: Mixed UUIDs for external entities (campaigns) and serial integers for internal entities (users, buyers, pools, numbers)

### Key Features & Design Patterns
- **Call Management**: Campaign, number pool, buyer/agent, and call routing (priority, round-robin, pool-based) management. Dynamic Number Insertion (DNI) with exclusive number assignments.
- **Twilio Integration**: Webhooks for incoming calls, call status tracking, automatic recording, and number provisioning.
- **Analytics & Tracking**: Detailed call logs, performance metrics, DNI tracking for campaign attribution, and pixel integration for external systems.
- **Call Flow System**: Advanced IVR capabilities with node types (Menu, Gather, Play, Business Hours, Router, Splitter, Tracking Pixel, Custom Logic) supporting complex routing, A/B testing, and conditional logic.
- **Real-Time Bidding (RTB)**: Direct campaign-to-RTB target assignments, supporting external bidder integration and real-time auctions. Enhanced with publisher tracking, inbound number capture, and Ringba-compliant token system. **NEW**: Comprehensive Ringba-compliant RTB features including Rate Limiting (per minute/hour/day), Bid Expiration (bid duration and stale bid behavior), Duplicate Payouts (time-based duplicate handling), and Caller ID Requirements in dedicated General Settings tab.
- **User Interface**: Focus on a clean, professional, Ringba-style interface with compact filter systems, simplified reporting, and intuitive configuration dialogs. Components are designed for consistency, including unified table formats, simplified accordion UIs, and conditional field displays.
- **Data Integrity**: Robust validation for URL parameters (UTM), RTB configurations, and financial data to ensure clean analytics.
- **Performance Optimization**: Ultra-fast DNI service (sub-50ms) implemented with caching and query optimization to prevent caller loss. Aggressive auto-refresh loops replaced with event-driven refresh for reduced database load.
- **Security**: Multi-tenancy vulnerability fixed with comprehensive user-scoped data filtering, ensuring data isolation and proper authentication.
- **Deployment**: Configured for Node.js 20 with PostgreSQL 16 on Replit, with production builds optimized for performance.

## External Dependencies

- **Twilio**: Voice communication, number provisioning, webhooks.
- **Supabase**: PostgreSQL database hosting.
- **Neon Database**: Alternative PostgreSQL provider.
- **NPM Packages**: Express, Drizzle ORM, React Query, Zod, React Hook Form.
- **UI Components**: Radix UI, shadcn/ui, Tailwind CSS, Lucide React.
- **Geolocation**: geoip-lite for IP-based geographic data lookup.
- **AI Integration**: Claude Sonnet 4 API for intelligent chatbot support.