import { create } from 'zustand';

export type Profile = {
  id: string;
  email: string;
  // Add more fields as needed from your Supabase 'profiles' table
};

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
