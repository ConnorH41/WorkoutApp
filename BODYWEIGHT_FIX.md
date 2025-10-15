# Bodyweight Input Fix

## Issues Fixed

### 1. Database Enum Mismatch
**Problem**: The code was using `'lbs'` but the database enum `weight_unit` only accepts `'kg'` and `'lb'` (without 's').

**Error Message**: 
```
Invalid input value for enum weight_unit: 'lbs'
```

**Root Cause**: 
- Database schema (`workoutapp_db_v3`): `CREATE TYPE weight_unit AS ENUM ('kg', 'lb')`
- Code was using: `'kg' | 'lbs'`

**Fix**:
- Changed all references from `'lbs'` to `'lb'`
- Updated TypeScript types in `api.ts`
- Updated type checking in `TodayTab.tsx`

### 2. Historical Bodyweight Data Not Loading
**Problem**: When selecting a past date, the bodyweight input would remain empty even if data existed for that date.

**Fix**: 
- The existing `useEffect` already loads bodyweight data when `calendarDate` changes
- Fixed the unit check from `row.unit === 'lbs'` to `row.unit === 'lb'`
- Added default reset to `kg` when no data exists for a date

### 3. Unit Toggle State Persistence
**Problem**: When switching between dates, the unit toggle (kg/lb) wasn't properly resetting.

**Fix**:
- When loading bodyweight for a date with data: Sets unit toggle based on stored value
- When no data exists for a date: Resets to default `kg` unit

## Files Modified

### 1. `lib/api.ts`
```typescript
// Before
export async function insertBodyweight(payload: { user_id: string; weight: number; unit?: 'kg' | 'lbs' })
export async function updateBodyweight(id: string, payload: { weight?: number; unit?: 'kg' | 'lbs' })

// After
export async function insertBodyweight(payload: { user_id: string; weight: number; unit?: 'kg' | 'lb' })
export async function updateBodyweight(id: string, payload: { weight?: number; unit?: 'kg' | 'lb' })
```

- Changed `'lbs'` to `'lb'` in type definitions
- Added `.select()` to `insertBodyweight` to ensure data is returned

### 2. `screens/TodayTab.tsx`

**Save Function** (line 123):
```typescript
// Before
const unit: 'kg' | 'lbs' = isKg ? 'kg' : 'lbs';

// After
const unit: 'kg' | 'lb' = isKg ? 'kg' : 'lb';
```

**Load Function** (line 158):
```typescript
// Before
if (row.unit === 'lbs') setIsKg(false);

// After
if (row.unit === 'lb') setIsKg(false);
```

**Reset Logic** (line 162-166):
```typescript
// Added default reset when no data exists
else {
  setBodyweight('');
  setIsKg(true);  // Reset to kg as default
  setBodyweightRecordId(null);
}
```

## How It Works Now

### Saving Bodyweight
1. User enters weight value (e.g., "180")
2. User selects unit (kg or lb)
3. User clicks the checkbox
4. System saves to database with correct enum value
5. Checkbox shows ✓ and input becomes read-only
6. Record ID is stored to prevent re-editing

### Loading Historical Bodyweight
1. User selects a past date (e.g., October 13th)
2. System queries `bodyweight` table for that date
3. If data exists:
   - Weight value is displayed
   - Unit toggle is set based on stored value ('kg' or 'lb')
   - Checkbox shows ✓
   - Input is read-only
4. If no data exists:
   - Input is empty
   - Unit defaults to 'kg'
   - Checkbox is unchecked
   - Input is editable

### Unit Toggle Behavior
- **kg button**: Sets unit to 'kg' (database stores as 'kg')
- **lb button**: Sets unit to 'lb' (database stores as 'lb')
- Toggle reflects the stored unit when loading historical data
- Resets to 'kg' when navigating to dates without data

## Testing Checklist

- [x] Save bodyweight with kg unit
- [x] Save bodyweight with lb unit
- [x] Switch between kg and lb before saving
- [x] Navigate to past date with bodyweight data
- [x] Verify correct unit is displayed for historical data
- [x] Navigate to date without bodyweight data
- [x] Verify input resets to empty with kg as default
- [x] Verify checkbox shows ✓ for saved data
- [x] Verify input is read-only after saving

## Database Schema Reference

```sql
-- Enum type for weight units
CREATE TYPE weight_unit AS ENUM ('kg', 'lb');

-- Bodyweight table
CREATE TABLE public.bodyweight (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  weight numeric NOT NULL,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  unit weight_unit NOT NULL DEFAULT 'kg',
  CONSTRAINT bodyweight_pkey PRIMARY KEY (id),
  CONSTRAINT bodyweight_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

## Note on Migration File

The migration file `2025-09-25-add-bodyweight-unit.sql` uses `'lbs'` in the enum definition, but the actual database schema uses `'lb'`. If you need to recreate the database, make sure to use `'lb'` (without 's') to match the current implementation.
