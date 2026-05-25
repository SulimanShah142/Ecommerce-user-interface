import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';

export default function OTPLogin() {
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎯 HIGH-SPEED DIRECT LOGIN HANDLER (NO OTP CLOUD DELAYS)
  const handleDirectLogin = async () => {
    if (!phone.trim()) {
      return Alert.alert(
        t("error") || "Error", 
        locale === 'en' ? "Please enter your identifier" : "لطفاً معلومات خود را وارد کنید"
      );
    }
    
    setLoading(true);
    try {
      // Formats the identifier cleanly to ensure matching backend indices
      const phoneIdentifier = `${phone.replace(/\s/g, '')}@phone.local`;
      console.log("🛰️ Dispatching custom stateless direct verification:", phoneIdentifier);

      const result = await authClient.signInDirect(phoneIdentifier);
      
      if (result.success) {
        console.log("✅ Custom direct sign-in authorized safely.");
        setTimeout(() => {
          router.replace('/');
        }, 150);
      }
    } catch (err: any) {
      console.error("❌ Sign-in intercept error:", err.message);
      Alert.alert(
        t("error") || "Failed", 
        err.message || "Account validation rejected."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. DYNAMIC ALIGNED TYPOGRAPHY HEADER */}
      <View style={[styles.header, isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        <Text style={styles.brandTitle}>Brand Gallery</Text>
        <Text style={styles.welcomeText}>
          {locale === 'en' ? "SECURE ACCESS GATE" : (locale === 'fa' ? "ورود به حساب کاربری" : "حساب ته ننوتل")}
        </Text>
        <Text style={[styles.subText, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
          {locale === 'en' 
            ? "Enter your verified credential parameters to pass directly into your shop workspace profile."
            : (locale === 'fa' 
              ? "شماره تلفن یا آدرس ایمیل ثبت شده خود را جهت ورود مستقیم وارد نمایید."
              : "خپل تایید شوی معلومات دننه کړئ ترڅو مستقیم حساب ته ننوځئ.")
          }
        </Text>
      </View>

      {/* 2. DIRECT SUBMISSION CONTAINER LAYOUT */}
      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>
            {t('phoneNumber') || (locale === 'en' ? "PHONE / EMAIL" : "شماره تلفن / ایمیل")}
          </Text>
          <TextInput 
            placeholder={t('phonePlaceholder') || "07XXXXXXXX"} 
            placeholderTextColor="#BBBBBB"
            value={phone} 
            onChangeText={setPhone} 
            style={[styles.input, isRTL && { textAlign: 'right' }]}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleDirectLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {locale === 'en' ? "ACCESS PROFILE NOW" : (locale === 'fa' ? "ورود فوری به برنامه" : "اوس ننوتل")}
            </Text>
          )}
        </TouchableOpacity>

        {/* 🎯 THE RE-LINK FIX: DYNAMICALLY ORIENTED LINK TO GO BACK TO PRIMARY SIGN-IN */}
        <TouchableOpacity 
          style={[styles.backLink, isRTL && { flexDirection: 'row-reverse' }]} 
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Ionicons name={isRTL ? "arrow-forward-sharp" : "arrow-back-sharp"} size={14} color="#999999" />
          <Text style={styles.backLinkText}>
            {locale === 'en' ? "RETURN TO SIGN IN PORTAL" : (locale === 'fa' ? "بازگشت به صفحه ورود اصلی" : "اصلي پاڼې ته د بیرته تګ")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎯 HIGH-END MONOCHROME STUDIO VISUAL STYLESHEET
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 35, 
    justifyContent: 'center' 
  },
  header: {
    width: '100%',
    marginBottom: 35
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#000000',
    marginBottom: 6
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  subText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500'
  },
  form: { 
    width: '100%' 
  },
  inputWrapper: {
    marginBottom: 25
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
    marginBottom: 6
  },
  input: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#EFEFEF', 
    paddingVertical: 10, 
    fontSize: 15, 
    color: '#000000',
    fontWeight: '600'
  },
  primaryBtn: { 
    backgroundColor: '#000000', 
    paddingVertical: 16, 
    alignItems: 'center',
    borderRadius: 2,
    marginTop: 10
  },
  primaryBtnText: { 
    color: '#FFFFFF', 
    fontWeight: '900', 
    fontSize: 13, 
    letterSpacing: 1.5 
  },
  backLink: { 
    marginTop: 24, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  backLinkText: { 
    color: '#999999', 
    fontSize: 10, 
    fontWeight: '800',
    letterSpacing: 1,
    textDecorationLine: 'underline' 
  }
});
