import { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, ActivityIndicator , TouchableOpacity} from "react-native";
import { authClient } from "../../lib/auth-client";
import { Link } from "expo-router";

// CRITICAL: Ensure 'export default' is here
export default function SignUp() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState(""); // NEW STATE
    const [loading, setLoading] = useState(false);

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
            router.replace("/(tabs)");
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
        <View style={styles.header}>
            <Text style={styles.brandTitle}>SHEIN</Text>
            <Text style={styles.welcomeText}>CREATE AN ACCOUNT</Text>
            <Text style={styles.subText}>Sign up to start shopping your favorite trends.</Text>
        </View>

        {/* 2. FORM */}
        <View style={styles.form}>
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#BBB"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View style={styles.inputWrapper}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                    style={styles.input}
                    placeholder="example@mail.com"
                    placeholderTextColor="#BBB"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>
               <View style={styles.inputWrapper}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                    style={styles.input}
                    placeholder="+93 7XX XXX XXX"
                    placeholderTextColor="#BBB"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputWrapper}>
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                    style={styles.input}
                    placeholder="••••••••"
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
                    <Text style={styles.signUpBtnText}>REGISTER</Text>
                )}
            </TouchableOpacity>
        </View>

        {/* 3. FOOTER LINKS */}
        <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in">
                <Text style={styles.signInLink}>SIGN IN</Text>
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
