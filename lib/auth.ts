import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins"; 
import { db } from "./db";
import * as sharedSchema from "@project/shared";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...sharedSchema,
            user: sharedSchema.user,
            session: sharedSchema.session,
            account: sharedSchema.account,
            verification: sharedSchema.verification,
        }
    }),
    emailAndPassword: { enabled: true },
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        "userapp://", 
        "exp://", 
        "http://192.168.1.3:8787",
    ],
    // server/auth.ts
plugins: [
    emailOTP({
        async sendVerificationOTP({ email, otp, type }, request) {
            const subscriptionId = request?.headers.get("x-onesignal-id");

            if (subscriptionId) {
                // SEND TO ONESIGNAL (The Push Notification OTP)
                await fetch("https://onesignal.com/api/v1/notifications", {
                    method: "POST",
                    headers: {
                        "Authorization": `Basic ${process.env.USER_ONESIGNAL_KEY}`,
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    body: JSON.stringify({
                        app_id: process.env.USER_ONESIGNAL_ID,
                        include_subscription_ids: [subscriptionId],
                        headings: { en: "SHEIN Login Code" },
                        contents: { en: `Your secure code is: ${otp}` },
                        priority: 10
                    })
                });
            } else {
                console.log(`Fallback (No Push ID): OTP for ${email} is ${otp}`);
            }
        },
    }),
],
})