// lib/auth-client.ts

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  "https://brand-gallery-backend.brand-gallery.workers.dev";

// CENTRAL MEMORY CACHE
let cachedSession: any = null;

let listeners: Array<
  (session: any) => void
> = [];

// SAFE NOTIFY
const emitSession = (
  nextSession: any
) => {
  cachedSession = nextSession;

  listeners.forEach((listener) => {
    listener(nextSession);
  });
};

// BUILD COMPATIBLE SESSION SHAPE
const buildSessionShape = (
  token: string,
  user: any
) => {
  return {
    session: {
      token
    },

    user
  };
};

// INITIAL BOOTSTRAP
const bootstrapSession =
  async () => {
    try {
      const token =
        await SecureStore.getItemAsync(
          'custom_user_session_token'
        );

      const userString =
        await SecureStore.getItemAsync(
          'cached_user_profile'
        );

      if (
        !token ||
        !userString
      ) {
        cachedSession = null;
        return;
      }

      const parsedUser =
        JSON.parse(userString);

      cachedSession =
        buildSessionShape(
          token,
          parsedUser
        );

    } catch {
      cachedSession = null;
    }
  };

// BOOT ON IMPORT
bootstrapSession();

export const authClient = {

  // REACT SESSION HOOK
  useSession: () => {
    const [data, setData] =
      useState(cachedSession);

    const [isPending, setIsPending] =
      useState(true);

    useEffect(() => {
      setData(cachedSession);

      setIsPending(false);

      const listener = (
        nextSession: any
      ) => {
        setData(nextSession);
      };

      listeners.push(listener);

      return () => {
        listeners =
          listeners.filter(
            (x) => x !== listener
          );
      };
    }, []);

    return {
      data,
      isPending
    };
  },

  // SESSION REFRESH
  refreshSession: async () => {
    try {
      const token =
        await SecureStore.getItemAsync(
          'custom_user_session_token'
        );

      if (!token) {
        emitSession(null);
        return null;
      }

      const res = await fetch(
        `${API_URL}/api/user/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token.trim()}`
          }
        }
      );

      const data =
        await res.json();

      if (
        !res.ok ||
        !data?.user
      ) {
        await SecureStore.deleteItemAsync(
          'custom_user_session_token'
        );

        await SecureStore.deleteItemAsync(
          'cached_user_profile'
        );

        emitSession(null);

        return null;
      }

      await SecureStore.setItemAsync(
        'cached_user_profile',
        JSON.stringify(data.user)
      );

      const nextSession =
        buildSessionShape(
          token,
          data.user
        );

      emitSession(nextSession);

      return nextSession;

    } catch {
      emitSession(null);
      return null;
    }
  },

  // DIRECT SIGN IN
  signInDirect: async (
    email: string,
    password: string
  ) => {

    const res = await fetch(
      `${API_URL}/api/auth/sign-in/direct`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data =
      await res.json();

    if (
      !res.ok ||
      !data?.session?.token
    ) {
      throw new Error(
        data?.error ||
        'Authentication failed'
      );
    }

    await SecureStore.setItemAsync(
      'custom_user_session_token',
      data.session.token
    );

    await SecureStore.setItemAsync(
      'cached_user_profile',
      JSON.stringify(
        data.session.user
      )
    );

    const nextSession =
      buildSessionShape(
        data.session.token,
        data.session.user
      );

    emitSession(nextSession);

    return data;
  },

  // DIRECT SIGN UP
  signUpDirect: async ({
    email,
    password,
    name,
    phone
  }: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {

    const res = await fetch(
      `${API_URL}/api/auth/sign-up/direct`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          email,
          password,
          name,
          phone
        })
      }
    );

    const data =
      await res.json();

    if (
      !res.ok ||
      !data?.session?.token
    ) {
      throw new Error(
        data?.error ||
        'Registration failed'
      );
    }

    await SecureStore.setItemAsync(
      'custom_user_session_token',
      data.session.token
    );

    await SecureStore.setItemAsync(
      'cached_user_profile',
      JSON.stringify(
        data.session.user
      )
    );

    const nextSession =
      buildSessionShape(
        data.session.token,
        data.session.user
      );

    emitSession(nextSession);

    return data;
  },

  // SIGN OUT
  signOut: async () => {

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
              Authorization:
                `Bearer ${token}`
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

    emitSession(null);
  }
};