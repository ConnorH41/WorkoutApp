import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainNavigator from './MainNavigator';
import { ThemeProvider } from './lib/ThemeContext';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import styles from './styles/appStyles';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) setUser(session.user);
      if (mounted) setLoading(false);
    };
    init();

    // Subscribe to auth changes so sign-out updates UI immediately
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      try {
        // Supabase JS may return different shapes for subscription; handle both
        // { subscription } where subscription has .unsubscribe(), or an object with .unsubscribe
        if (subscription && typeof (subscription as any).unsubscribe === 'function') {
          (subscription as any).unsubscribe();
        } else if ((subscription as any)?.subscription && typeof (subscription as any).subscription.unsubscribe === 'function') {
          (subscription as any).subscription.unsubscribe();
        }
      } catch {}
    };
  }, []);

  const handleAuthSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Main app UI goes here
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <MainNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

 