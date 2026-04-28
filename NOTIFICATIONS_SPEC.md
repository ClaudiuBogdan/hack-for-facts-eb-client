# Newsletter & Alerts Feature - Specification

> **Status**: ✅ Client implementation complete
> **Build**: ✅ Typechecks pass
> **Next**: Backend API implementation

## Overview

This feature allows users to subscribe to budget execution updates for entities they care about. Users can receive:

- **Monthly newsletters** - Budget updates every month
- **Quarterly newsletters** - Budget summary every quarter
- **Annual newsletters** - Yearly budget report

## Design Principles

1. **Simple & Intuitive** - Minimal clicks to subscribe/unsubscribe
2. **Fast & Responsive** - Optimistic UI updates, instant feedback
3. **Progressive Enhancement** - Works for anonymous users (login prompt), enhanced for authenticated users
4. **Non-Intrusive** - Contextual, not spammy; clear value proposition
5. **Accessible** - Keyboard navigation, screen reader support, mobile-friendly

---

## User Flows

### Flow 1: Quick Subscribe from Entity Page

**Anonymous User:**

1. User clicks bell icon on entity page
2. Modal appears: "Sign in to get notifications about [Entity Name]"
3. User clicks "Sign in" → Clerk sign-in modal
4. After sign-in → Automatically subscribe to default notifications (monthly newsletter)
5. Toast: "✓ You'll receive monthly updates about [Entity Name]"
6. Bell icon changes to "active" state

**Authenticated User:**

1. User clicks bell icon
2. Popover opens with quick options:
   - "Monthly newsletter" (checkbox, checked by default)
   - "Quarterly newsletter" (checkbox)
   - "Annual newsletter" (checkbox)
   - "Manage notifications" link → Full settings page
3. User toggles checkboxes
4. Changes save automatically (debounced)
5. Toast feedback for each action

### Flow 2: Manage All Notifications (Settings Page)

1. User navigates to `/settings/notifications`
2. Page shows:
   - List of all active subscriptions (grouped by entity)
   - Option to add new subscriptions
   - Configure data series alerts (advanced - Phase 2)
3. Each subscription card shows:
   - Entity name + CUI
   - Notification type badges
   - Toggle to activate/deactivate
   - "Remove" button
   - Link to entity page

### Flow 3: Unsubscribe via Email Link

1. User clicks unsubscribe link in email: `/unsubscribe/:token`
2. Page loads with notification details:
   - Entity name
   - Notification type
   - "Confirm unsubscribe" button
3. User confirms → Notification deactivated
4. Success message: "You've been unsubscribed from [notification type] for [Entity Name]"
5. Option to "Manage all notifications" or "Go to homepage"

---

## Business Logic

### Notification Types

```typescript
type NotificationType =
  | 'newsletter_entity_monthly'
  | 'newsletter_entity_quarterly'
  | 'newsletter_entity_yearly'
  | 'alert_series_analytics' | 'alert_series_static';
```

### Subscription Rules

1. **Uniqueness**: User can have only one subscription per (entityCui, notificationType) pair
2. **Hash-based Upsert**: Server generates hash from `userId + entityCui + notificationType`
3. **Soft Delete**: Deactivating sets `isActive: false` (preserves history)
4. **Anonymous Users**: Must authenticate before subscribing

### State Management

- **React Query Cache**: 5-minute stale time
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Query Keys**:
  - `['notifications', 'all']` - All user notifications
  - `['notifications', 'entity', cui]` - Entity-specific notifications

### Authentication Flow

```
Page Loads → useAuth() → Clerk checks auth
  │
  ├─ isLoaded = false → Show loading
  ├─ isLoaded = true + isSignedIn = false → Show sign-in button
  └─ isLoaded = true + isSignedIn = true → Fetch notifications
```

---

## API Specification

### Endpoints (Client → Server)

```typescript
// Get all notifications for current user
GET /api/v1/notifications
Response: Notification[]

// Get notifications for specific entity
GET /api/v1/entities/:cui/notifications
Response: Notification[]

// Create or update notification (upsert by hash)
PUT /api/v1/notifications
Body: {
  entityCui: string | null;
  notificationType: NotificationType;
  isActive: boolean;
  config?: NotificationConfig;
}
Response: Notification

// Deactivate notification
PATCH /api/v1/notifications/:id
Body: { isActive: false }
Response: Notification

// Unsubscribe via token (public endpoint)
POST /api/v1/unsubscribe/:token
Response: { success: true; notification: Notification }
```

### Data Types

```typescript
export interface Notification {
  id: number;
  userId: string;
  entityCui: string | null;
  notificationType: NotificationType;
  isActive: boolean;
  config: Record<string, any> | null;
  hash: string;
  createdAt: string;
  updatedAt: string;
  // Joined data (if available)
  entity?: {
    name: string;
    cui: string;
  };
}

export interface NotificationConfig {
  // Newsletter config
  includeComparisons?: boolean;
  includeTrends?: boolean;
  topCategoriesLimit?: number;

  // Alert config (Phase 2)
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold?: number;
  period?: 'monthly' | 'quarterly' | 'annual';
  filters?: Record<string, any>;
}
```

---

## Implementation Architecture

### Technology Stack

- **Framework**: React 19 + TypeScript
- **Router**: TanStack Router (file-based routing)
- **State Management**: TanStack Query (React Query)
- **Auth**: Clerk (via custom `useAuth` hook)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: lucide-react
- **Notifications**: sonner (toast library)
- **i18n**: Lingui

### File Structure

```
src/
├── features/
│   └── notifications/
│       ├── api/
│       │   └── notifications.ts          # API client
│       ├── components/
│       │   ├── EntityNotificationBell.tsx    # Bell button
│       │   ├── NotificationQuickMenu.tsx     # Quick subscribe menu
│       │   ├── NotificationCard.tsx          # Settings page card
│       │   └── NotificationList.tsx          # Settings page list
│       ├── hooks/
│       │   ├── useEntityNotifications.ts     # Fetch entity notifications
│       │   ├── useAllNotifications.ts        # Fetch all notifications
│       │   ├── useToggleNotification.ts      # Toggle on/off
│       │   └── useUnsubscribe.ts             # Unsubscribe via token
│       └── types.ts                          # TypeScript types
├── routes/
│   ├── settings/
│   │   └── notifications.tsx             # Settings page
│   └── unsubscribe.$token.tsx            # Unsubscribe page
└── components/
    └── challenges/analysis/
        └── challenge-entity-analysis-header.tsx  # Bell rendered in page header
```

### Component Architecture

**EntityNotificationBell** - Bell icon button on entity pages

- Location: [challenge-entity-analysis-header.tsx](src/features/challenges/components/analysis/challenge-entity-analysis-header.tsx)
- States: Anonymous (outline), Subscribed (filled + badge), Unsubscribed (outline)
- Behavior: Opens popover (auth) or sign-in dialog (anonymous)

**NotificationQuickMenu** - Popover/Sheet with checkboxes

- Desktop: Popover (floating)
- Mobile: Sheet (bottom drawer)
- Auto-saves changes with optimistic updates

**NotificationList** - Settings page list view

- Groups notifications by entity
- Toggle switches for active/inactive
- Delete with confirmation dialog

**Unsubscribe Page** - Public route for email unsubscribe

- No auth required
- Confirmation step
- Success/error states

### Data Flow

```
UI Layer (Components)
    ↓ useState, event handlers
Hook Layer (React Query)
    ↓ useQuery, useMutation
API Layer (Fetch functions)
    ↓ fetch() + getAuthToken()
Server (REST API)
```

### Optimistic Updates Flow

```
User clicks checkbox
    ↓
useToggleNotification.mutate()
    ↓
onMutate (Optimistic Update)
    ├─ Cancel ongoing queries
    ├─ Snapshot current cache
    └─ Update cache optimistically → UI updates immediately ✨
    ↓
mutationFn (API Call)
    ├─ SUCCESS → onSuccess
    │   ├─ Invalidate queries
    │   └─ Show toast: "Notification enabled"
    └─ ERROR → onError
        ├─ Rollback cache to snapshot
        └─ Show toast: "Failed to update"
```

---

## UI/UX Details

### Entity Page - Bell Button

**States:**

- Anonymous: 🔔 (outline, no badge)
- Authenticated + Not subscribed: 🔕 (bell off, no badge)
- Authenticated + Subscribed: 🔔³ (filled, badge with count)
- Loading: 🔄 (spinner)

**Quick Menu (Desktop - Popover):**

```
┌───────────────────────────────────────────────┐
│  Primește actualizări despre                  │
│  Primăria Cluj-Napoca                         │
│ ───────────────────────────────────────────── │
│                                               │
│  ☑ Raport Lunar                               │
│    Primește un raport lunar cu execuția      │
│    bugetară                                   │
│                                               │
│  ☐ Raport Trimestrial                         │
│    Primește un raport trimestrial cu         │
│    execuția bugetară                          │
│                                               │
│  ☐ Raport Anual                               │
│    Primește un raport anual cu execuția      │
│    bugetară                                   │
│                                               │
│ ───────────────────────────────────────────── │
│                                               │
│  [Gestionează toate notificările]            │
│                                               │
└───────────────────────────────────────────────┘
```

**Quick Menu (Mobile - Sheet):**

- Bottom drawer
- Full width
- Close button [×]
- Same content as popover

### Settings Page

**List View:**

- Cards grouped by entity
- Each card shows:
  - Entity name + CUI (link to entity page)
  - Notification type badge
  - Switch (ON/OFF)
  - Delete button [🗑]

**Empty State:**

```
┌─────────────────────────────────────────────────┐
│                     ℹ️                           │
│  Nu ai nicio notificare activă.                 │
│                                                 │
│  Navighează la o pagină de entitate și apasă   │
│  pe iconița de clopoțel pentru a te abona.     │
└─────────────────────────────────────────────────┘
```

### Unsubscribe Page

**Confirmation:**

```
┌─────────────────────────────────────────────────┐
│              🔔                                 │
│  Dezabonare de la notificări                   │
│  ───────────────────────────                   │
│                                                 │
│  Ești sigur că vrei să te dezabonezi?         │
│                                                 │
│  [Anulează]  [Confirmă dezabonarea]            │
└─────────────────────────────────────────────────┘
```

**Success:**

```
┌─────────────────────────────────────────────────┐
│              ✅                                 │
│  Dezabonat cu succes                           │
│  ──────────────────                            │
│                                                 │
│  Nu vei mai primi notificări de tip            │
│  "Raport Lunar" pentru Primăria Cluj-Napoca   │
│                                                 │
│  [Gestionează]  [Mergi la pagina principală]   │
└─────────────────────────────────────────────────┘
```

### Toast Notifications

- ✅ Success: "Notificare activată"
- ❌ Error: "Failed to update notification"
- 🗑️ Deleted: "Notificare ștearsă"

---

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA labels on icon buttons
- ✅ Screen reader support (semantic HTML)
- ✅ Focus management in modals/popovers
- ✅ WCAG AA color contrast

**Screen Reader Announcements:**

- "Sign in to get notifications"
- "Manage notifications, button"
- "Monthly newsletter, checkbox, checked"
- "Toggle notification active, switch, on"

---

## Performance Optimizations

1. **Query Caching**: React Query with 5-minute stale time
2. **Optimistic Updates**: Instant UI feedback before server response
3. **Debounced Mutations**: Batch rapid toggle actions
4. **Lazy Loading**: Settings page loaded on-demand
5. **Memoization**: Memoized components for notification lists
6. **Query Deduplication**: Multiple components requesting same data → Single API call

---

## Mobile Considerations

- **Touch Targets**: Minimum 44x44px
- **Responsive Popover**: Uses `ResponsivePopover` (Popover on desktop, Sheet on mobile)
- **Thumb-Friendly**: Primary actions at bottom of mobile screens
- **Breakpoint**: Desktop (>640px) vs Mobile (≤640px)

---

## Security

1. **Auth Tokens**: `Authorization: Bearer {token}` in headers only
2. **No Email Storage**: Only user IDs stored client-side
3. **Unsubscribe Tokens**: Cryptographically secure (SHA-256), single-use, 1-year expiration
4. **CORS**: API must allow client domain

---

## Environment Variables

```bash
# Required
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Optional
VITE_SITE_URL=https://transparenta.eu
```

---

## Quick Start

### Development Setup

```bash
# Install dependencies
yarn install

# Create .env.local
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Start dev server
yarn dev

# Run typechecks
yarn typecheck

# Compile translations
yarn i18n:compile
```

### Testing Locally

**Without Backend (Mock):**
Modify `src/features/notifications/api/notifications.ts` to return mock data.

**With Backend:**
Start API server on `http://localhost:3000` and implement the endpoints above.

---

## Internationalization (i18n)

All user-facing strings use Lingui macros:

```tsx
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';

// React components
<Trans>Monthly newsletter</Trans>

// Attributes
aria-label={t`Manage notifications`}
```

**Workflow:**

```bash
# Extract new strings
yarn i18n:extract

# Edit translation files
# src/locales/ro/messages.po

# Compile translations
yarn i18n:compile
```

---

## Error Handling

### Client-Side Errors

```typescript
function handleNotificationError(error: Error, action: string) {
  console.error(`Notification ${action} failed:`, error);

  if (error.message.includes('401')) {
    toast.error('Please sign in to manage notifications');
  } else if (error.message.includes('404')) {
    toast.error('Notification not found');
  } else {
    toast.error(`Failed to ${action}. Please try again.`);
  }
}
```

### Fallback UI

- Network errors → Retry button
- Auth errors → Sign-in prompt
- Not found → "Notification already removed" message

---

## Common Issues & Solutions

### Issue: Bell icon doesn't show

**Solution:** Check that `challenge-entity-analysis-header.tsx` renders the bell:

```typescript
import { EntityNotificationBell } from '@/features/notifications/components/EntityNotificationBell';

// In JSX:
<EntityNotificationBell cui={entity.cui} entityName={entity.name} />
```

### Issue: "Failed to fetch notifications"

**Solution:**

1. Check API endpoint is running
2. Verify `VITE_API_URL` in `.env.local`
3. Check browser console for CORS errors

### Issue: Toggle doesn't work

**Solution:**

1. Verify API endpoint returns correct response
2. Check React Query DevTools for errors
3. Look at browser console for error messages

### Issue: Translations not showing

**Solution:**

```bash
yarn i18n:extract
yarn i18n:compile
```

---

## Deployment Checklist

- [ ] API endpoints implemented and tested
- [ ] Database tables created
- [ ] Environment variables set in production
- [ ] Translations compiled (`yarn i18n:compile`)
- [ ] TypeScript passes (`yarn typecheck`)
- [ ] Build succeeds (`yarn build`)
- [ ] Test in staging environment
- [ ] Clerk configured with production keys
- [ ] Email templates ready
- [ ] Newsletter script tested

### Production Environment Variables

```bash
VITE_API_URL=https://api.transparenta.eu
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_SITE_URL=https://transparenta.eu
```

---

## Analytics (Optional)

Track user interactions for product insights:

```typescript
import { Analytics } from '@/lib/analytics';

// Bell clicked
Analytics.capture('notification_bell_clicked', { cui });

// Subscription toggled
Analytics.capture('notification_subscription_toggled', {
  cui,
  notificationType,
  isActive,
});

// Settings viewed
Analytics.capture('notification_settings_viewed', {
  count: notifications.length,
});

// Unsubscribed
Analytics.capture('notification_unsubscribed', {
  notificationType,
});
```

---

## Future Enhancements (Phase 2)

### Advanced Features

- [ ] Data series alerts (custom queries)
- [ ] Multi-entity subscriptions
- [ ] In-app notifications
- [ ] Notification preferences (email/SMS/in-app)
- [ ] Digest frequency settings (daily, weekly)
- [ ] Team subscriptions
- [ ] Custom alert thresholds

### UI Improvements

- [ ] Notification center
- [ ] Read/unread status
- [ ] Notification history
- [ ] Bulk actions

---

## Next Steps (Backend)

1. **Implement API Endpoints**
   - Use spec from API Specification section above
   - REST endpoints for CRUD operations
   - Public unsubscribe endpoint

2. **Database Setup**
   - Create `Notifications` table
   - Create `NotificationDeliveries` table
   - Create `UnsubscribeTokens` table

3. **Newsletter Script**
   - CLI script to send newsletters
   - Batch processing
   - Deduplication logic
   - Email template rendering

---

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lingui i18n Docs](https://lingui.dev)
- [Clerk Auth Docs](https://clerk.com/docs)

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
**Status**: ✅ Client implementation complete (awaiting backend)
