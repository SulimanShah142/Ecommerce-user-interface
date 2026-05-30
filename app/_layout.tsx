import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Text, Platform, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageProvider, useLanguage } from '@/Contexts/LanguageContext'; 
import { CartProvider, useCart } from '../Contexts/CartContext';
import React, { useEffect, useMemo, useState } from 'react';
import { OneSignal } from 'react-native-onesignal';
import { BadgeProvider, useBadges } from '@/Contexts/BadgeContext';
import * as SecureStore from 'expo-secure-store';
import { initOneSignal } from '@/lib/notiifcations';
const API_URL = 'https://brand-gallery-backend.brand-gallery.workers.dev';
// 🎯 PART 1: THE CHILD CONTENT
function RootLayoutContent() {
  const { t, isRTL } = useLanguage(); 
  const router = useRouter();
  const segments = useSegments(); 
  const insets = useSafeAreaInsets();
  
  // 🎯 CUSTOM AUTOMATED SESSION VERIFIER STATES
// 🎯 CUSTOM AUTH STATES
const [sessionLoading, setSessionLoading] = useState(true);
const [hasCustomToken, setHasCustomToken] = useState(false);
const [cachedUser, setCachedUser] = useState<any>(null);

const { userChatBadge, delivererOrdersBadge, clearUserChat, clearDelivererOrders } = useBadges();


// 🎯 ROUTE DETECTOR
const isAuthActive = segments[0] === '(auth)';


// 🎯 PROTECTED ROUTES
const protectedRoutes = [
  '',
  'categories',
  'orders',
  'cart',
  'profile',
  'checkout',
  'chat',
  'products',
  'settings'
];

const currentScreenGroup = segments[0] || '';
const isProtectedRoute =
  !isAuthActive &&
  protectedRoutes.includes(currentScreenGroup);


// 🎯 ONESIGNAL BOOTSTRAP
  // Inside app/_layout.tsx -> OneSignal Initializer useEffect
    // Inside app/_layout.tsx -> OneSignal Initializer Loop Fixed for v5 SDK
// 🎯 THE VERIFIED UNIFIED ONESIGNAL & SESSION BOOTSTRAP PIPELINE
// 🎯 THE UNIFIED ONESIGNAL & SESSION BOOTSTRAP LIFECYCLE ENGINE
// 🎯 THE UNIFIED ONESIGNAL & SESSION BOOTSTRAP LIFECYCLE ENGINE
 useEffect(() => {
    initOneSignal();
  }, []);

  // 2. 🎯 SINGLE SESSION BOOTSTRAP WORKER SCREEN UPDATER
  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('custom_user_session_token');
        const profileString = await SecureStore.getItemAsync('cached_user_profile');

        if (!token || token.trim().length === 0) {
          setHasCustomToken(false);
          setCachedUser(null);
          return;
        }

        let activeUserId: string | null = null;

        // Use local storage values for an anti-flicker UI render pass
        if (profileString) {
          try {
            const parsedUser = JSON.parse(profileString);
            setCachedUser(parsedUser);
            if (parsedUser?.id) activeUserId = parsedUser.id;
          } catch {}
        }

        // Verify active token credentials on the backend server
        const res = await fetch(`${API_URL}/api/user/me`, {
          headers: { Authorization: `Bearer ${token.trim()}` }
        });

        let data: any = null;
        try { data = await res.json(); } catch {}

        if (!res.ok || !data?.user) {
          await SecureStore.deleteItemAsync('custom_user_session_token').catch(() => {});
          await SecureStore.deleteItemAsync('cached_user_profile').catch(() => {});
          setHasCustomToken(false);
          setCachedUser(null);
          return;
        }

        // Token matches successfully! Update application states
        setHasCustomToken(true);
        setCachedUser(data.user);
        if (data.user?.id) activeUserId = data.user.id;
        await SecureStore.setItemAsync('cached_user_profile', JSON.stringify(data.user));

        // 🎯 THE RUNTIME ALIGNMENT FIX: 
        // Invoke your shared helper asynchronously to link your user ID profile alias cleanly
        if (activeUserId) {
          await initOneSignal(activeUserId);
        }

      } catch (err) {
        console.warn("Session bootstrap failed:", err);
        setHasCustomToken(false);
        setCachedUser(null);
      } finally {
        setSessionLoading(false);
      }
    };

    bootstrapSession();
  }, [segments]);


// 🎯 AUTH GUARD
useEffect(() => {
  if (sessionLoading) return;

  // NOT LOGGED IN + PROTECTED PAGE
  if (
    !hasCustomToken &&
    isProtectedRoute
  ) {
    router.replace('/(auth)/sign-in');
    return;
  }

  // LOGGED IN + INSIDE AUTH PAGES
  if (
    hasCustomToken &&
    isAuthActive
  ) {
    router.replace('/');
  }

}, [
  hasCustomToken,
  sessionLoading,
  isProtectedRoute,
  isAuthActive
]);


// 🎯 CART
const cartContext = useCart();

const cartItems =
  cartContext?.state?.items || [];

const cartCount =
  cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );


// 🎯 GLOBAL HEADER
   const renderGlobalHeader = () => {
    if (isAuthActive) return null;
    return (
      <View
        style={[
          styles.globalHeader,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 12
          },
          isRTL && {
            flexDirection: 'row-reverse'
          }
        ]}
      >
        <View style={[styles.brandCluster, isRTL && { flexDirection: 'row-reverse' }]}>
          <Image
            source={require('@/assets/images/app-icon.jpeg')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitleText}>Brand Gallery</Text>
        </View>

        <View style={[styles.actionCluster, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-outline" size={22} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/cart')}
          >
            <Ionicons name="bag-outline" size={22} color="#000000" />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // TAB BAR INSTANTIATION MEMO
  const tabBarStyleWithInsets = useMemo(() => {
    const baseHeight = 56;
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
    return {
      ...styles.tabBar,
      height: baseHeight + bottomPadding,
      paddingBottom: bottomPadding,
    };
  }, [insets.bottom]);

  if (sessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      
      {/* 🎯 THE STRUCTURAL FIX: 
          By rendering the header inline natively right here without absolute layout rules, 
          it acts as a natural ceiling. This stops your underlying SHEIN screens from sliding up 
          or getting hidden underneath the notch components layout boundaries! */}
      {renderGlobalHeader()}

      <Tabs
        screenOptions={{
          headerShown: false, // Prevents Expo native headers from creating duplicate stacks
          tabBarHideOnKeyboard: true,
          tabBarStyle: isAuthActive ? { display: 'none' } : tabBarStyleWithInsets,
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#AAAAAA',
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          safeAreaInsets: isAuthActive ? { bottom: 0, top: 0 } : { bottom: 0 }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: t('home')?.toUpperCase() || 'HOME',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home-sharp' : 'home-outline'} size={21} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="categories"
          options={{
            tabBarLabel: t('categories')?.toUpperCase() || 'CATEGORY',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid-sharp' : 'grid-outline'} size={21} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            tabBarLabel: t('orders')?.toUpperCase() || 'ORDERS',
            tabBarIcon: ({ color, focused }) => (
              <View style={{ position: 'relative' }}>
                <Ionicons name={focused ? 'bag-handle-sharp' : 'bag-handle-outline'} size={21} color={color} />
                {delivererOrdersBadge > 0 && (
                  <View style={styles.tabBadgeIndicator}>
                    <Text style={styles.tabBadgeText}>{delivererOrdersBadge}</Text>
                  </View>
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => clearDelivererOrders()
          }}
        />

        <Tabs.Screen
          name="chat" 
          options={{
            tabBarLabel: t('chat')?.toUpperCase() || 'CHAT',
            tabBarIcon: ({ color, focused }) => (
              <View style={{ position: 'relative' }}>
                <Ionicons name={focused ? 'chatbubble-ellipses-sharp' : 'chatbubble-ellipses-outline'} size={21} color={color} />
                {userChatBadge > 0 && (
                  <View style={styles.tabBadgeIndicator}>
                    <Text style={styles.tabBadgeText}>{userChatBadge}</Text>
                  </View>
                )}
              </View>
            ),
          }}
          listeners={{
            tabPress: () => clearUserChat() 
          }}
        />
        
        <Tabs.Screen name="(auth)" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="products" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="categories/[id]" options={{ href: null }} />
        <Tabs.Screen name="orders/[id]" options={{ href: null }} />
        <Tabs.Screen name="product/[id]" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="product/[id]/reviews" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <CartProvider>
        <BadgeProvider> 
          <RootLayoutContent />
        </BadgeProvider>
      </CartProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  globalHeader: { 
    // 🎯 STRIPPED ABSOLUTE POSITIONING LABELS OUT ENTIRELY
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 16, 
    borderBottomColor: '#000000'
  },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoImage: { width: 26, height: 26, borderRadius: 0 }, 
  brandTitleText: { fontSize: 13, fontWeight: '900', color: '#000000', letterSpacing: 1, textTransform: 'uppercase' },
  actionCluster: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconButton: { position: 'relative', padding: 2 },
   badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#000000', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },tabBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#000000' },tabLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: -2 },tabItem: { paddingTop: 6 },tabBadgeIndicator: { position: 'absolute', top: -4, right: -8, backgroundColor: '#000000', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },tabBadgeText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }});