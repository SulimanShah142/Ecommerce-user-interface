import { OneSignal, LogLevel } from 'react-native-onesignal';
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID ="1e89f5fe-bc90-4462-b4ab-f03a3e561c8d"

export const initOneSignal = async () => {
  try {
    // 1. Initialize with your specific App ID
    OneSignal.initialize("1e89f5fe-bc90-4462-b4ab-f03a3e561c8d");

    // 2. CRITICAL FIX FOR ANDROID 13+: Explicitly force OneSignal to handle the permission prompt
    if (Platform.OS === 'android') {
      console.log("🛰️ Triggering Native OneSignal Android Permission Prompt...");
      
      // This forces the OneSignal SDK to register the user's click directly
      const accepted = await OneSignal.Notifications.requestPermission(true);
      console.log("🔔 OneSignal Permission State Checked:", accepted);
    } else {
      // iOS handling
      OneSignal.Notifications.requestPermission(true);
    }

    // 3. Capture and log the structural Subscription ID
    const subId = await OneSignal.User.pushSubscription.getIdAsync();
    console.log("🔑 Active Linked Hardware ID:", subId);

  } catch (error) {
    console.error("❌ OneSignal Native Boot Failure:", error);
  }
};
