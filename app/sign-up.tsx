import { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, ActivityIndicator , TouchableOpacity} from "react-native";
import { authClient } from "../lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";

// CRITICAL: Ensure 'export default' is here
export default function SignUp() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState(""); // NEW STATE
    const [loading, setLoading] = useState(false);
  const { t, isRTL } = useLanguage();
  const router = useRouter()
   const handleSignUp = async () => {
    setLoading(true);
    try {
        const { data, error } = await authClient.signUp.email({
            email: email.toLowerCase().trim(),
            password,
            name,
            phoneNumber: phone, // This matches user.additionalFields in server/auth.ts
            callbackURL: "/",
        });

        if (error) {
            alert(error.message);
        } else {
            console.log("Success!");
            router.replace("/");
        }
    } catch (e) {
        console.error("Connection error:", e);
        alert("Cannot reach server. Check Wi-Fi.");
    } finally {
        setLoading(false);
    }
};


return (
  <View style={styles.container}>
      {/* 1. BRANDING HEADER */}
      <View style={[styles.header, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={styles.brandTitle}>Brand Gallery</Text>
          <Text style={styles.welcomeText}>{t('createAccount')}</Text>
          <Text style={[styles.subText, isRTL && { textAlign: 'right' }]}>{t('signUpSubtitle')}</Text>
      </View>

      {/* 2. FORM */}
      <View style={styles.form}>
          <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('fullName')}</Text>
              <TextInput
                  style={[styles.input, isRTL && { textAlign: 'right' }]}
                  placeholder={t('enterNamePlaceholder')}
                  placeholderTextColor="#BBB"
                  value={name}
                  onChangeText={setName}
              />
          </View>

          <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('email')}</Text>
              <TextInput
                  style={[styles.input, isRTL && { textAlign: 'right' }]}
                  placeholder={t('enterEmailPlaceholder')}
                  placeholderTextColor="#BBB"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
              />
          </View>

          <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('phoneNumber')}</Text>
              <TextInput
                  style={[styles.input, isRTL && { textAlign: 'right' }]}
                  placeholder={t('phonePlaceholder')}
                  placeholderTextColor="#BBB"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
              />
          </View>

          <View style={styles.inputWrapper}>
              <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('password')}</Text>
              <TextInput
                  style={[styles.input, isRTL && { textAlign: 'right' }]}
                  placeholder={t('passwordPlaceholder')}
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
          >
              {loading ? (
                  <ActivityIndicator color="#FFF" />
              ) : (
                  <Text style={styles.signUpBtnText}>{t('register')}</Text>
              )}
          </TouchableOpacity>
      </View>

      {/* 3. FOOTER LINKS */}
      <View style={[styles.footer, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.footerText}>{t('alreadyHaveAccount')}</Text>
          <Link href="/sign-in">
              <Text style={styles.signInLink}>{t('signIn')}</Text>
          </Link>
      </View>
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
        marginTop: 8,
        textAlign: 'center'
    },
    form: {
        width: '100%'
    },
    inputWrapper: {
        marginBottom: 25
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1.5,
        marginBottom: 5
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingVertical: 12,
        fontSize: 15,
        color: '#000'
    },
    signUpBtn: {
        backgroundColor: '#000',
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 20,
        // No border radius for a sharp, high-fashion look
    },
    signUpBtnText: {
        color: '#FFF',
        fontWeight: '900',
        letterSpacing: 3,
        fontSize: 14
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30
    },
    footerText: {
        fontSize: 12,
        color: '#999'
    },
    signInLink: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000',
        textDecorationLine: 'underline'
    }
});
