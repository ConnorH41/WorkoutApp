import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import styles from '../styles/authStyles';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '../styles/theme';

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

  const handleOAuthSignIn = async (provider: 'google') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // For native apps Supabase returns a URL to open in the system browser.
      // If present, open it; otherwise the client may already redirect.
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'OAuth error');
    }
  };

  return (
    <View style={[styles.container, { padding: 20 }]}> 
      <View style={{ width: '100%', maxWidth: 420 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 18, textAlign: 'center' }}>Login or Sign Up</Text>
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

          <TouchableOpacity onPress={handleSignIn} disabled={loading} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignUp} disabled={loading} style={{ borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{loading ? 'Working...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={{ height: 16 }} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#666', marginBottom: 12 }}>or</Text>

            <View style={{ width: '100%' }}>
              <TouchableOpacity
                onPress={() => handleOAuthSignIn('google')}
                disabled={loading}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, width: '100%', justifyContent: 'center' }}
              >
                <FontAwesome name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
                <Text style={{ fontWeight: '600' }}>Continue With Google</Text>
              </TouchableOpacity>

              {/* Apple sign-in removed */}
            </View>
            
          </View>
        </View>
      </View>
    </View>
  );
}

 
