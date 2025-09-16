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
- **Rescheduling logic**:
  - Weekly Split → rebuild remaining week with Week Builder.  
  - Rotation Split → mark day as rest (move workout to tomorrow).  
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
