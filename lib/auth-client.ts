import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    // 1. Point to your active Wrangler / Hono Worker address
    baseURL: "http://192.168.1.4:8787", 

    // 2. FIXED: Custom headers must live inside fetchOptions
    fetchOptions: {
        headers: {
            "Origin": "userapp://" 
        }
    },

    // 3. PERSISTENT MEMORY LAYER (KEEPS USER LOGGED IN)
    storage: {
        async getItem(key) {
            try {
                return await SecureStore.getItemAsync(key);
            } catch (e) {
                return null;
            }
        },
        async setItem(key, value) {
            try {
                await SecureStore.setItemAsync(key, value);
            } catch (e) {
                console.error("Storage write failure:", e);
            }
        },
        async removeItem(key) {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (e) {
                console.error("Storage delete failure:", e);
            }
        }
    }
});
