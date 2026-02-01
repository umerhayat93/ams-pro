# AMS Solutions - Mobile Shop Management System

## Overview

This is a multi-tenant mobile phone shop management system built for Pakistani mobile retailers. It enables shop owners to manage multiple retail locations, track inventory of phones (with brand, model, storage, RAM, color variants), process point-of-sale transactions, manage customers, and generate sales/profit reports. The system supports role-based access with superusers (owners) having full visibility into costs and profits, while shop staff see only selling prices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard analytics
- **PDF Generation**: jsPDF with autoTable for report exports

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript (ESM modules)
- **Authentication**: Passport.js with local strategy, session-based auth stored in PostgreSQL
- **Password Security**: scrypt hashing with timing-safe comparison
- **API Pattern**: RESTful endpoints defined in shared/routes.ts with Zod schemas for validation

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command

### Build System
- **Dev Server**: Vite with HMR for frontend, tsx for backend
- **Production Build**: esbuild bundles server with select dependencies, Vite builds client
- **Path Aliases**: `@/` for client/src, `@shared/` for shared directory

### Key Design Decisions

1. **Shared Schema Pattern**: Database schema and Zod validation schemas live in `shared/` directory, enabling type-safe API contracts between frontend and backend.

2. **Role-Based Access Control**: Two primary roles - `superuser` (shop owners with full access) and `customer` (shop staff with limited visibility). Cost prices and profit calculations are hidden from non-owners.

3. **Multi-Shop Support**: Users can own/manage multiple shops. Each shop has its own inventory, customers, and sales records.

4. **Inventory Model**: Designed for mobile phones with specific fields: brand, model, storage, RAM, color, buying price (owner-only), selling price, and low stock thresholds.

5. **Session Storage**: Uses connect-pg-simple to store sessions in PostgreSQL for persistence across server restarts.

## External Dependencies

### Database
- **PostgreSQL**: Primary database (required, configured via DATABASE_URL environment variable)
- **connect-pg-simple**: Session storage in PostgreSQL

### UI/Frontend Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, select, etc.)
- **Shadcn/ui**: Pre-styled component library
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **jsPDF + autoTable**: PDF report generation

### Backend Libraries
- **Passport.js**: Authentication framework
- **express-session**: Session middleware
- **drizzle-orm**: Database ORM and query builder

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Fast bundler for production server builds
- **Drizzle Kit**: Database migration tooling

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (defaults to dev value if not set)