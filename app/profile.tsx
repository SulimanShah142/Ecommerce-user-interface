import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, 
  ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/Contexts/LanguageContext';

const API_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";

export default function ProfileScreen() {
  const router = useRouter();
  const { t, isRTL, locale, setLanguage: setSelectedLocale, languages } = useLanguage();
  const { data: session } = authClient.useSession();

  // Unified Profile Form Input States
  const [name, setName] = useState(session?.user?.name || '');
  const [phone, setPhone] = useState(session?.user?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const displayEmail = session?.user?.email;

  // 1. UPDATE USER FORM DISPATCH
  const handleUpdate = async () => {
    if (!name.trim()) return Alert.alert(t('error') || 'Error', t('nameRequired') || 'Name is required');
    setLoading(true);
    try {
      await authClient.user.update({
        name: name.trim(),
        phoneNumber: phone.trim()
      });
      Alert.alert(t('success') || 'Success', t('profileUpdated') || 'Profile updated successfully.');
    } catch (e) {
      Alert.alert(t('error') || 'Error', t('updateFailed') || 'Could not update records.');
    } finally {
      setLoading(false);
    }
  };

  // 2. MANDATORY DATA PURGE FOR STORE COMPLIANCE
  const handleDeleteAccountRequest = () => {
    Alert.alert(
      isRTL ? "حذف دائمی حساب" : "Delete Account Permanently",
      isRTL 
        ? "آیا مطمئن هستید؟ این عمل قابل بازگشت نیست و تمام اطلاعات شما برای همیشه پاک خواهد شد." 
        : "Are you absolutely sure? This action is completely irreversible and will permanently clear your profile data logs from our cloud servers.",
      [
        { text: isRTL ? "انصراف" : "CANCEL", style: "cancel" },
        { 
          text: isRTL ? "حذف شود" : "DELETE MY DATA", 
          style: "destructive", 
          onPress: executeCloudAccountPurge 
        }
      ]
    );
  };

  const executeCloudAccountPurge = async () => {
    setPurging(true);
    try {
      const res = await fetch(`${API_URL}/api/user/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.token || ''}`
        }
      });

      if (res.ok) {
        await authClient.signOut();
        Alert.alert(
          isRTL ? "موفقیت" : "Data Purged", 
          isRTL ? "حساب شما با موفقیت حذف گردید." : "Your profile records have been permanently cleared from our servers."
        );
        router.replace('/sign-in');
      } else {
        throw new Error();
      }
    } catch (e) {
      Alert.alert(
        isRTL ? "خطا" : "Purge Stalled", 
        isRTL ? "ارتباط با سرور برقرار نشد. لطفاً بعداً تلاش کنید." : "Network connection failed. Could not process request."
      );
    } finally {
      setPurging(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* SHARP MINIMAL HEADER */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconTouch} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{(t('settings') || 'SETTINGS').toUpperCase()}</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.headerIconTouch} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.saveBtn}>{(t('save') || 'SAVE').toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* TYPOGRAPHY AVATAR CONTAINER */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name ? name.slice(0, 2).toUpperCase() : (session?.user?.name ? session.user.name.slice(0, 2).toUpperCase() : "?")}
          </Text>
        </View>
        <Text style={styles.changePhoto}>{(t('verifiedAccount') || 'VERIFIED IDENTITY').toUpperCase()}</Text>
      </View>

      {/* INPUT FIELDS SECTION */}
      <View style={styles.form}>
        
        {/* FULL NAME INPUT */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{(t('fullName') || 'FULL NAME').toUpperCase()}</Text>
          <TextInput 
            style={[styles.input, isRTL && { textAlign: 'right' }]} 
            value={name} 
            onChangeText={setName} 
            placeholder="ENTER FULL NAME"
            placeholderTextColor="#BBBBBB"
            autoCapitalize="words"
          />
        </View>

        {/* LOCKED EMAIL FIELD */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{(t('email') || 'EMAIL ADDRESS').toUpperCase()}</Text>
          <TextInput 
            style={[styles.input, styles.disabledInput, isRTL && { textAlign: 'right' }]} 
            value={displayEmail || "NOT LINKED"} 
            editable={false} 
          />
          <Text style={[styles.lockedHelperText, isRTL && { textAlign: 'right' }]}>
            {t('emailLockedHelper') || 'Email identity credentials cannot be modified.'}
          </Text>
        </View>

        {/* PHONE NUMBER INPUT */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{(t('phoneNumber') || 'PHONE NUMBER').toUpperCase()}</Text>
          <TextInput 
            style={[styles.input, isRTL && { textAlign: 'right' }]} 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="+93 7XX XXX XXX"
            placeholderTextColor="#BBBBBB"
            keyboardType="phone-pad"
          />
        </View>

        {/* DYNAMIC LANGUAGE TABS ROW */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && { textAlign: 'right' }]}>{(t('appLanguage') || 'APP LANGUAGE').toUpperCase()}</Text>
          <View style={[styles.langGrid, isRTL && { flexDirection: 'row-reverse' }]}>
            {languages?.map((lang) => (
              <TouchableOpacity 
                key={lang.code}
                onPress={() => setSelectedLocale(lang.code)}
                style={[
                  styles.langTab, 
                  locale === lang.code && styles.langTabActive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.langTabText, 
                  locale === lang.code && styles.langTabTextActive
                ]}>
                  {lang.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ACCOUNT DISCONNECT BUTTONS */}
      <View style={styles.actionBlockWrapper}>
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={() => authClient.signOut().then(() => router.replace('/sign-in'))}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>SIGN OUT OF ACCOUNT</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deleteAccountBtn, isRTL && { flexDirection: 'row-reverse' }]} 
          onPress={handleDeleteAccountRequest}
          disabled={purging}
          activeOpacity={0.7}
        >
          {purging ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <>
              <Ionicons name="trash-bin-outline" size={14} color="#FF3B30" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
              <Text style={styles.deleteAccountBtnText}>
                {isRTL ? "حذف دائمی حساب کاربری" : "DELETE ACCOUNT PERMANENTLY"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  headerIconTouch: { padding: 4, minWidth: 44, alignItems: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 2 },
  saveBtn: { fontSize: 11, fontWeight: '800', color: '#000000', letterSpacing: 1 },
  
  // Profile Emblem Matrix
  avatarContainer: { alignItems: 'center', marginVertical: 32 },
  avatar: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#000000', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 12 
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  changePhoto: { fontSize: 9, fontWeight: '700', color: '#888888', letterSpacing: 1.5 },
  
  // Core Forms Design
  form: { paddingHorizontal: 20, marginBottom: 28 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 10, fontWeight: '800', color: '#111111', letterSpacing: 1.2, marginBottom: 8 },
  input: { 
    height: 42, 
    borderWidth: 1, 
    borderColor: '#EAEAEA', 
    borderRadius: 2, 
    paddingHorizontal: 12, 
    fontSize: 12, 
    color: '#000000',
    backgroundColor: '#FAFAFA',
    fontWeight: '400'
  },
  disabledInput: { color: '#888888', backgroundColor: '#F5F5F5', borderColor: '#EAEAEA' },
  lockedHelperText: { fontSize: 9, color: '#999999', marginTop: 4, letterSpacing: 0.4, fontWeight: '400' },
  
  // Custom Language Grid Tab Elements
  langGrid: { flexDirection: 'row', gap: 10, marginTop: 2 },
  langTab: { 
    flex: 1, 
    height: 38, 
    borderWidth: 1, 
    borderColor: '#EAEAEA', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FAFAFA',
    borderRadius: 2 
  },
  langTabActive: { backgroundColor: '#000000', borderColor: '#000000' },
  langTabText: { fontSize: 10, fontWeight: '700', color: '#555555', letterSpacing: 0.8 },
  langTabTextActive: { color: '#FFFFFF' },
  
  // Actions Block
  actionBlockWrapper: { paddingHorizontal: 20, gap: 14 },
  logoutBtn: { 
    height: 44, 
    borderWidth: 1, 
    borderColor: '#000000', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 2 
  },
  logoutText: { color: '#000000', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  deleteAccountBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12,
    marginTop: 8
  },
  deleteAccountBtnText: { color: '#FF3B30', fontSize: 10, fontWeight: '800', letterSpacing: 1 }
});
