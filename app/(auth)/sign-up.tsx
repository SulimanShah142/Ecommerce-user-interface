import { useState } from "react";
import { View, ScrollView, TextInput, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from "react-native";
import { authClient } from "../../lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); 
  const [loading, setLoading] = useState(false);
  const { t, isRTL, locale } = useLanguage();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim()) {
      return Alert.alert(t("error") || "Error", t("fillAllDetails") || "Please fill all information fields.");
    }
    setLoading(true);
    try {
      const result = await authClient.signUpDirect(
        email.trim().toLowerCase(),
        name.trim(),
        phone ? phone.trim() : ''
      );
      
      if (result.success) {
        console.log("✅ Direct account registered. Routing operator back to dashboard.");
        router.replace('/'); 
      }
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error.message || "Sign-Up registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerView}>
          
          {/* 1. BRANDING HEADER (Dynamic right-to-left layout alignment matching your language context) */}
          <View style={[styles.header, isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
            <Text style={[styles.brandTitle, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>Brand Gallery</Text>
            <Text style={[styles.welcomeText, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
              {(t('createAccount') || 'CREATE ACCOUNT').toUpperCase()}
            </Text>
            <Text style={[styles.subText, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
              {t('signUpSubtitle') || (locale === 'en' ? "Fill in your profile credentials to access the directory store." : "اطلاعات کاربری خود را جهت ساخت حساب وارد نمایید.")}
            </Text>
          </View>

          {/* 2. FORM MODULE */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                {(t('fullName') || 'FULL NAME').toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: 'right', direction: 'rtl' } : { textAlign: 'left', direction: 'ltr' }]}
                placeholder={t('enterNamePlaceholder') || "ENTER YOUR NAME"}
                placeholderTextColor="#BBB"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                {(t('email') || 'EMAIL ADDRESS').toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: 'right', direction: 'rtl' } : { textAlign: 'left', direction: 'ltr' }]}
                placeholder={t('enterEmailPlaceholder') || "ENTER YOUR EMAIL"}
                placeholderTextColor="#BBB"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                {(t('phoneNumber') || 'PHONE NUMBER').toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: 'right', direction: 'rtl' } : { textAlign: 'left', direction: 'ltr' }]}
                placeholder={t('phonePlaceholder') || "ENTER YOUR PHONE NUMBER"}
                placeholderTextColor="#BBB"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
                {(t('password') || 'PASSWORD').toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: 'right', direction: 'rtl' } : { textAlign: 'left', direction: 'ltr' }]}
                placeholder={t('passwordPlaceholder') || "ENTER YOUR PASSWORD"}
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.signUpBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSignUp} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signUpBtnText}>{(t('register') || 'REGISTER').toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 3. FOOTER LINKS MULTI-LANGUAGE FLEX ALIGNMENT */}
          <View style={[styles.footer, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.footerText}>{t('alreadyHaveAccount') || "Already have an account?"} </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.signInLink, isRTL ? { marginRight: 4, marginLeft: 0 } : { marginLeft: 4 }]}>
                  {t('signIn') || "Sign In"}
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40
  },
  innerView: { 
    width: '100%' 
  },
  header: {
    marginBottom: 40,
    width: '100%'
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#000000',
    marginBottom: 8,
    width: '100%'
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#000000',
    width: '100%',
    textTransform: 'uppercase'
  },
  subText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500',
    width: '100%'
  },
  form: {
    width: '100%'
  },
  inputWrapper: {
    marginBottom: 25,
    width: '100%'
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
    marginBottom: 6,
    width: '100%'
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    width: '100%'
  },
  signUpBtn: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 15,
    borderRadius: 2
  },
  signUpBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500'
  },
  signInLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    textDecorationLine: 'underline'
  }
});
