import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { supabase } from './lib/supabase';
import { useProfileStore } from './lib/profileStore';
import AuthScreen from './screens/AuthScreen';

async function fetchAndStoreProfile(userId: string, setProfile: (profile: any) => void) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (data && !error) {
    setProfile(data);
  } else {
    // fallback to minimal profile if not found
    setProfile({ id: userId, email: '' });
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchAndStoreProfile(session.user.id ?? '', setProfile);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleAuthSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchAndStoreProfile(user.id ?? '', setProfile);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Main app UI goes here
  return (
    <View style={styles.container}>
      {/* Replace with your main app navigation/components */}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
