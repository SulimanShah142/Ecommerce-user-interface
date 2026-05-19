import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, Text, Platform } from 'react-native';
import { useLanguage } from '../../Contexts/LanguageContext';
import { useCart } from '../../Contexts/CartContext';
import { useEffect } from 'react';
import { initOneSignal } from '@/lib/notiifcations'; 
import { authClient } from '@/lib/auth-client';
import {OneSignal} from 'react-native-onesignal'
export default function TabLayout() {
  const { t } = useLanguage();
  const router = useRouter();
// Inside User App (where you handle the session)
const { data: session } = authClient.useSession();



 useEffect(() => {
    // Safety check: only login if SDK is ready and session exists
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

  const renderCartButton = () => (
    <TouchableOpacity 
      style={styles.headerButton} 
      onPress={() => router.push('/cart')}
    >
      <Ionicons name="bag-outline" size={24} color="#000" />
      {cartCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
  <Tabs
  screenOptions={{
    headerShown: true,
    tabBarHideOnKeyboard: true, // Prevents keyboard from pushing tabs up
    headerStyle: { 
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    },
    headerTitleStyle: { fontWeight: '900', fontSize: 13, letterSpacing: 2 },
    headerTitleAlign: 'center',
    headerRight: renderCartButton,
    tabBarStyle: styles.tabBar,
    tabBarActiveTintColor: '#000',
    tabBarInactiveTintColor: '#AAA',
    tabBarLabelStyle: styles.tabLabel,
  }}>
  
  <Tabs.Screen
    name="index"
    options={{
      title: 'SHEIN',
      tabBarLabel: 'HOME',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'home-sharp' : 'home-outline'} size={22} color={color} />
      ),
    }}
  />

  <Tabs.Screen
    name="categories"
    options={{
      title: 'CATEGORIES',
      tabBarLabel: 'CATEGORY',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'grid-sharp' : 'grid-outline'} size={22} color={color} />
      ),
    }}
  />

  <Tabs.Screen
    name="orders"
    options={{
      title: 'MY ORDERS',
      tabBarLabel: 'ORDERS',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'bag-handle-sharp' : 'bag-handle-outline'} size={22} color={color} />
      ),
    }}
  />

  <Tabs.Screen
    name="profile" 
    options={{
      title: 'ACCOUNT',
      tabBarLabel: 'ME',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'person-sharp' : 'person-outline'} size={22} color={color} />
      ),
    }}
  />
    <Tabs.Screen
    name="chat" 
    options={{
      title: 'CHAT',
      tabBarLabel: 'Chat',
      tabBarIcon: ({ color, focused }) => (
        <Ionicons name={focused ? 'person-sharp' : 'person-outline'} size={22} color={color} />
      ),
    }}
  />


  {/* HIDE THE UNWANTED TABS */}
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
</Tabs>


  );
}
const styles = StyleSheet.create({
   tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    // INCREASED HEIGHTS:
    height: Platform.OS === 'ios' ? 95 : 75, 
    paddingTop: 12,
    // Add significant padding to the bottom for Android system nav
    paddingBottom: Platform.OS === 'ios' ? 35 : 15, 
    elevation: 10, // Adds a slight shadow on Android to separate from background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 10, 
    fontWeight: '800', 
    marginTop: 4,
    letterSpacing: 0.5,
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000', // Pure black badge
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF', // White border makes it pop off the icon
  },
  badgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
  },
});
