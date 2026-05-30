import React, { useState } from "react"; 
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  KeyboardAvoidingView, 
  Alert, 
  Platform 
} from "react-native";
import { authClient } from "../../lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

const API_URL = "http://192.168.1.3:8787";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 🎯 LEGAL COMPLIANCE STATE ENGINE
  const [isChecked, setIsChecked] = useState(false);
  
  const { t, isRTL, locale } = useLanguage();
  const router = useRouter();

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
  // Inside app/(auth)/sign-in.tsx -> handleLogin function
  // Inside app/(auth)/sign-in.tsx -> handleLogin function core payload
  const handleLogin = async () => {
  if (!isChecked) {
    return Alert.alert(
      t("error") || "Agreement Required",
      locale === "en"
        ? "Accept the Terms and Privacy Policy to access your account."
        : "لطفاً ابتدا شرایط خدمات را تایید کنید."
    );
  }

  if (!email.trim() || !password.trim()) {
    return Alert.alert(
      t("error") || "Missing Fields",
      locale === "en"
        ? "Please enter email and password."
        : "ایمیل و رمز عبور را وارد کنید."
    );
  }

  setLoading(true);

  try {

    console.log("🔐 Dispatching secure lightweight login request...");

    const response = await fetch(
      `${API_URL}/api/auth/sign-in/direct`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      }
    );

    const data = await response.json();

    if (
      response.ok &&
      data.success &&
      data.session?.token
    ) {

      console.log("✅ Login successful");

      const SecureStore = require("expo-secure-store");

      await SecureStore.setItemAsync(
        "custom_user_session_token",
        data.session.token.trim()
      );

      await SecureStore.setItemAsync(
        "cached_user_profile",
        JSON.stringify(data.session.user)
      ).catch(() => {});

      router.replace("/");

    } else {

      Alert.alert(
        t("error") || "Authentication Failed",
        data?.error ||
          "Invalid email or password."
      );
    }

  } catch (error: any) {

    console.error(
      "❌ Sign-in crash:",
      error
    );

    Alert.alert(
      t("error") || "Error",
      "Network request failed."
    );

  } finally {

    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 30}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerView}>

          {/* HEADER */}
          <View style={[styles.header, isRTL ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
            <Text style={[styles.brandTitle, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
              Brand Gallery
            </Text>
            <Text style={[styles.welcomeText, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
              {(t("welcomeBack") || "WELCOME BACK").toUpperCase()}
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            
            {/* EMAIL */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
                {(t("email") || "EMAIL ADDRESS").toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: "right", direction: "rtl" } : { textAlign: "left", direction: "ltr" }]}
                placeholder={t("enterEmailPlaceholder") || "ENTER YOUR EMAIL"}
                placeholderTextColor="#BBB"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* PASSWORD */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
                {(t("password") || "PASSWORD").toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: "right", direction: "rtl" } : { textAlign: "left", direction: "ltr" }]}
                placeholder={t("passwordPlaceholder") || "ENTER YOUR PASSWORD"}
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
              />

              <Link href="/otp-login" asChild>
                <TouchableOpacity
                  style={[styles.forgotBtn, isRTL ? { alignSelf: "flex-start" } : { alignSelf: "flex-end" }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>
                    {t("forgotPassword") || "Forgot Password?"}
                  </Text>
                </TouchableOpacity>
              </Link>
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

            {/* SIGN IN BUTTON */}
            {/* 🎯 DISABLED MATRICES STATE TRIGGER: Blends styling dynamically based on checkbox weight */}
            <TouchableOpacity
              style={[
                styles.signInBtn,
                (!isChecked || loading) && styles.disabledSignInBtnState
              ]}
              onPress={handleLogin}
              disabled={loading || !isChecked}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signInBtnText}>
                  {(t("signIn") || "SIGN IN").toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={styles.footerText}>
              {t("newToBrandGallery")}
            </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.signUpLink, isRTL ? { marginRight: 4, marginLeft: 0 } : { marginLeft: 4 }]}>
                  {t("registerNow")}
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
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 60,
  },
  innerView: {
    width: "100%",
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
  form: {
    width: '100%'
  },
  inputWrapper: {
    marginBottom: 20,
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
  
  // 🎯 HIGH-END MINIMALIST LEGAL COMPLIANCE ELEMENT LABELS STYLE DESIGN
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
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
    fontWeight: '800',textDecorationLine: 'underline'},
    signInBtn: {backgroundColor: '#000000',paddingVertical: 16,alignItems: 'center',borderRadius: 2},disabledSignInBtnState: {backgroundColor: '#EAEAEA',opacity: 0.6},signInBtnText: {color: '#FFFFFF',fontWeight: '900',letterSpacing: 2,fontSize: 12},footer: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center',marginTop: 40},footerText: {fontSize: 12,color: '#999999',fontWeight: '500'},signUpLink: {fontSize: 12,fontWeight: '900',color: '#000000',textDecorationLine: 'underline'}});