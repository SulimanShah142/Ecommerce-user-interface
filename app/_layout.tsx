import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Text, Platform, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageProvider, useLanguage } from '../Contexts/LanguageContext'; 
import { CartProvider, useCart } from '../Contexts/CartContext';
import { useEffect, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import { OneSignal } from 'react-native-onesignal';

// 🎯 PART 1: THE CHILD CONTENT (Safely consumes context fields)
function RootLayoutContent() {
  const { t, isRTL } = useLanguage(); 
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  // 1. ADD INITIALIZE EFFECT HERE (Runs immediately on component mount)
  useEffect(() => {
    // Replace with your true OneSignal App ID string
    OneSignal.initialize("YOUR_ONESIGNAL_APP_ID"); 
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

  const cartContext = useCart();
  const cartItems = cartContext?.state?.items || [];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const renderGlobalHeader = () => (
    <View style={[styles.globalHeader, { paddingTop: insets.top + 8 }, isRTL && { flexDirection: 'row-reverse' }]}>
      
      {/* LEFT CLUSTER */}
      <View style={[styles.brandCluster, isRTL && { flexDirection: 'row-reverse' }]}>
        <Image 
          source={require('@/assets/images/app-icon.jpeg')}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.brandTitleText}>Brand Gallery</Text>
      </View>

      {/* RIGHT CLUSTER */}
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

  return (
    <Tabs
      screenOptions={{
        header: () => renderGlobalHeader(),
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarStyleWithInsets,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#AAA',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem, 
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
            <Ionicons name={focused ? 'bag-handle-sharp' : 'bag-handle-outline'} size={21} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat" 
        options={{
          tabBarLabel: t('chat')?.toUpperCase() || 'CHAT',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses-sharp' : 'chatbubble-ellipses-outline'} size={21} color={color} />
          ),
        }}
      />

      {/* HIDDEN ROUTE ENTRIES */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="categories/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="sign-in" options={{ href: null }} />
      <Tabs.Screen name="sign-up" options={{ href: null }} />
      <Tabs.Screen name="otp-login" options={{ href: null }} /> 
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
        <RootLayoutContent />
      </CartProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoImage: { width: 24, height: 24 },
  brandTitleText: { fontSize: 14, fontWeight: '900', color: '#000000', letterSpacing: 1.5, textTransform: 'uppercase' },
  actionCluster: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIconButton: { padding: 4, position: 'relative' },

  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 8,
    elevation: 20, 
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: { height: 48, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 9, fontWeight: '900', marginTop: 2, letterSpacing: 0.6 },
  badge: { position: 'absolute', top: -2, right: -6, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  badgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
});
