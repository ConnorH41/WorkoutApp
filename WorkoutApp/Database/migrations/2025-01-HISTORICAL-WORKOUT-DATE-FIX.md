# Historical Workout Date Tracking Fix

## Problem
When users selected a past date (e.g., Oct 16 while on Oct 17) and added workout data, the workouts were being created with the current date instead of the selected calendar date. This broke historical tracking because:

1. Workouts were created with `date = formatDateOnly(new Date())` (always today)
2. Logs were attached to these workouts via `workout_id`
3. When loading historical data, the system queried by date, but couldn't find workouts for past dates that were created "today"

## Example Scenario
- User is on Oct 17
- User selects Oct 16 in the calendar
- User adds exercise data (sets, reps, weight)
- BUG: Workout was created with date='2025-10-17' instead of '2025-10-16'
- Result: When user views Oct 16 again, their data didn't appear

## Solution
Modified the workout creation flow to respect the selected calendar date throughout the entire chain:

### 1. **useTodayWorkout.ts**
- `createWorkoutFromScheduledDay(dateStr?: string)`: Now accepts optional date parameter
- `addBlankExerciseToWorkout(dateStr?: string)`: Now accepts optional date parameter
- Both functions use `dateStr || formatDateOnly(new Date())` to respect selected date

### 2. **useExerciseLogs.ts**
- Updated `UseExerciseLogsOpts` type to include:
  - `createWorkoutFromScheduledDay?: (dateStr?: string) => Promise<any | null>`
  - `createTransientExercise?: (name?: string, dateStr?: string) => Promise<any | null>`
  - `getWorkoutDate?: () => string` (new function to get selected date)
- `toggleSetCompleted()`: Gets workoutDate from opts and passes to createWorkoutFromScheduledDay
- `saveSetsForExercise()`: Gets workoutDate from opts and passes to createWorkoutFromScheduledDay

### 3. **TodayTab.tsx**
- Updated `logsHook` configuration to include:
  ```typescript
  getWorkoutDate: () => calendarDate ? formatDateOnly(calendarDate) : formatDateOnly(new Date())
  ```
- This passes the selected calendar date through the entire workout creation chain

## Database Schema (Already Correct)
The database schema was already correctly designed with separate date columns:

- **workouts.date** (DATE): What date the workout is FOR (semantic date)
- **workouts.created_at** (TIMESTAMP): When the record was created (audit trail)
- **logs.workout_id** (UUID): Links to workout, inherits date from workout.date
- **logs.created_at** (TIMESTAMP): When the log was created (audit trail)

The bug was purely in the application code, not the database design.

## Testing Checklist
- [ ] Select past date (e.g., Oct 16 while on Oct 17)
- [ ] Add exercise with sets/reps/weight
- [ ] Check database: `workouts.date` should be '2025-10-16', not today's date
- [ ] Navigate away and back to Oct 16
- [ ] Verify data loads correctly from historical date
- [ ] Add more data to the same past date
- [ ] Verify it updates/appends to the same workout record

## Related Files
- `WorkoutApp/hooks/useTodayWorkout.ts`
- `WorkoutApp/hooks/useExerciseLogs.ts`
- `WorkoutApp/screens/TodayTab.tsx`
- `WorkoutApp/Database/migrations/2025-09-BODYWEIGHT-DATE-FIX.md` (similar fix for bodyweight)

## Date: January 2025
