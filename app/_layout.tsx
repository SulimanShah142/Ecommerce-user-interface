import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { authClient } from '@/lib/auth-client';
import { CartProvider } from '@/Contexts/CartContext';
import { LanguageProvider } from '@/Contexts/LanguageContext';
import { initOfflineDb } from '@/lib/offline';
import { initOneSignal } from '@/lib/notiifcations';

// 1. Keep this at the VERY top level, outside the function
SplashScreen.preventAutoHideAsync().catch(() => {
  /* handle error */
});

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [appIsReady, setAppIsReady] = useState(false);

  // 2. Load Services
  useEffect(() => {
    initOneSignal();
    initOfflineDb();
  }, []);

  // 3. Wait for assets and timer
  useEffect(() => {
    async function prepare() {
      try {
        // Simulation of loading assets/data
        await new Promise(resolve => setTimeout(resolve, 2000)); 
      } catch (e) {
        console.warn(e);
      } finally {
        // Signal that the app is ready to render
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // 4. HIDE SPLASH ONLY WHEN READY
  // We use a separate effect so the UI renders at least once before hiding
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // 5. Auth Protection Logic
  useEffect(() => {
    if (isPending || !appIsReady) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'otp-login' || segments[0] === 'sign-in' || segments[0] === 'sign-up';

    if (!session && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('./(tabs)/index');
    }
  }, [session, segments, isPending, appIsReady]);

  // 6. Important: While loading, return NULL so the Splash Screen 
  // (which is native) stays on top of the screen.
  if (!appIsReady) {
    return null;
  }

  return (
    <LanguageProvider>
      <CartProvider>
         <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ title: 'CHECKOUT' }} /> 
          <Stack.Screen name="(auth)/sign-in"  />
          <Stack.Screen name="(auth)/sign-up"/>
          <Stack.Screen name="product/[id]" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="cart" options={{ headerShown: true, title: 'MY BAG' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
        <StatusBar style="dark" />
      </CartProvider>
    </LanguageProvider>
  );
}
