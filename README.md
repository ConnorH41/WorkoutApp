# 🏋️ Workout Split App

A mobile app that helps users **create, organize, and track workout splits**.  
Built with **Expo (React Native)** and **Supabase** for cross-platform fitness tracking.  

---

## 📖 Features

### ✅ Core
- Create custom **workout days** (e.g., "Upper A", "Legs 1") and add exercises.  
- Build splits in two modes:
  - **Weekly Split**: assign days to weekdays.  
  - **Rotation Split**: cycle through days in order with optional rest days.  
- **Today Tab**:
  - Log bodyweight.  
  - View and complete today’s workout.  
  - Mark workout as complete or rest.  
- Workout logging: sets, reps, weight, notes.  
- Save and track workout history.  

### 📊 Tracking
- Bodyweight logging & trends.  
- Personal records & achievements.  
- Workout history viewer.  
- Statistical insights (volume, streaks, PR graphs).  

### 🌐 Social & Extras (Future)
- Add friends & share splits.  
- Upload pictures/videos.  
- Discover nearby gyms.  
- Content creator programs (e.g., Jeff Nippard splits).  

---

## 🛠️ Tech Stack

**Frontend**
- Expo (React Native + TypeScript)  
- React Navigation (tab/stack navigation)  
- TanStack Query / Zustand (state management)  
- NativeWind (Tailwind for RN UI styling)  

**Backend**
- Supabase (Postgres, Auth, Storage, Edge Functions)  

**Other**
- Expo Notifications (reminders, PR alerts)  
- Stripe (optional, for premium content)  
- Jest (testing)  

---

## 🗺️ Project Roadmap

### Phase 1 — Foundations
**Set up Repo & Environment**
- Create a GitHub repo.  
- Initialize Expo project (expo init with TypeScript template).  
- Configure ESLint + Prettier.  
- Install dependencies:  
  - `@react-navigation/*` (tab + stack navigation).  
  - `@tanstack/react-query` or `zustand`.  
  - `supabase-js`.  

**Set Up Supabase Backend**
- Create Supabase project.  
- Define tables:  
  - `profiles` (user info)  
  - `days` (workout day templates)  
  - `splits` (week or rotation)  
  - `workouts` (logged sessions)  
  - `exercises` (per workout day)  
  - `logs` (sets/reps/weights per exercise)  
  - `bodyweight` (daily log).  
- Enable Row Level Security (RLS).  
- Write policies so users only access their own data.  

**Authentication**
- Add Supabase Auth (email/password login + signup).  
- On login, fetch profile and store in global state.  
- Set up auto-login (check stored Supabase session on app start).  

✅ At this point: You can log in, log out, and have your account tied to Supabase.  

---

### Phase 2 — Core Functionality
**Today Tab (Workout Execution)**
- Layout: Bodyweight log at top → Today’s exercises → Complete/Rest button.  
- Fetch today’s scheduled workout from DB.  
- Start workout flow → record sets, reps, weights, notes.  
- Save workout session → write to `workouts` + `logs`.  

**Days Tab (Workout Day Builder)**
- CRUD UI for days (Upper A, Legs 1, etc.).  
- Add exercises with sets/reps goals.  
- Store in `days` + `exercises`.  

**Splits Tab (Schedule Builder)**
- Two modes:  
  - Week split: drag days onto week slots (Mon → Legs, Tue → Push).  
  - Rotation: drag days in order, add rest days.  
- Save split config to DB.  
- Link split → Today tab shows correct workout.  

✅ At this point: A user can create days, build a split, and log workouts.  

---

### Phase 3 — Rescheduling & Flexibility
**Reschedule Workouts**
- Week split: if user misses a day → show Week Builder popup to rebuild week.  
- Rotation: option to Mark as Rest (move workout to tomorrow).  

**Bodyweight Logging**
- Add quick-entry form at top of Today tab.  
- Save to `bodyweight` table.  

✅ At this point: The app adapts when users miss workouts.  

---

### Phase 4 — Tracking & Insights
**History Tab**
- List of past workouts.  
- Tap → expand into details (sets, notes, PRs).  

**Stats Tab**
- Charts: bodyweight trend, PR progression, workout streak calendar.  
- Use `react-native-svg` or `victory-native` for graphs.  

✅ At this point: Users can see meaningful progress.  

---

### Phase 5 — Polishing
**UI/UX Improvements**
- Add dark/light mode.  
- Smooth animations (Reanimated, Framer Motion for RN).  
- Onboarding flow (create first split/day on signup).  

**Notifications**
- Daily reminder for Today’s workout.  
- PR celebration push.  

**Social Features (Optional)**
- Friends system.  
- Share splits.  
- Leaderboards or achievements.  
