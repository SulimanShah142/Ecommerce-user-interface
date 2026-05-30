import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  AppState
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/Contexts/LanguageContext';
import * as SecureStore from 'expo-secure-store';

const API_URL = "http://192.168.1.3:8787";

export default function ProfileScreen() {
  const router = useRouter();

  const {
    t,
    isRTL,
    locale,
    setLanguage: setSelectedLocale,
    languages
  } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ✅ SECURE SESSION VALIDATION + PROFILE HYDRATION
  const validateSessionAndHydrate = async () => {
    try {
      const token =
        await SecureStore.getItemAsync(
          'custom_user_session_token'
        );

      if (!token) {
        router.replace('/(auth)/sign-in');
        return;
      }

      const res = await fetch(
        `${API_URL}/api/user/me`,
        {
          headers: {
            Authorization: `Bearer ${token.trim()}`
          }
        }
      );

      let data: any = null;

try {
  data = await res.json();
} catch {
  throw new Error("Invalid server response");
}

      if (!res.ok || !data?.user) {
        await SecureStore.deleteItemAsync(
          'custom_user_session_token'
        );

        await SecureStore.deleteItemAsync(
          'cached_user_profile'
        );

        router.replace('/(auth)/sign-in');
        return;
      }

      const user = data.user;

      setName(user?.name || '');
      setPhone(
        user?.phoneNumber ||
        user?.phone ||
        ''
      );

      setDisplayEmail(user?.email || '');

      await SecureStore.setItemAsync(
        'cached_user_profile',
        JSON.stringify(user)
      );

    } catch (err) {
      console.error(err);

      Alert.alert(
        'Session Error',
        'Please sign in again.'
      );

      router.replace('/(auth)/sign-in');

    } finally {
      setFetching(false);
    }
  };

  // ✅ INITIAL SESSION CHECK
  useEffect(() => {
    validateSessionAndHydrate();

    const subscription =
      AppState.addEventListener(
        'change',
        async (state) => {
          if (state === 'active') {
            validateSessionAndHydrate();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ PROFILE UPDATE
  const handleUpdate = async () => {
    if (!name.trim()) {
      return Alert.alert(
        t('error') || 'Error',
        t('nameRequired') || 'Name is required'
      );
    }

    setLoading(true);

    try {
      const activeSessionToken =
        await SecureStore.getItemAsync(
          'custom_user_session_token'
        );

      if (!activeSessionToken) {
        throw new Error('Session expired');
      }

      const res = await fetch(
        `${API_URL}/api/user/update-profile`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeSessionToken.trim()}`
          },

          body: JSON.stringify({
            name: name
              .trim()
              .slice(0, 80),

            phone: phone
              .replace(/[^\d+]/g, '')
              .slice(0, 20)
          })
        }
      );

      let data: any = null;

try {
  data = await res.json();
} catch {
  throw new Error("Invalid server response");
}

      if (res.ok && data.success) {
        await SecureStore.setItemAsync(
          'cached_user_profile',
          JSON.stringify(data.user)
        );

        Alert.alert(
          t('success') || 'Success',
          t('profileUpdated') ||
          'Profile updated successfully.'
        );

      } else {
        Alert.alert(
          t('error') || 'Error',
          data?.error ||
          'Could not update profile.'
        );
      }

    } catch (e: any) {
      Alert.alert(
        t('error') || 'Error',
        e?.message ||
        'Could not update profile.'
      );

    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE ACCOUNT CONFIRMATION
  const handleDeleteAccountRequest = () => {
    Alert.alert(
      isRTL
        ? "حذف دائمی حساب"
        : "Delete Account Permanently",

      isRTL
        ? "آیا مطمئن هستید؟ این عمل قابل بازگشت نیست."
        : "Are you absolutely sure? This action is irreversible.",

      [
        {
          text: isRTL ? "انصراف" : "CANCEL",
          style: "cancel"
        },

        {
          text: isRTL ? "حذف شود" : "DELETE ACCOUNT",
          style: "destructive",
          onPress: executeCloudAccountPurge
        }
      ]
    );
  };

  // ✅ DELETE ACCOUNT
  const executeCloudAccountPurge = async () => {
    setPurging(true);

    try {
      const token =
        await SecureStore.getItemAsync(
          'custom_user_session_token'
        );

      if (!token) {
        throw new Error(
          'Session expired'
        );
      }

      const res = await fetch(
        `${API_URL}/api/user/account`,
        {
          method: 'DELETE',

          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.trim()}`
          }
        }
      );

      let data: any = null;

try {
  data = await res.json();
} catch {
  throw new Error("Invalid server response");
}

      if (!res.ok) {
        throw new Error(
          data?.error ||
          'Deletion failed'
        );
      }

      await SecureStore.deleteItemAsync(
        'custom_user_session_token'
      );

      await SecureStore.deleteItemAsync(
        'cached_user_profile'
      );

      Alert.alert(
        isRTL ? "موفقیت" : "Success",
        isRTL
          ? "حساب شما حذف شد."
          : "Your account has been deleted."
      );

      router.replace('/(auth)/sign-in');

    } catch (e: any) {
      Alert.alert(
        isRTL ? "خطا" : "Error",
        e?.message ||
        'Failed to delete account.'
      );

    } finally {
      setPurging(false);
    }
  };

  // ✅ LOGOUT
  const handleManualSignOut = async () => {
    Alert.alert(
      isRTL
        ? "خروج از حساب"
        : "Sign Out",

      isRTL
        ? "آیا مطمئن هستید؟"
        : "Are you sure you want to sign out?",

      [
        {
          text: isRTL ? "انصراف" : "CANCEL",
          style: "cancel"
        },

        {
          text: isRTL ? "خروج" : "LOG OUT",
          style: "destructive",

          onPress: async () => {
            try {
              const token =
                await SecureStore.getItemAsync(
                  'custom_user_session_token'
                );

              if (token) {
                await fetch(
                  `${API_URL}/api/auth/logout`,
                  {
                    method: 'POST',

                    headers: {
                      Authorization: `Bearer ${token.trim()}`
                    }
                  }
                ).catch(() => {});
              }

            } catch {}

            await SecureStore.deleteItemAsync(
              'custom_user_session_token'
            ).catch(() => {});

            await SecureStore.deleteItemAsync(
              'cached_user_profile'
            ).catch(() => {});

            router.replace('/(auth)/sign-in');
          }
        }
      ]
    );
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="small"
          color="#000000"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}
      <View
        style={[
          styles.header,
          isRTL && { flexDirection: 'row-reverse' }
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconTouch}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close"
            size={24}
            color="#000000"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {(t('settings') || 'SETTINGS').toUpperCase()}
        </Text>

        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={styles.headerIconTouch}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#000000"
            />
          ) : (
            <Text style={styles.saveBtn}>
              {(t('save') || 'SAVE').toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name
              ? name.slice(0, 2).toUpperCase()
              : "🥷"}
          </Text>
        </View>

        <Text style={styles.changePhoto}>
          {(t('verifiedAccount') || 'VERIFIED IDENTITY').toUpperCase()}
        </Text>
      </View>

      {/* FORM */}
      <View style={styles.form}>

        {/* NAME */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              isRTL && { textAlign: 'right' }
            ]}
          >
            {(t('fullName') || 'FULL NAME').toUpperCase()}
          </Text>

          <TextInput
            style={[
              styles.input,
              isRTL && { textAlign: 'right' }
            ]}

            value={name}
            onChangeText={setName}

            placeholder="ENTER FULL NAME"
            placeholderTextColor="#BBBBBB"

            autoCapitalize="words"
          />
        </View>

        {/* EMAIL */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              isRTL && { textAlign: 'right' }
            ]}
          >
            {(t('email') || 'EMAIL ADDRESS').toUpperCase()}
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.disabledInput,
              isRTL && { textAlign: 'right' }
            ]}

            value={displayEmail || "NOT LINKED"}
            editable={false}
          />

          <Text
            style={[
              styles.lockedHelperText,
              isRTL && { textAlign: 'right' }
            ]}
          >
            {t('emailLockedHelper') ||
              'Email identity credentials cannot be modified.'}
          </Text>
        </View>

        {/* PHONE */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              isRTL && { textAlign: 'right' }
            ]}
          >
            {(t('phoneNumber') || 'PHONE NUMBER').toUpperCase()}
          </Text>

          <TextInput
            style={[
              styles.input,
              isRTL && { textAlign: 'right' }
            ]}

            value={phone}
            onChangeText={setPhone}

            placeholder="+93 7XX XXX XXX"
            placeholderTextColor="#BBBBBB"

            keyboardType="phone-pad"
          />
        </View>

        {/* LANGUAGES */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              isRTL && { textAlign: 'right' }
            ]}
          >
            {(t('appLanguage') || 'APP LANGUAGE').toUpperCase()}
          </Text>

          <View
            style={[
              styles.langGrid,
              isRTL && { flexDirection: 'row-reverse' }
            ]}
          >
            {languages?.map((lang) => (
              <TouchableOpacity
                key={lang.code}

                onPress={() =>
                  setSelectedLocale(lang.code)
                }

                style={[
                  styles.langTab,
                  locale === lang.code &&
                  styles.langTabActive
                ]}

                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.langTabText,
                    locale === lang.code &&
                    styles.langTabTextActive
                  ]}
                >
                  {lang.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ACTIONS */}
      <View style={styles.actionBlockWrapper}>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleManualSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>
            SIGN OUT OF ACCOUNT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.deleteAccountBtn,
            isRTL && { flexDirection: 'row-reverse' }
          ]}

          onPress={handleDeleteAccountRequest}

          disabled={purging}

          activeOpacity={0.7}
        >
          {purging ? (
            <ActivityIndicator
              size="small"
              color="#FF3B30"
            />
          ) : (
            <>
              <Ionicons
                name="trash-bin-outline"
                size={14}
                color="#FF3B30"
                style={
                  isRTL
                    ? { marginLeft: 6 }
                    : { marginRight: 6 }
                }
              />

              <Text style={styles.deleteAccountBtnText}>
                {isRTL
                  ? "حذف دائمی حساب کاربری"
                  : "DELETE ACCOUNT PERMANENTLY"}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  content: {
    paddingBottom: 40
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 16,

    paddingTop:
      Platform.OS === 'ios'
        ? 56
        : 20,

    paddingBottom: 16,

    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },

  headerIconTouch: {
    padding: 4,
    minWidth: 44,
    alignItems: 'center'
  },

  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2
  },

  saveBtn: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1
  },

  avatarContainer: {
    alignItems: 'center',
    marginVertical: 32
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,

    backgroundColor: '#000000',

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 12
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1
  },

  changePhoto: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 1.5
  },

  form: {
    paddingHorizontal: 20,
    marginBottom: 28
  },

  inputGroup: {
    marginBottom: 22
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 1.2,
    marginBottom: 8
  },

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

  disabledInput: {
    color: '#888888',
    backgroundColor: '#F5F5F5',
    borderColor: '#EAEAEA'
  },

  lockedHelperText: {
    fontSize: 9,
    color: '#999999',
    marginTop: 4,
    letterSpacing: 0.4,
    fontWeight: '400'
  },

  langGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2
  },

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

  langTabActive: {
    backgroundColor: '#000000',
    borderColor: '#000000'
  },

  langTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 0.8
  },

  langTabTextActive: {
    color: '#FFFFFF'
  },

  actionBlockWrapper: {
    paddingHorizontal: 20,
    gap: 14
  },

  logoutBtn: {
    height: 44,

    borderWidth: 1,
    borderColor: '#000000',

    justifyContent: 'center',
    alignItems: 'center',

    borderRadius: 2
  },

  logoutText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5
  },

  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingVertical: 12,

    marginTop: 8
  },

  deleteAccountBtnText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  }
});

