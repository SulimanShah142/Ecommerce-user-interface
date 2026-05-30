import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, StyleSheet, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';


const API_URL = "http://192.168.1.3:8787";

export default function OTPLogin() {
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();
  

  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isStepTwo, setIsStepTwo] = useState(false);

  // 🎯 LEGAL COMPLIANCE STATE ENGINE
  const [isChecked, setIsChecked] = useState(false);

  // URL LINK POOLS FROM GOOGLE SITES
 const PRIVACY_URL = "https://sites.google.com/view/brand-gallery-1/privacy-policy";
  const TERMS_URL = "https://sites.google.com/view/temrs-of-service/terms-of-service";




  const handleOpenLink = async (targetUrl: string) => {
    try {
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch (e) {
      Alert.alert("Error", "Could not render legal documents web view framework.");
    }
  };
 // 🎯 STAGE 1: TRIGGER SECURE VERIFICATION REQUEST DISPATCH VIA BACKEND
   // Inside app/(auth)/otp-login.tsx -> handleSendOTP function payload
  // Inside app/(auth)/otp-login.tsx -> handleSendOTP function payload
  const handleSendOTP = async () => {
    if (!isChecked) {
      return Alert.alert(t("error") || "Agreement Required", "You must accept the Terms of Service and Privacy Policy.");
    }
    if (!phone.trim()) {
      return Alert.alert(t("error") || "Error", locale === 'en' ? "Please enter your identifier" : "لطفاً معلومات خود را وارد کنید");
    }
    
    setLoading(true);
    try {
      const cleanPhoneDigits = phone.replace(/\s/g, ''); // Holds clean digits like: "0745772237"
      const phoneIdentifier = `${cleanPhoneDigits}@phone.local`;
      
      console.log("📡 Requesting custom auth token code parameters for phone channel:", cleanPhoneDigits);

      const res = await fetch(`${API_URL}/api/auth/email-otp/send-verification-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 🎯 THE PUSH ALIGNMENT FIX: 
          // Pass the raw digits string directly inside the tracking header!
          // This tells the backend fallback matrix exactly how to route to your hardware if needed.
          'x-onesignal-id': cleanPhoneDigits 
        },
        body: JSON.stringify({ phone: cleanPhoneDigits }) // Sends clean raw phone digits
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsStepTwo(true);
        Alert.alert(
          "Code Sent", 
          locale === 'en' ? "A verification token has been routed via system channels." : "کد تایید ارسال گردید."
        );
      } else {
        Alert.alert(t("error") || "Failed", data.error || "Could not dispatch access tokens.");
      }
    } catch (err: any) {
      Alert.alert(t("error") || "Failed", "Network execution failed.");
    } finally {
      setLoading(false);
    }
  };

  // Inside app/(auth)/otp-login.tsx -> Core Component Parameters Boundary Layer
  

  // STEP 2: VERIFY SUBMITTED CRYPTO TOKEN AND DEPOSIT INDICES SESSIONS
   // Inside app/(auth)/otp-login.tsx -> handleVerifyOTP function core payload
  const handleVerifyOTP = async () => {
    if (!code.trim()) return Alert.alert(t("error") || "Error", "Enter verification code");
    
    setLoading(true);
    try {
      const phoneIdentifier = `${phone.replace(/\s/g, '')}@phone.local`;
      
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: phoneIdentifier, otp: code.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success && data.session?.token) {
        console.log("✅ Custom OTP signature cleared. Storing unified session tokens...");
        
        // 🎯 THE STABLE DEVICE REGISTRY POOL: Matches your email layout identifier token key string exactly!
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync('custom_user_session_token', data.session.token.trim());
        await SecureStore.setItemAsync('cached_user_profile', JSON.stringify(data.session.user)).catch(() => {});

        setTimeout(() => {
          router.replace('/');
        }, 150);
      } else {
        Alert.alert(t("error") || "Rejected", data.error || "Invalid verification code.");
      }
    } catch (err) {
      Alert.alert(t("error") || "Error", "Handshake processing drop out.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
       style={{ flex: 1, backgroundColor: '#FFFFFF' }}
       behavior={Platform.OS === "ios" ? "padding" : "height"}
       keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
     >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

            {/* 🎯 THE COMPLIANT CHECKBOX ROW ELEMENT STRIP LAYOUT */}
                       {/* 🎯 THE ACCURATE LEGAL COMPLIANCE ELEMENT LABELS STRUCTURE */}
            <View style={[styles.checkboxContainer, isRTL && { flexDirection: "row-reverse" }]}>
              <TouchableOpacity 
                style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]} 
                activeOpacity={0.8}
                onPress={() => setIsChecked(!isChecked)}
              >
                {isChecked && <Ionicons name="checkmark-sharp" size={11} color="#FFFFFF" />}
              </TouchableOpacity>
              
              <View style={[styles.legalTextWrapper, isRTL ? { paddingRight: 12, paddingLeft: 0 } : { paddingLeft: 12 }]}>
                {/* 🎯 THE TOUCH-ISOLATION FIX: Splitting text triggers outside raw text blocks using multi-line paragraph wrappers */}
                <Text style={[styles.legalBaseText, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
                  {locale === "en" ? "I explicitly accept and agree to the " : "من شرایط را می‌پذیرم و با "}
                  
                  {/* TERMS LINK BUTTON */}
                  <Text 
                    suppressHighlighting={true}
                    style={styles.legalLinkUnderline} 
                    onPress={() => {
                      console.log("🔗 Opening Terms View:", TERMS_URL);
                      handleOpenLink(TERMS_URL);
                    }}
                  >
                    {locale === "en" ? "Terms of Service" : "شرایط خدمات"}
                  </Text>

                  {locale === "en" ? " and " : " و "}
                  
                  {/* PRIVACY LINK BUTTON */}
                  <Text 
                    suppressHighlighting={true}
                    style={styles.legalLinkUnderline} 
                    onPress={() => {
                      console.log("🔗 Opening Privacy View:", PRIVACY_URL);
                      handleOpenLink(PRIVACY_URL);
                    }}
                  >
                    {locale === "en" ? "Privacy Policy" : "خط مشی رازداری"}
                  </Text>

                  {locale === "en" ? "." : " موافقت می‌کنم."}
                </Text>
              </View>
            </View>


            {/* ACCESS BUTTON */}
          {/* OTP CODE INPUT */}
{isStepTwo && (
  <View style={styles.inputWrapper}>
    <Text
      style={[
        styles.label,
        isRTL && { textAlign: 'right' }
      ]}
    >
      {locale === 'en'
        ? "VERIFICATION CODE"
        : "کد تایید"}
    </Text>

    <TextInput
      placeholder="123456"
      placeholderTextColor="#BBBBBB"
      value={code}
      onChangeText={setCode}
      style={[
        styles.input,
        isRTL && {
          textAlign: 'right'
        }
      ]}
      keyboardType="number-pad"
      maxLength={6}
    />
  </View>
)}

{/* PRIMARY ACTION BUTTON */}
<TouchableOpacity
  style={[
    styles.primaryBtn,
    (!isChecked || loading) &&
      styles.disabledBtnState
  ]}
  onPress={
    isStepTwo
      ? handleVerifyOTP
      : handleSendOTP
  }
  disabled={loading || !isChecked}
  activeOpacity={0.8}
>
  {loading ? (
    <ActivityIndicator
      color="#FFFFFF"
      size="small"
    />
  ) : (
    <Text style={styles.primaryBtnText}>
      {isStepTwo
        ? (
            locale === 'en'
              ? "VERIFY CODE"
              : "تایید کد"
          )
        : (
            locale === 'en'
              ? "SEND VERIFICATION CODE"
              : "ارسال کد تایید"
          )}
    </Text>
  )}
</TouchableOpacity>
            {/* THE RE-LINK FIX: DYNAMICALLY ORIENTED LINK TO GO BACK TO PRIMARY SIGN-IN */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 35, 
    paddingVertical: 40,
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
    marginBottom: 20
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

  // 🎯 MINIMALIST LEGAL ELEMENTS DESIGN
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 10,
    marginBottom: 25,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: '#000000',
  },
  legalTextWrapper: {
    flex: 1,
    paddingLeft: 10,
  },
  legalBaseText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 16,
    fontWeight: '500'
  },
  legalLinkUnderline: {
    color: '#000000',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },

  primaryBtn: { 
    backgroundColor: '#000000', 
    paddingVertical: 16, 
    alignItems: 'center',
    borderRadius: 2,
    marginTop: 10
  },
  disabledBtnState: {
    backgroundColor: '#EAEAEA',
    opacity: 0.6
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
