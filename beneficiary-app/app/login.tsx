import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api, setAuthToken } from '../api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useResponsive } from '../hooks/useResponsive';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isMobile, isDesktop, contentMaxWidth, screenPadding, scale } = useResponsive();

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your registered phone number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/beneficiary/login', { phone });
      setAuthToken(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Could not verify your phone number.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: screenPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.innerContainer, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.header, { marginBottom: isMobile ? 36 : 50 }]}>
            <FontAwesome name="leaf" size={isMobile ? 48 : 60} color="#10b981" />
            <Text style={[styles.title, { fontSize: isMobile ? 28 : 36 * scale }]}>
              Aahar AI
            </Text>
            <Text style={[styles.subtitle, { fontSize: isMobile ? 15 : 18 }]}>
              Beneficiary Access
            </Text>
          </View>

          <View style={[styles.form, { padding: isMobile ? 20 : 28 }]}>
            <Text style={styles.label}>Registered Phone Number</Text>
            <TextInput
              style={[styles.input, { padding: isMobile ? 12 : 15, fontSize: isMobile ? 15 : 16 }]}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 9810000100"
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity 
              style={[styles.loginBtn, { padding: isMobile ? 14 : 16 }]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.loginBtnText, { fontSize: isMobile ? 16 : 18 }]}>
                {loading ? 'Verifying...' : 'Login securely'}
              </Text>
            </TouchableOpacity>
          </View>

          {isDesktop && (
            <Text style={styles.footerText}>
              Aahar AI — Smart Public Distribution System
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#111827', marginTop: 10 },
  subtitle: { color: '#6b7280', marginTop: 2 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 20,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  loginBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
  },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 30,
  },
});
