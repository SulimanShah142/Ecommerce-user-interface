import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Text, Platform, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageProvider, useLanguage } from '@/Contexts/LanguageContext'; 
import { CartProvider, useCart } from '../Contexts/CartContext';
import React, { useEffect, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import { OneSignal } from 'react-native-onesignal';
import { useBadges } from '@/Contexts/BadgeContext';
// 🎯 PART 1: THE CHILD CONTENT
function RootLayoutContent() {
  const { t, isRTL } = useLanguage(); 
  const router = useRouter();
  const segments = useSegments(); 
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const insets = useSafeAreaInsets();
const { userChatBadge, clearUserChat } = useBadges();
  // 1. 🎯 THE ONESIGNAL INITIALIZATION & PERMISSION FIX
  useEffect(() => {
    // Initialize standard tracking parameters
    OneSignal.initialize("1e89f5fe-bc90-4462-b4ab-f03a3e561c8d"); 

    // 🎯 CRITICAL FIX: Explicitly request push permissions from the device hardware!
    // This wakes up the OS prompt, gets user clearance, and generates the Subscription ID.
    OneSignal.Notifications.requestPermission(true).then((permissionGranted) => {
      console.log("🔔 OneSignal System Permission State Checked:", permissionGranted);
    }).catch((err) => {
      console.warn("⚠️ OneSignal hardware permission query failed:", err);
    });
  }, []);

  // 2. Active Session Watcher Pipeline
  useEffect(() => {
    if (session?.user?.id) {
      try {
        console.log("Linking User to OneSignal:", session.user.id);
        OneSignal.login(session.user.id);
      } catch (e) {
        console.warn("OneSignal login deferred: SDK not ready yet");
      }
    }
  }, [session?.user?.id]);

  // 3. SECURE AUTHENTICATION GUARD SYSTEM
   // 3. SECURE AUTHENTICATION GUARD SYSTEM (Locked Down App-Wide)
  useEffect(() => {
    // Hold evaluation cycles completely if Better-Auth is still fetching credentials
    if (sessionLoading) return;

    // 🎯 ROUTE MATCH FIX: Extract the core active segment path string cleanly
    const currentScreenGroup = segments[0] || '';
    
    // 🎯 THE CRITICAL SECURITY FIX:
    // A: In Expo Router, the home screen index page (app/index.tsx) evaluates to an empty string ("")
    // B: Re-appended your real tab folder layout path name ('categories') to protect it
    const protectedRoutes = [
      '',           // 🎯 Locks down the Main Index catalog landing page completely!
      'categories', // 🎯 Locks down your categories tabs feed entirely!
      'orders', 
      'cart', 
      'profile', 
      'checkout', 
      'chat',
      'products', 
      'settings'
    ];
    
    const isGuardedPathActive = protectedRoutes.includes(currentScreenGroup);

    // If an active session is missing and the target path is matching our guarded lists
    if (!session && isGuardedPathActive) {
      console.log(`🔒 Guard Intercept: No session parsed for /${currentScreenGroup || 'index'}. Evicting to login screen.`);
      
      // Wrap inside a small macro-task delay queue to ensure smooth layout transitions
      setTimeout(() => {
        router.replace('/(auth)/sign-in'); 
      }, 100);
    }
  }, [session, segments, sessionLoading]);


  const cartContext = useCart();
  const cartItems = cartContext?.state?.items || [];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const renderGlobalHeader = () => (
    <View style={[styles.globalHeader, { paddingTop: insets.top + 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.brandCluster, isRTL && { flexDirection: 'row-reverse' }]}>
        <Image 
          source={require('@/assets/images/app-icon.jpeg')}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.brandTitleText}>Brand Gallery</Text>
      </View>

      <View style={[styles.actionCluster, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={22} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/cart')}>
          <Ionicons name="bag-outline" size={22} color="#000" />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const tabBarStyleWithInsets = useMemo(() => {
    const baseHeight = 64; 
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
    return {
      ...styles.tabBar,
      height: baseHeight + bottomPadding,
      paddingBottom: bottomPadding,
    };
  }, [insets.bottom]);

  if (sessionLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  const isAuthActive = segments[0] === '(auth)';

  return (
    <Tabs
      screenOptions={{
        header: isAuthActive ? () => null : () => renderGlobalHeader(),
        tabBarHideOnKeyboard: true,
        tabBarStyle: isAuthActive ? { display: 'none' } : tabBarStyleWithInsets,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#AAA',
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

      {/* 🎯 TRANSLATED & SYNCED ORDERS NAVIGATION ENTRY */}
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: t('orders')?.toUpperCase() || 'ORDERS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bag-handle-sharp' : 'bag-handle-outline'} size={21} color={color} />
          ),
        }}
      />

    <Tabs.Screen
  name="chat" 
  options={{
    tabBarLabel: t('chat')?.toUpperCase() || 'CHAT',
    tabBarIcon: ({ color, focused }) => (
      <View style={{ position: 'relative' }}>
        <Ionicons name={focused ? 'chatbubble-ellipses-sharp' : 'chatbubble-ellipses-outline'} size={21} color={color} />
        
        {/* 🎯 FLOATS DIRECTLY OVER NATIVE TAB ICONS */}
        {userChatBadge > 0 && (
          <View style={styles.tabBadgeIndicator}>
            <Text style={styles.tabBadgeText}>{userChatBadge}</Text>
          </View>
        )}
      </View>
    ),
  }}
  listeners={{
    tabPress: () => clearUserChat() // Instantly clears out when user reads their messages
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
  );
}

// 🎯 PART 2: THE ROOT PARENT CONTAINER WRAPPER
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
  globalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoImage: { width: 28, height: 28, borderRadius: 14 },
  brandTitleText: { fontSize: 14, fontWeight: '900', color: '#000000', letterSpacing: 0.2 },
  actionCluster: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconButton: { position: 'relative', padding: 2 },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#000000', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  tabBar: { backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#F5F5F5' },
  tabLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: -2 },
  tabItem: { paddingTop: 6 },
    // Spacing configurations for floating notification indicators
  floatingBadgeMarker: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#000000', // Pure corporate black brand accent matching your DNA
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF' // High-contrast border separation ring
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900'
  },
  tabBadgeIndicator: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#000000',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900'
  }

});
