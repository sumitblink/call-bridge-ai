# CallCenter Pro - Project Information

## Overview

CallCenter Pro is a sophisticated Real-Time Bidding (RTB) communication routing platform specifically designed for healthcare marketing campaigns. The system replicates and enhances Ringba's functionality with exact interface matching, providing comprehensive call center management capabilities including phone number pool creation, advanced Twilio integration, RTB auction systems, campaign management, intelligent call routing strategies, target creation, and predictive routing configuration management.

## System Architecture

### Frontend Technology Stack
- **Framework**: React 18+ with TypeScript for type safety
- **Build System**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Technology Stack
- **Framework**: Express.js with TypeScript for robust API development
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication system
- **Voice Integration**: Twilio SDK for comprehensive call handling and webhooks
- **Real-time Features**: WebSocket support for live call monitoring

### Database & Storage Architecture
- **Primary Database**: PostgreSQL hosted on Supabase/Neon
- **ORM**: Drizzle ORM with automatic migrations via Drizzle Kit
- **Session Storage**: PostgreSQL sessions table for scalable session management
- **Hybrid Storage**: Intelligent fallback system between database and memory storage
- **ID Strategy**: Mixed approach - UUIDs for external-facing entities (campaigns), serial integers for internal entities (users, buyers, pools, phone numbers) for optimal performance and security

## Core Features & Capabilities

### Campaign Management System
- **Multi-Campaign Support**: Create and manage unlimited call campaigns
- **Phone Number Assignment**: Direct number assignment or pool-based routing
- **Geographic Targeting**: State-level and timezone-based call routing
- **Call Volume Controls**: Concurrent call limits and daily caps per campaign
- **Status Management**: Active/paused/draft campaign states with real-time controls

### Advanced Call Routing Engine
- **Multiple Routing Types**: 
  - Priority-based routing (weighted by buyer priority)
  - Round-robin distribution for fair load balancing
  - Capacity-based routing respecting concurrent limits
  - Pool-based dynamic number insertion (DNI)
- **Intelligent Target Selection**: Fair distribution among multiple targets within buyers
- **Fallback Mechanisms**: Automatic failover when primary targets unavailable
- **Real-time Availability**: Live capacity checking and routing decisions

### Number Pool Management (Dynamic Number Insertion)
- **Pool Creation**: Managed pools with exclusive number assignments
- **DNI Technology**: Ultra-fast (<50ms) dynamic number replacement on landing pages
- **Session Tracking**: Visitor session management with attribution
- **Number Rotation**: Intelligent number rotation based on availability and performance
- **Landing Page Integration**: JavaScript SDK for seamless number insertion

### Real-Time Bidding (RTB) System
- **Auction Management**: Complete RTB auction system with bid collection and winner selection
- **Target Configuration**: RTB targets with bid ranges, success rates, and performance metrics
- **Response Time Tracking**: Millisecond-precision bid response monitoring
- **Routing Integration**: Seamless integration with call routing for auction winners
- **Performance Analytics**: Comprehensive RTB performance reporting and optimization

### Buyer & Target Management
- **Hierarchical Structure**: Buyers as organizational containers, targets as routing endpoints
- **Capacity Management**: Concurrent call limits and daily caps per buyer/target
- **Priority Systems**: Weighted priority routing with performance-based adjustments
- **Contact Management**: Complete buyer contact information and endpoint configuration
- **Performance Tracking**: Real-time acceptance rates, response times, and success metrics

### Predictive Routing & Intelligence
- **Configuration Management**: Multiple predictive routing configurations per user
- **Revenue Optimization**: Estimated revenue per call (eRPC) calculations
- **Learning Algorithms**: Performance-based routing improvements over time
- **Settings Integration**: Campaign-level predictive routing selection
- **Advanced Controls**: Fine-tuned routing parameters and performance thresholds

### Comprehensive Analytics & Reporting
- **Enhanced Reporting**: Multi-view reporting with timeline, summary, and detailed call logs
- **Call Journey Tracking**: Complete call routing decision visibility
- **Performance Metrics**: Campaign statistics, success rates, and buyer performance
- **Attribution Tracking**: Full visitor-to-call attribution with UTM and click ID support
- **Export Capabilities**: Data export for external analysis and reporting

### Integration Ecosystem
- **Twilio Integration**: Complete voice communication, number provisioning, and webhook management
- **RedTrack Compliance**: Auto-detection system for affiliate tracking integration
- **Webhook System**: Comprehensive webhook support for external integrations
- **Pixel Tracking**: Advanced pixel firing with token replacement and macro support
- **URL Parameters**: Dynamic parameter capture and reporting integration

## Technical Implementation Details

### Voice Communication Flow
1. **Incoming Call Reception**: Twilio webhook receives call at configured endpoint
2. **Campaign Identification**: System identifies campaign by phone number or pool assignment
3. **Buyer Selection**: Advanced routing algorithm selects optimal buyer using priority, capacity, and performance rules
4. **Call Connection**: TwiML response connects caller to selected buyer target
5. **Real-time Tracking**: Live call status updates, recording management, and performance monitoring

### RTB Auction Process
1. **Bid Request Generation**: System generates bid requests for incoming calls
2. **Target Notification**: All eligible RTB targets receive bid opportunities
3. **Bid Collection**: System collects and validates bid responses within timeout window
4. **Winner Selection**: Highest valid bid wins with fallback to next highest
5. **Call Routing**: Winner receives call with complete auction tracking

### Dynamic Number Insertion (DNI)
1. **Landing Page Load**: JavaScript SDK detects campaign parameters
2. **Ultra-Fast Request**: <50ms API call to DNI service for number assignment
3. **Number Replacement**: Dynamic replacement of placeholder numbers with pool numbers
4. **Session Creation**: Visitor session tracking with UTM and attribution data
5. **Call Attribution**: Complete visitor-to-call attribution chain

### Database Schema Architecture
- **Users**: Authentication and user management
- **Campaigns**: Campaign configuration and settings
- **Buyers/Targets**: Hierarchical buyer-target relationship management
- **Calls**: Comprehensive call tracking and analytics
- **Number Pools**: Dynamic number pool management
- **RTB System**: Auction tracking and bid management
- **Visitor Sessions**: Attribution and tracking data
- **Integrations**: Webhook, pixel, and parameter management

## Development & Deployment

### Local Development Setup
```bash
npm install                    # Install dependencies
npm run db:push               # Push database schema
npm run dev                   # Start development server (port 5000)
```

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `SESSION_SECRET`: Session encryption key

### Production Deployment
- **Platform**: Replit with automatic scaling configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Build Process**: Vite production build + esbuild server bundling
- **Monitoring**: Comprehensive logging and performance tracking

## Security & Compliance

### Authentication & Authorization
- **Session-based Authentication**: Secure session management with PostgreSQL storage
- **User Isolation**: Complete data separation between user accounts
- **API Security**: Request validation and rate limiting
- **Webhook Security**: Twilio signature validation for webhook authenticity

### Data Protection
- **Database Security**: Encrypted connections and secure credential management
- **Session Encryption**: Encrypted session data with secure session keys
- **Input Validation**: Comprehensive request validation using Zod schemas
- **Error Handling**: Secure error responses without sensitive data exposure

## Performance & Optimization

### System Performance
- **Ultra-Fast DNI**: <50ms dynamic number insertion response times
- **Database Optimization**: Indexed queries and connection pooling
- **Caching Strategy**: Intelligent campaign and configuration caching
- **Real-time Updates**: WebSocket connections for live data updates

### Scalability Features
- **Horizontal Scaling**: Multi-instance deployment support
- **Database Scalability**: PostgreSQL with read replicas and connection pooling
- **Load Balancing**: Distributed call handling across multiple instances
- **Performance Monitoring**: Real-time performance metrics and alerting

## Project Status & Recent Updates

### Current Version: 2.0.0 (Production Ready)

### Latest Major Updates (July 2025)
- ✅ **Mock Data Elimination Completed**: Removed all sample data from core systems
- ✅ **Clean User Onboarding**: New users start with empty state instead of confusing sample data
- ✅ **Predictive Routing System**: Complete configuration management with database persistence
- ✅ **RTB Auction Tracking**: Comprehensive auction logging and routing decision tracking
- ✅ **Target Form Enhancements**: Dynamic predictive routing dropdown with real configurations
- ✅ **Tooltip Display Fixes**: Resolved clipping issues in popup forms with portal rendering
- ✅ **Database Persistence**: Fixed critical phone number persistence across application restarts

### System Health
- **Database Integration**: 100% operational with authentic data persistence
- **Twilio Integration**: Fully operational with webhook management
- **RTB System**: Complete auction system with real-time tracking
- **Authentication**: Secure session-based authentication working
- **Call Routing**: Intelligent routing with multiple strategies operational

## Support & Documentation

### Documentation Resources
- **API Documentation**: Complete API endpoint documentation (apiDocumentation.md)
- **RedTrack Integration Guide**: Comprehensive integration instructions (REDTRACK_TESTING_GUIDE.md)
- **Project Documentation**: Technical architecture and implementation details (Documentation.md)
- **Database Schema**: Complete schema documentation in shared/schema.ts

### Development Guidelines
- **Code Style**: TypeScript with strict type checking
- **Component Architecture**: Modular React components with proper separation of concerns
- **Database Operations**: Type-safe operations using Drizzle ORM
- **Testing Strategy**: Comprehensive testing with real data validation
- **Error Handling**: Graceful error handling with user-friendly messages

## Contact & Support

For technical support, feature requests, or integration assistance:
- Review the comprehensive documentation in the project repository
- Check the API documentation for endpoint specifications
- Refer to the RedTrack integration guide for affiliate tracking setup
- Consult the database schema for data structure understanding

---

*This project information document is automatically maintained and reflects the current state of the CallCenter Pro platform as of July 31, 2025.*