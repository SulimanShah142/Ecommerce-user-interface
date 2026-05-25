// lib/auth-client.ts -> Direct Custom Client Infrastructure Module
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const API_URL = "https://brand-gallery-backend.brand-gallery.workers.dev"; // Your active live production API link

let stateChangeListeners: Array<(session: any) => void> = [];
let currentCachedSession: any = null;

if (typeof window !== 'undefined') {
  SecureStore.getItemAsync('user_gallery_session').then((stored) => {
    if (stored) {
      currentCachedSession = JSON.parse(stored);
      stateChangeListeners.forEach(lnk => lnk(currentCachedSession));
    }
  }).catch(() => {});
}

export const authClient = {
  useSession: () => {
    const [session, setSession] = useState<any>(currentCachedSession);
    const [isPending, setIsPending] = useState(true);

    useEffect(() => {
      setSession(currentCachedSession);
      setIsPending(false);

      const updateCallback = (nextSession: any) => { setSession(nextSession); };
      stateChangeListeners.push(updateCallback);
      return () => { stateChangeListeners = stateChangeListeners.filter(lnk => lnk !== updateCallback); };
    }, []);

    return { data: session, isPending };
  },

  // 🎯 DIRECT SIGN-IN UTILITY FOR CODES FREE RE-FETCHES
  signInDirect: async (email: string) => {
    const res = await fetch(`${API_URL}/api/auth/sign-in/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Authentication login rejection.");
    }

    const payloadData = await res.json();
    currentCachedSession = payloadData.session;
    await SecureStore.setItemAsync('user_gallery_session', JSON.stringify(payloadData.session));
    stateChangeListeners.forEach(lnk => lnk(currentCachedSession));
    return payloadData;
  },

  // 🎯 DIRECT SIGN-UP UTILITY FOR CODES FREE REGISTRATIONS
  signUpDirect: async (email: string, name: string, phone: string) => {
    const res = await fetch(`${API_URL}/api/auth/sign-up/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, phone })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Registration checkpoint rejection.");
    }

    const payloadData = await res.json();
    currentCachedSession = payloadData.session;
    await SecureStore.setItemAsync('user_gallery_session', JSON.stringify(payloadData.session));
    stateChangeListeners.forEach(lnk => lnk(currentCachedSession));
    return payloadData;
  },

  signOut: async () => {
    currentCachedSession = null;
    await SecureStore.deleteItemAsync('user_gallery_session');
    stateChangeListeners.forEach(lnk => lnk(null));
  }
};
