import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    // 1. Point to your active Wrangler / Hono Worker address
    baseURL: "http://192.168.1.3:8787", 

    // 2. FIXED: Custom headers must live inside fetchOptions
    fetchOptions: {
        headers: {
            "Origin": "userapp://" 
        }
    },

    // 3. PERSISTENT MEMORY LAYER (KEEPS USER LOGGED IN)
    storage: {
        async getItem(key : any) {
            try {
                return await SecureStore.getItemAsync(key);
            } catch (e) {
                return null;
            }
        },
        async setItem(key : any, value: any) {
            try {
                await SecureStore.setItemAsync(key, value);
            } catch (e) {
                console.error("Storage write failure:", e);
            }
        },
        async removeItem(key : any) {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (e) {
                console.error("Storage delete failure:", e);
            }
        }
    }
});
