import { useState } from "react"; 
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { authClient } from "../../lib/auth-client";
import { Link } from "expo-router";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await authClient.signIn.email({
                email,
                password
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* BRANDING */}
            <View style={styles.header}>
                <Text style={styles.brandTitle}>SHEIN</Text>
                <Text style={styles.welcomeText}>WELCOME BACK</Text>
            </View>

            {/* FORM */}
            <View style={styles.form}>
                <View style={styles.inputWrapper}>
                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="#BBB"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
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
                    <Link href="/otp-login">
                    <TouchableOpacity style={styles.forgotBtn} >
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                    </Link>
                </View>

                <TouchableOpacity 
                    style={styles.signInBtn} 
                    onPress={handleLogin} 
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.signInBtnText}>SIGN IN</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>New to SHEIN? </Text>
                <Link href="/sign-up">
                    <Text style={styles.signUpLink}>REGISTER NOW</Text>
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
        marginBottom: 50,
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
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 8
    },
    forgotText: {
        fontSize: 11,
        color: '#999',
        fontWeight: '500'
    },
    signInBtn: {
        backgroundColor: '#000',
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 20
    },
    signInBtnText: {
        color: '#FFF',
        fontWeight: '900',
        letterSpacing: 3,
        fontSize: 14
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40
    },
    footerText: {
        fontSize: 12,
        color: '#999'
    },
    signUpLink: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000',
        textDecorationLine: 'underline'
    }
});
