# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 8081
- `npm run build` - Build production version using Vite
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview production build locally
- `npm run start` - Start production Express server on port 10000
- `npm run build:server` - Build and start production server

## Architecture Overview

This is a React-based e-commerce application for "Teelitee Club" built with:
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (database, auth, edge functions) + Express.js server for production
- **State Management**: React Context (AuthProvider, CartProvider) + TanStack Query
- **Payment**: Midtrans integration via Supabase Edge Functions
- **Deployment**: Render Web Service with custom Express server

### Key Architecture Patterns

1. **Hybrid Cart System**: Supports both authenticated users (Supabase) and guest users (localStorage) with stock validation
2. **Lazy Loading**: Admin pages and some user pages are lazy-loaded to optimize bundle size
3. **Production Server**: Custom Express server (server.js) handles static file serving with security headers and CSP
4. **Stock Management**: Real-time stock validation in cart operations prevents overselling

### Core Context Providers

- **AuthProvider** (`src/hooks/useAuth.tsx`): Handles Supabase authentication, user profiles, and role management
- **CartProvider** (`src/hooks/useCart.tsx`): Manages cart state with stock validation for both guest and authenticated users

### Supabase Integration

- Client configuration: `src/integrations/supabase/client.ts`
- Edge Functions: `supabase/functions/` (payment processing, webhooks, order management)
- Database migrations: `supabase/migrations/`

### Route Structure

- Public routes: `/`, `/shop`, `/product/:id`, `/auth`
- User routes: `/cart`, `/checkout`, `/orders`, `/account`
- Admin routes: `/admin/*` (protected by AdminRoute component)
- Payment routes: `/payment-success`, `/payment-error`, `/finish-payment`

### Key Components

- **AdminRoute** (`src/components/admin/AdminRoute.tsx`): Role-based route protection
- **ProductCard** (`src/components/shop/ProductCard.tsx`): Product display with stock status
- **SizeChart** (`src/components/shop/SizeChart.tsx`): Product size management
- **UI Components**: Located in `src/components/ui/` using shadcn/ui patterns

### Environment Variables Required

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `PORT` - Server port (defaults to 10000)
- `ALLOWED_ORIGINS` - CORS allowed origins for production

### Development Notes

- The app uses Indonesian language for user-facing messages
- Stock validation is critical - always check `product_sizes` table before cart operations
- Production server includes CSP headers for Midtrans integration
- Bundle optimization includes manual chunks for admin pages and vendor libraries
- TypeScript strict mode is enabled with relaxed unused vars rule in ESLint