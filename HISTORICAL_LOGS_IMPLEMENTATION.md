# Historical Workout Logs Implementation

## Overview
This document explains how historical workout data is loaded and displayed when users select past dates in the Today tab.

## Problem Statement
When a user logs a workout (sets, reps, weight, notes) by checking the set checkboxes, this data is stored in the `logs` table. However, when users selected a past date, the logged data was not being displayed - the exercise cards would show empty fields instead of the previously logged data.

## Solution Architecture

### Database Schema Understanding
The app uses three key tables for workout tracking:

1. **`exercises` table**: Template exercises defined by users (e.g., "Bench Press" with 3 sets, 10 reps)
2. **`workout_exercises` table**: Per-workout exercise instances (snapshots) with:
   - `id`: Unique instance ID for this workout
   - `workout_id`: Reference to the workout
   - `exercise_id`: Reference to the original exercise template
   - `name`, `sets`, `reps`, `notes`: Snapshot of exercise details

3. **`logs` table**: Individual set data with:
   - `workout_id`: Reference to the workout
   - `exercise_id`: Reference to the original exercise template
   - `set_number`, `reps`, `weight`, `notes`, `completed`: Actual logged data

### Key Implementation Changes

#### 1. Date-Triggered Workout Fetching
Added a `useEffect` in `TodayTab.tsx` that refetches workout data when `calendarDate` changes:

```typescript
useEffect(() => {
  if (profile && profile.id && calendarDate) {
    const isoDate = formatDateOnly(calendarDate);
    fetchActiveSplitRun().then(splitInfo => {
      if (splitInfo && splitInfo.run && splitInfo.split) {
        fetchTodayWorkout(isoDate, { 
          activeRun: splitInfo.run, 
          splitTemplate: splitInfo.split, 
          splitDays: splitInfo.splitDays 
        });
      } else {
        fetchTodayWorkout(isoDate);
      }
    });
  }
}, [calendarDate, profile]);
```

#### 2. Historical Logs Loading
Added a separate `useEffect` that loads historical logs from the database:

```typescript
useEffect(() => {
  const loadHistoricalLogs = async () => {
    // 1. Fetch workout for selected date
    const { data: workout } = await api.getWorkoutByUserDate(profile.id, isoDate);
    
    // 2. Fetch logs for this workout
    const { data: logsData } = await api.getLogsByWorkoutId(workout.id);
    
    // 3. Fetch workout_exercises to create mapping
    const { data: workoutExercises } = await api.getWorkoutExercisesByWorkoutId(workout.id);
    
    // 4. Map original exercise_id to workout_exercise instance id
    const exerciseIdToInstanceId = {};
    workoutExercises.forEach(we => {
      if (we.exercise_id) {
        exerciseIdToInstanceId[we.exercise_id] = we.id;
      }
    });
    
    // 5. Group logs by exercise and map to instances
    // ... (see code for full logic)
    
    // 6. Update logs state
    logsHook.setLogs(groupedLogs);
    logsHook.setNotesByExercise(notesMap);
  };
  
  loadHistoricalLogs();
}, [calendarDate, profile, todayWorkout, workoutLoading, exercises]);
```

#### 3. Exercise-to-Instance Mapping
The critical piece is mapping logs (which reference original `exercise_id`) to the displayed `workout_exercises` instances:

**Problem**: 
- UI displays `workout_exercises` instances (e.g., instance ID: `abc-123`)
- Logs reference original exercises (e.g., exercise ID: `xyz-789`)

**Solution**:
- Each `workout_exercise` has both an `id` (instance) and `exercise_id` (original)
- Create mapping: `{ [original_exercise_id]: workout_exercise_instance_id }`
- Map logs from original exercise IDs to instance IDs
- Populate `logsHook.logs` with instance IDs as keys

### Data Flow

```
User selects past date
    ↓
calendarDate state updates
    ↓
Two useEffects trigger in parallel:
    ↓
    ├─→ Fetch workout & workout_exercises for date
    │   (updates exercises state)
    │
    └─→ Load historical logs:
        1. Get workout for date
        2. Get logs for workout
        3. Get workout_exercises for workout
        4. Map logs to workout_exercise instances
        5. Update logsHook.logs state
            ↓
ExerciseCard components re-render
    ↓
Display historical data:
- Set checkboxes show completed state
- Reps/weight fields show logged values
- Notes show logged text
```

## User Experience

### Before Implementation
1. User selects October 13th (past date)
2. Exercise cards show: Empty reps/weight fields, no checked boxes
3. User has to remember what they did

### After Implementation
1. User selects October 13th
2. System loads workout and logs from database
3. Exercise cards show:
   - ✅ Bench Press: Set 1 (200 lbs × 10 reps) ✓ Completed
   - ✅ Bench Press: Set 2 (200 lbs × 10 reps) ✓ Completed
   - ✅ Bench Press: Set 3 (200 lbs × 10 reps) ✓ Completed
   - 📝 Notes: "felt off"
4. User can review their exact historical performance

## Edge Cases Handled

1. **No workout for date**: Clears logs, shows empty state
2. **No logs for workout**: Shows exercise structure but empty sets
3. **Workout without instances**: Falls back to template exercises
4. **Missing mapping**: Uses original exercise_id as fallback
5. **Loading states**: Waits for workout to load before fetching logs

## Files Modified

- `TodayTab.tsx`: Added two useEffects for date-triggered fetching and log loading
- No changes to `useExerciseLogs.ts` or `useTodayWorkout.ts` (pure additions in TodayTab)

## Testing Checklist

- [ ] Select today's date - shows current workout
- [ ] Select past date with workout - shows historical logs
- [ ] Select past date without workout - shows empty/rest day
- [ ] Log a workout, then navigate to that date - data persists
- [ ] Notes field displays historical notes
- [ ] Completed checkboxes show correct state
- [ ] Reps and weight fields show logged values
- [ ] Navigate between dates smoothly without errors

## Future Enhancements

1. **Caching**: Cache loaded historical logs to reduce database queries
2. **Optimistic Updates**: Show loading state while fetching historical data
3. **Edit Historical Data**: Allow users to edit past workout logs
4. **Date Range Loading**: Preload logs for date ranges for faster navigation
