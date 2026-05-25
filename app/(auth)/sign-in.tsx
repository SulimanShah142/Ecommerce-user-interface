import { useState } from "react"; 
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Alert, Platform} from "react-native";
import { authClient } from "../../lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim()) return Alert.alert(t("error") || "Error", t("enterEmailPlaceholder") || "Please enter your identifier.");
    setLoading(true);
    try {
      const result = await authClient.signInDirect(email.trim().toLowerCase());
      
      if (result.success) {
        console.log("✅ Direct login confirmed. Swapping route parameters instantly.");
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error.message || "Sign-In failed.");
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
          
          {/* 1. BRANDING HEADER (Now realigned completely to support bi-directional fonts layout) */}
          <View style={[styles.header, isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
            <Text style={[styles.brandTitle, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>Brand Gallery</Text>
            <Text style={[styles.welcomeText, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}>
              {(t('welcomeBack') || 'WELCOME BACK').toUpperCase()}
            </Text>
          </View>

          {/* 2. FORM MODULE */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              {/* 🎯 Label Text aligned dynamically */}
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
              {/* 🎯 Label Text aligned dynamically */}
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
              <Link href="/otp-login" asChild>
                <TouchableOpacity 
                  style={[styles.forgotBtn, isRTL ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>{t('forgotPassword') || "Forgot Password?"}</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <TouchableOpacity 
              style={[styles.signInBtn, loading && { opacity: 0.7 }]} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signInBtnText}>{(t('signIn') || 'SIGN IN').toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 3. FOOTER LINKS MULTI-LANGUAGE FLEX ALIGNMENT */}
          <View style={[styles.footer, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.footerText}>{t('newToBrandGallery')} </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.signUpLink, isRTL ? { marginRight: 4, marginLeft: 0 } : { marginLeft: 4 }]}>
                  {t('registerNow')}
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
    marginBottom: 50,
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
  forgotBtn: {
    marginTop: 10
  },
  forgotText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  signInBtn: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 15,
    borderRadius: 2
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 45
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500'
  },
  signUpLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    textDecorationLine: 'underline'
  }
});
