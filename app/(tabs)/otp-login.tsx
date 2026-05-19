import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { authClient } from '../../lib/auth-client';
import { useRouter } from 'expo-router';
import { OneSignal } from 'react-native-onesignal';

export default function OTPLogin() {
  const router = useRouter();
  const [phone, setphone] = useState(''); // Using email for Better Auth OTP plugin
  const [code, setCode] = useState('');
  const [isStepTwo, setIsStepTwo] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 1: Request the OTP
 // Step 1: Send the OTP
// Inside handleSendOTP


const handleSendOTP = async () => {
  if (!phone.trim()) return Alert.alert("Error", "Enter phone number");
  
  setLoading(true);
  try {
    const subscriptionId = OneSignal.User.pushSubscription.getPushSubscriptionId();
    if (!subscriptionId) return Alert.alert("Error", "Push ID not found. Check permissions.");

    // Transform phone to fake email format for Better Auth Plugin
    const phoneIdentifier = `${phone.replace(/\s/g, '')}@phone.local`;

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: phoneIdentifier,
      type: "sign-in",
      fetchOptions: {
        headers: {
          "x-onesignal-id": subscriptionId // Header for the server to grab
        }
      }
    });

    if (!error) setIsStepTwo(true);
    else Alert.alert("Error", error.message);
  } finally {
    setLoading(false);
  }
};
const handleVerifyOTP = async () => {
  const phoneIdentifier = `${phone.replace(/\s/g, '')}@phone.local`;
  setLoading(true);

  try {
    const { data, error } = await authClient.signIn.emailOtp({
      email: phoneIdentifier,
      otp: code,
    });

    if (error) {
      Alert.alert("Failed", error.message);
    } else {
      console.log("✅ Session stored successfully");
      
      // Force a re-fetch of the session to ensure storage is synced
      await authClient.getSession(); 
      
      // Small delay to let the Auth Guard in _layout.tsx catch up
      setTimeout(() => {
        router.replace('./index');
      }, 100);
    }
  } catch (e) {
    Alert.alert("Error", "Could not verify session.");
  } finally {
    setLoading(false);
  }
};


return (
  <View style={styles.container}>
    {/* BRANDING */}
    <View style={styles.header}>
      <Text style={styles.brandTitle}>SHEIN</Text>
      <Text style={styles.welcomeText}>SECURE LOGIN</Text>
      <Text style={styles.subText}>
        {!isStepTwo 
          ? "Enter your phone number to receive a verification code." 
          : `We've sent a 6-digit code to ${phone}`}
      </Text>
    </View>

    {!isStepTwo ? (
      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput 
            placeholder="+93 7XX XXX XXX" 
            placeholderTextColor="#BBB"
            value={phone} 
            onChangeText={setphone} 
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>SEND CODE</Text>}
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>VERIFICATION CODE</Text>
          <TextInput 
            placeholder="000000" 
            placeholderTextColor="#EEE"
            value={code} 
            onChangeText={setCode} 
            keyboardType="number-pad" 
            maxLength={6}
            style={[styles.input, styles.codeInput]}
          />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOTP} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>VERIFY & SIGN IN</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setIsStepTwo(false)} style={styles.backLink}>
          <Text style={styles.backLinkText}>EDIT PHONE NUMBER</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 30, 
    justifyContent: 'center' 
  },
  header: {
    marginBottom: 40,
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#000',
    marginBottom: 10
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#000'
  },
  subText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18
  },
  form: { width: '100%' },
  inputWrapper: {
    marginBottom: 30
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  input: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE', 
    paddingVertical: 12, 
    fontSize: 16, 
    color: '#000'
  },
  codeInput: { 
    textAlign: 'center', 
    fontSize: 28, 
    letterSpacing: 15, // Large spacing for code blocks
    fontWeight: '700',
    borderBottomColor: '#000' // Darker border for the active code field
  },
  primaryBtn: { 
    backgroundColor: '#000', 
    paddingVertical: 18, 
    alignItems: 'center',
    // Square edges
  },
  primaryBtnText: { 
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 14, 
    letterSpacing: 2 
  },
  backLink: { 
    marginTop: 25, 
    alignItems: 'center' 
  },
  backLinkText: { 
    color: '#999', 
    fontSize: 11, 
    fontWeight: '800',
    letterSpacing: 1,
    textDecorationLine: 'underline' 
  }
});
