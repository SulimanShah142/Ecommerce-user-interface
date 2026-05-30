import React, { useState } from "react";
import { 
  View, 
  ScrollView, 
  TextInput, 
  StyleSheet, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
const API_URL = "http://192.168.1.3:8787";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); 
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

  // Inside app/(auth)/sign-up.tsx -> handleSignUp function core payload
const handleSignUp = async () => {
  if (!isChecked) {
    return Alert.alert(
      t("error") || "Agreement Required",
      "Accept the Terms and Privacy Policy to register."
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanPassword = password.trim();

  // BASIC MVP VALIDATION
  if (!cleanName || !cleanEmail || !cleanPassword) {
    return Alert.alert(
      t("error") || "Error",
      "Please fill all required fields."
    );
  }

  // LIGHT EMAIL VALIDATION
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleanEmail)) {
    return Alert.alert(
      t("error") || "Invalid Email",
      "Please enter a valid email address."
    );
  }

  // SIMPLE PASSWORD SECURITY
  if (cleanPassword.length < 6) {
    return Alert.alert(
      t("error") || "Weak Password",
      "Password must be at least 6 characters."
    );
  }

  setLoading(true);

  try {
    console.log("🚀 Creating secure account...");

    const response = await fetch(
      `${API_URL}/api/auth/sign-up/direct`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          password: cleanPassword,
          phone: cleanPhone || null,
        }),
      }
    );

    const data = await response.json();

    if (
      response.ok &&
      data.success &&
      data.session?.token
    ) {
      console.log("✅ Registration complete");

      const SecureStore = require("expo-secure-store");

      // STORE TOKEN
      await SecureStore.setItemAsync(
        "custom_user_session_token",
        data.session.token
      );

      // STORE USER
      await SecureStore.setItemAsync(
        "cached_user_profile",
        JSON.stringify(data.session.user)
      ).catch(() => {});

      router.replace("/");

    } else {
      Alert.alert(
        t("error") || "Registration Failed",
        data?.error || "Could not create account."
      );
    }

  } catch (error: any) {
    console.error(
      "❌ Registration error:",
      error
    );

    Alert.alert(
      t("error") || "Network Error",
      "Could not connect to server."
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
              {(t("createAccount") || "CREATE ACCOUNT").toUpperCase()}
            </Text>
            <Text style={[styles.subText, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
              {t("signUpSubtitle") ||
                (locale === "en"
                  ? "Fill in your profile credentials to access the directory store."
                  : "اطلاعات کاربری خود را جهت ساخت حساب وارد نمایید.")}
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>

            {/* NAME */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
                {(t("fullName") || "FULL NAME").toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: "right", direction: "rtl" } : { textAlign: "left", direction: "ltr" }]}
                placeholder={t("enterNamePlaceholder") || "ENTER YOUR NAME"}
                placeholderTextColor="#BBB"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>

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

            {/* PHONE */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL ? { textAlign: "right" } : { textAlign: "left" }]}>
                {(t("phoneNumber") || "PHONE NUMBER").toUpperCase()}
              </Text>
              <TextInput
                style={[styles.input, isRTL ? { textAlign: "right", direction: "rtl" } : { textAlign: "left", direction: "ltr" }]}
                placeholder={t("phonePlaceholder") || "ENTER YOUR PHONE NUMBER"}
                placeholderTextColor="#BBB"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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


            {/* REGISTER BUTTON */}
            {/* 🎯 DISABLED MATRICES STATE TRIGGER */}
            <TouchableOpacity
              style={[
                styles.signUpBtn,
                (!isChecked || loading) && styles.disabledSignUpBtnState
              ]}
              onPress={handleSignUp}
              disabled={loading || !isChecked}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signUpBtnText}>
                  {(t("register") || "REGISTER").toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>

          </View>

          {/* FOOTER */}
          <View style={[styles.footer, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={styles.footerText}>
              {t("alreadyHaveAccount") || "Already have an account?"}
            </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.signInLink, isRTL ? { marginRight: 4, marginLeft: 0 } : { marginLeft: 4 }]}>
                  {t("signIn") || "Sign In"}
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
 letterSpacing: 4,color: '#000000',marginBottom: 8,width: '100%'},welcomeText: {fontSize: 12,fontWeight: '800',letterSpacing: 1.5,color: '#000000',width: '100%',textTransform: 'uppercase'},subText: {fontSize: 12,color: '#888888',marginTop: 8,lineHeight: 18,fontWeight: '500',width: '100%'},form: {width: '100%'},inputWrapper: {marginBottom: 20,width: '100%'},label: {fontSize: 9,fontWeight: '900',color: '#000000',letterSpacing: 1.2,marginBottom: 6,width: '100%'},input: {borderBottomWidth: 1,borderBottomColor: '#EEEEEE',paddingVertical: 10,fontSize: 14,color: '#000000',fontWeight: '600',width: '100%'},// 🎯 LEGAL COMPLIANCE ELEMENT LABELS STYLE DESIGN
 checkboxContainer: {flexDirection: 'row',alignItems: 'flex-start',width: '100%',marginTop: 15,marginBottom: 20,},checkboxBox: {width: 18,height: 18,borderWidth: 1.5,borderColor: '#000000',borderRadius: 2,justifyContent: 'center',alignItems: 'center',marginTop: 1,},checkboxBoxChecked: {backgroundColor: '#000000',},legalTextWrapper: {flex: 1,paddingLeft: 10,},legalBaseText: {fontSize: 11,color: '#666666',lineHeight: 16,fontWeight: '500'},legalLinkUnderline: {color: '#000000',fontWeight: '800',textDecorationLine: 'underline'},signUpBtn: {backgroundColor: '#000000',paddingVertical: 16,alignItems: 'center',borderRadius: 2},disabledSignUpBtnState: {backgroundColor: '#EAEAEA',opacity: 0.6},signUpBtnText: {color: '#FFFFFF',fontWeight: '900',letterSpacing: 2,fontSize: 12},footer: {flexDirection: 'row',justifyContent: 'center',alignItems: 'center',marginTop: 35},footerText: {fontSize: 12,color: '#999999',fontWeight: '500'},signInLink: {fontSize: 12,fontWeight: '900',color: '#000000',textDecorationLine: 'underline'}});