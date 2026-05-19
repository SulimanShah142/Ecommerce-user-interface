import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/Contexts/LanguageContext';
import { Locale, LANGUAGES } from '@/lib/i18n';

const API_URL = "http://192.168.1.3:8787"; // Ensure this matches your server IP

export default function EditProfile() {
  const router = useRouter();
  const { t, locale, setLanguage, isRTL } = useLanguage();
  const { data: session, isPending } = authClient.useSession();
  
  // 1. Core State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [loading, setLoading] = useState(false);

  // 2. Sync Session Data
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setPhone(session.user.phoneNumber || '');
      setSelectedLocale(locale);
    }
  }, [session, locale]);

  // Filter out internal @phone.local emails from the UI
  const displayEmail = session?.user?.email?.endsWith('@phone.local') 
    ? "" 
    : session?.user?.email;
const handleUpdate = async () => {
  if (!name.trim()) return Alert.alert("Error", "Name is required");
  
  setLoading(true);
  try {
    // 1. Update Better Auth (Name)
    await authClient.updateUser({ name: name.trim() });

    // 2. Update Database (Phone & Name)
    const res = await fetch(`${API_URL}/api/user/update`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'userapp://' 
      },
      body: JSON.stringify({
        userId: session?.user.id,
        name: name.trim(),
        phoneNumber: phone.trim()
      })
    });

    if (!res.ok) throw new Error("Server update failed");

    // 3. CRITICAL: Trigger the Language Change
    // This will save the preference and restart the app if RTL changes
    await setLanguage(selectedLocale);

    // 4. Refresh session
    await authClient.getSession();

    Alert.alert("Success", "Profile & Language Updated ✨");
    
    // If the language changed, setLanguage will restart the app, 
    // so router.back() might not even be needed.
    router.back();
  } catch (e) {
    console.error(e);
    Alert.alert("Error", "Could not save changes.");
  } finally {
    setLoading(false);
  }
};


  if (isPending) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings').toUpperCase()}</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveBtn}>{t('send').toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* AVATAR SECTION */}
     <View style={styles.avatarContainer}>
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>
      {/* 
        Priority: 
        1. Current input name 
        2. Session user name 
        3. Fallback '?' 
      */}
      {(name || session?.user?.name || "?")[0].toUpperCase()}
    </Text>
  </View>
  <Text style={styles.changePhoto}>{t('justForYou').toUpperCase()}</Text>
</View>

      <View style={styles.form}>
        {/* FULL NAME */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('fullName').toUpperCase()}</Text>
          <TextInput 
            style={[styles.input, isRTL && { textAlign: 'right' }]} 
            value={name} 
            onChangeText={setName} 
            placeholder="ENTER NAME"
          />
        </View>

        {/* EMAIL (LOCKED) - Using 'email' key instead of 'yourCart' */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>EMAIL ADDRESS</Text>
          <TextInput 
            style={[styles.input, { color: '#bbb' }, isRTL && { textAlign: 'right' }]} 
            value={displayEmail || "NOT LINKED"} 
            editable={false} 
          />
        </View>

        {/* PHONE NUMBER - Using 'phoneNumber' key instead of 'language' */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>PHONE NUMBER</Text>
          <TextInput 
            style={[styles.input, isRTL && { textAlign: 'right' }]} 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="+93 7XX XXX XXX"
            keyboardType="phone-pad"
          />
        </View>

        {/* DYNAMIC LANGUAGE SELECTOR */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{t('language').toUpperCase()}</Text>
          <View style={[styles.langGrid, isRTL && { flexDirection: 'row-reverse' }]}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity 
                key={lang.code}
                onPress={() => setSelectedLocale(lang.code)}
                style={[
                  styles.langTab, 
                  selectedLocale === lang.code && styles.langTabActive
                ]}
              >
                <Text style={[
                  styles.langTabText, 
                  selectedLocale === lang.code && styles.langTabTextActive
                ]}>
                  {lang.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={() => authClient.signOut().then(() => router.replace('/(auth)/sign-in'))}
      >
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  saveBtn: { fontSize: 14, fontWeight: '900', color: '#000' },
  avatarContainer: { alignItems: 'center', marginVertical: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '300', color: '#fff' },
  changePhoto: { marginTop: 10, fontSize: 10, color: '#999', fontWeight: '800', letterSpacing: 1 },
  form: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 11, fontWeight: '900', color: '#666', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10, fontSize: 15, fontWeight: '500' },
  langGrid: { flexDirection: 'row', gap: 10, marginTop: 5 },
  langTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  langTabActive: { backgroundColor: '#000', borderColor: '#000' },
  langTabText: { fontSize: 10, fontWeight: '800', color: '#999' },
  langTabTextActive: { color: '#fff' },
  logoutBtn: { marginTop: 20, marginHorizontal: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#ff4d4f' },
  logoutText: { color: '#ff4d4f', fontWeight: '900', fontSize: 13, letterSpacing: 1 }
});
