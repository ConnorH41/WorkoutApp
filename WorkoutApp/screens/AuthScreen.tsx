import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Linking, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'OAuth error');
    }
  };

  return (
    <LinearGradient
      colors={['#FAF3F0', '#F5E6E8', '#E8F4F8']}
      style={localStyles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={localStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={localStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Spacer */}
          <View style={{ flex: 1, minHeight: 60 }} />

          {/* Logo/App Icon Area */}
          <View style={localStyles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={localStyles.logoImage}
              resizeMode="contain"
            />
            <Text style={localStyles.appName}>SimpleSplit</Text>
          </View>

          {/* Main Form Container */}
          <View style={localStyles.formContainer}>
            <TextInput
              placeholder="Username, email or mobile number"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={localStyles.input}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              style={localStyles.input}
            />

            {error ? (
              <Text style={localStyles.error}>{error}</Text>
            ) : null}

            <TouchableOpacity
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
              style={[
                localStyles.primaryButton,
                loading && localStyles.primaryButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <Text style={localStyles.primaryButtonText}>
                {loading ? 'Please wait...' : (isSignUp ? 'Sign up' : 'Log in')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={localStyles.forgotPassword}
              activeOpacity={0.7}
            >
              <Text style={localStyles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Divider with OR */}
          <View style={localStyles.dividerContainer}>
            <View style={localStyles.dividerLine} />
            <Text style={localStyles.dividerText}>OR</Text>
            <View style={localStyles.dividerLine} />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            style={localStyles.secondaryButton}
            activeOpacity={0.8}
          >
            <Text style={localStyles.secondaryButtonText}>Create an Account</Text>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const localStyles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DBDBDB',
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 18,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});

 
