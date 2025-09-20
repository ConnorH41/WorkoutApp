import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import styles from '../styles/authStyles';

export default function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else onAuthSuccess();
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else onAuthSuccess();
  };

  return (
    <View style={[styles.container, { padding: 20 }]}> 
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Welcome</Text>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>Sign in or create an account to continue</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { marginBottom: 12 }]}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
          secureTextEntry
          style={[styles.input, { marginBottom: 8 }]}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleSignIn} disabled={loading} style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignUp} disabled={loading} style={{ borderWidth: 1, borderColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: '#007AFF', fontWeight: '700' }}>{loading ? 'Working...' : 'Create Account'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

 
