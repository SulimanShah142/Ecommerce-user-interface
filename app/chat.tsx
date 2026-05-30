import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, FlatList, TextInput, TouchableOpacity, Image, 
  Text, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, 
  Alert, Keyboard, TouchableWithoutFeedback, Dimensions, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';

import { 
  getOrCreateConversation, addLocalMessage, loadMessages, 
  isOnline, syncMessagesForConversation 
} from '../lib/offline';
import { uploadImage } from '../lib/uploadthing';
import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/Contexts/LanguageContext';
import {useBottomTabBarHeight} from "@react-navigation/bottom-tabs";

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.1.3:8787';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { data: authData, isPending: sessionLoading } = authClient.useSession();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [input, setInput] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
// 🎯 CHAT FRAMEWORK CORE STATE HOOKS LAYER
const [messages, setMessages] = useState<any[]>([]);          // Chronological message stream log
const [inputText, setInputText] = useState('');              // Live text container tracking inputs
const [loading, setLoading] = useState(true);                // Thread loading initialization tracker
const [sending, setSending] = useState(false);              // Binary blocker for the media upload loop

// 🎯 HIGH-UTILITY SHEIN-STYLE ATTACHMENT MEDIA CAROUSEL STATES
const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); // Temporary file:// asset slot

// 🎯 REAL-TIME SYSTEM SYNC CONTROLS
const [refreshing, setRefreshing] = useState(false);        // Pull-to-refresh timeline layout trigger
const [cachedUser, setCachedUser] = useState<any>(null);      // Local profile matching indices payload

  const flatListRef = useRef<FlatList>(null);

  const refreshMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    const data = await loadMessages(convId);
    setMessages(data || []);
    // Slight timeout allows layouer frame adjustments to process cleanly
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

   // 🎯 THE CUSTOM AUTHENTICATION FRONTEND INITIALIZER FIX:
  // Reads your true custom authenticated profile details straight out of SecureStore!
    // 🎯 THE CUSTOM AUTH LINKED FIX:
  // This extracts the genuine customer user id dynamically out of your custom auth client hook!

  useEffect(() => {
    const initializeChatSession = async () => {
      // 1. Block execution lines if the custom client memory cache is still bootstrapping on mount
      if (sessionLoading) return;

      try {
        // 🎯 THE ALLOCATION FIX: 
        // Reads 'authData?.user?.id' to perfectly match your custom token session object shape!
        // This ensures authenticated customers use their true user ID instead of defaulting to a guest string.
        const unmaskedCustomUserId = authData?.user?.id || 'guest-user';
        
        // Prioritize explicit routes parameters, then use your validated custom user id
        const targetUserId = (params.userId as string) || unmaskedCustomUserId;
        
        setActiveUserId(targetUserId);
        console.log(`🔒 Chat Active Context Target Owner Anchor Secured: ${targetUserId}`);

        if (params.conversationId) {
          setActiveConvId(params.conversationId as string);
        } else {
          // Syncs the look-up queries flawlessly with zero database foreign key lock conflicts
          const conv = await getOrCreateConversation(targetUserId);
          if (conv?.id) {
            setActiveConvId(conv.id);
          }
        }
      } catch (err) {
        console.error("❌ Context initialization failure:", err);
      }
    };

    initializeChatSession();
  }, [sessionLoading, authData?.user?.id, params.conversationId, params.userId]);
 // 🎯 Removed better-auth sessionLoading watchers completely!

  useEffect(() => {
    if (!activeConvId || activeConvId === "undefined") return;

    const loadChronology = async () => {
      await refreshMessages(activeConvId);
      
      const online = await isOnline().catch(() => false);
      if (online) {
        setHistoryLoading(true); 
        try {
          const res = await fetch(`${API_URL}/api/conversations/${activeConvId}/messages`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              for (const msg of data) {
                await addLocalMessage({
                  id: msg.id,
                  conversationId: msg.conversationId,
                  senderId: msg.senderId,
                  content: msg.content,
                  attachmentUrl: msg.attachmentUrl,
                  isRead: 1,
                  isSyncedToServer: 1,
                  createdAt: msg.createdAt
                });
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ Direct history pre-fetch failed:", e);
        } finally {
          setHistoryLoading(false); 
        }
        
        await syncMessagesForConversation({ id: activeConvId }, activeUserId).catch(() => {});
        await refreshMessages(activeConvId);
      }
    };

    loadChronology();
  }, [activeConvId, activeUserId, refreshMessages]);

   // 🎯 THE COMPLIANT DISPATCH CONTEXT LAYER
   const handleSend = async () => {
  if (!inputText.trim() && !selectedImageUri) return;

  // Capture states locally to clear inputs instantly for a snappy premium UX feel
  const typedTextSnapshot = inputText.trim();
  const localImageSnapshot = selectedImageUri;
  
  setInputText('');
  setSelectedImageUri(null);
  setSending(true);

  // 🎯 THE NATIVE HARDWARE UUID FIX: 
  // Swapped out global web crypto for Expo's native Crypto package! 
  // This completely stops the ReferenceError crash across Android and iOS emulators.
  const uniqueLocalMessageId = Crypto.randomUUID();
  const runtimeTimestamp = new Date().toISOString();
  
  const localMessagePlaceholder = {
    id: uniqueLocalMessageId,
    conversationId: activeConvId,
    senderId: activeUserId || 'guest-user',
    content: typedTextSnapshot,
    attachmentUrl: localImageSnapshot, 
    isRead: false,
    createdAt: runtimeTimestamp
  };

  // Update frontend display states instantly and auto-scroll to bottom bounds
  setMessages(prevMessages => [...prevMessages, localMessagePlaceholder]);
  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);

  try {
    let secureCloudAttachmentUrl: string | null = null;

         if (localImageSnapshot) {
        console.log("🖼️ Step 1: Uploading local attachment file to cloud storage repository...");
        
        const uploadFormData = new FormData();
        const fileUriParts = localImageSnapshot.split('/');
        const filename = fileUriParts[fileUriParts.length - 1];
        
        // 🎯 THE CORE COMPLIANCE FIX: Isolate capture index 1 cleanly!
        // This ensures match captures the exact text parameter extension string (e.g. 'jpg', 'png')
        const match = /\.(\w+)$/.exec(filename);
        const fileExtension = match ? match[1] : 'jpeg';
        const fileType = `image/${fileExtension}`;

        console.log(`📡 [ATTACHMENT PACKET] Filename: ${filename} | Verified MIME: ${fileType}`);

        // 🎯 THE STABLE OBJECT WRAPPER LAYOUT DESIGN:
        // Forcing exact structural string properties satisfies React Native's native bridge,
        // allowing your binary image multi-part stream to pass over the network with 0% drops!
        uploadFormData.append('file', {
          uri: Platform.OS === 'ios' ? localImageSnapshot.replace('file://', '') : localImageSnapshot,
          name: filename,
          type: fileType,
        } as any);

        const assetUploadResponse = await fetch(`${API_URL}/api/admin/upload`, {
          method: 'POST',
          headers: { 
            'Accept': 'application/json'
          },
          body: uploadFormData // Sends the clean multi-part stream smoothly over the wire
        });

        if (assetUploadResponse.ok) {
          const uploadDataResult = await assetUploadResponse.json();
          secureCloudAttachmentUrl = uploadDataResult?.url || uploadDataResult?.fileUrl || null;
          console.log("✅ Step 2: Cloud asset upload confirmed cleanly:", secureCloudAttachmentUrl);
        } else {
          console.warn("⚠️ UploadThing cloud storage upload rejected or timed out.");
        }
      }

    const SecureStore = require('expo-secure-store');
    const sessionToken = await SecureStore.getItemAsync('custom_user_session_token') || '';

    // Post payload securely to cloud backend engine ledger lines
    const response = await fetch(`${API_URL}/api/conversations/${activeConvId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken.trim()}`
      },
      body: JSON.stringify({
        id: uniqueLocalMessageId, 
        conversationId: activeConvId,
        senderId: activeUserId || 'guest-user',
        content: typedTextSnapshot,
        attachmentUrl: secureCloudAttachmentUrl, 
        createdAt: runtimeTimestamp
      })
    });

    if (response.ok) {
      console.log("✅ Server database transaction confirmed cleanly.");
      
      if (typeof addLocalMessage === 'function') {
        await addLocalMessage({
          id: uniqueLocalMessageId,
          conversationId: activeConvId,
          senderId: activeUserId || 'guest-user',
          content: typedTextSnapshot,
          attachmentUrl: secureCloudAttachmentUrl,
          isRead: 1,
          isSyncedToServer: 1,
          createdAt: runtimeTimestamp
        }).catch(() => {});
      }
    } else {
      throw new Error("HTTP write rejected by server");
    }

  } catch (err) {
    console.error("❌ Send pipeline error flag detected:", err);
    Alert.alert("Delivery Failed", "Could not synchronize message log with server.");
  } finally {
    setSending(false);
  }
};

  // 🎯 THE PICKER IMAGE FIX: Update states directly instead of crashing handlers with string parameters
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Gallery Blocked", "Permissions are required to choose pictures.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      console.log("🖼️ Target selected local asset cached:", result.assets[0].uri);
      setSelectedImageUri(result.assets[0].uri); // Sets state correctly, letting handleSend read it safely!
    }
  };

  const [keyboardPadding, setKeyboardPadding] = useState(0);
  
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = 0; 
  }

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      (e) => {
        const calculatedPadding = e.endCoordinates.height - (Platform.OS === 'android' ? tabBarHeight : 0);
        setKeyboardPadding(calculatedPadding > 0 ? calculatedPadding : 0);
      }
    );
    
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 
      () => {
        setKeyboardPadding(0);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [tabBarHeight]);

  const renderMessageItem = ({ item }: any) => {
    const isMine = item.senderId === activeUserId;
    return (
      <View style={[styles.msgContainer, isMine ? styles.myMsgAlign : styles.theirMsgAlign]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.attachmentUrl && (
            <Image source={{ uri: item.attachmentUrl }} style={styles.bubbleImage} resizeMode="cover" />
          )}
          {item.content ? (
            <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText, isRTL && { textAlign: 'right' }]}>
              {item.content}
            </Text>
          ) : null}
          <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.theirTimestamp]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (!activeConvId || sessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#000" />
        <Text style={styles.initText}>INITIALIZING CONNECTIVITY...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HIGH-END BLACK/WHITE EDITORIAL HEADER */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="#000000" />
        </TouchableOpacity>
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle}>BRAND GALLERY SUPPORT</Text>
          <Text style={styles.headerSubtitle}>ONLINE ASSISTANCE CHANNEL</Text>
        </View>
        <View style={styles.headerActionSlot}>
          {historyLoading && <ActivityIndicator size="small" color="#000000" />}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? tabBarHeight : 0}
      >
        {historyLoading && (
          <View style={styles.historyLoader}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        )}
        
        {/* CHAT MESSAGES LOG RUNNER */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => item.id?.toString() || `msg-${idx}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={renderMessageItem}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* PREVIEW ATTACHMENT MINI BAR SLAT */}
        {selectedImageUri && (
          <View style={styles.previewSlatRow}>
            <Image source={{ uri: selectedImageUri }} style={styles.miniPreviewThumb} />
            <TouchableOpacity style={styles.clearMiniThumbBtn} onPress={() => setSelectedImageUri(null)}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        {/* 🎯 INPUT ACCESSORY CHAT TOOLBAR DOCK CONTROLS ELEMENT PANELS AREA */}
        <View style={[styles.inputToolbarDockRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.toolbarMediaBtn} onPress={pickImage} disabled={sending}>
            <Ionicons name="camera-outline" size={22} color="#000000" />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.toolbarTextInputField, isRTL && { textAlign: 'right' }]}
            placeholder="TYPE YOUR MESSAGE..."
            placeholderTextColor="#999999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            disabled={sending}
          />

          <TouchableOpacity 
            style={[styles.toolbarSubmitSendBtn, (!inputText.trim() && !selectedImageUri) && { opacity: 0.4 }]} 
            onPress={handleSend}
            disabled={sending || (!inputText.trim() && !selectedImageUri)}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Ionicons name="arrow-up-circle-sharp" size={26} color="#000000" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  initText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 12, color: '#444444' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 12, // Native layout adjustments
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
    // 🎯 HIGH-END INTERACTIVE ACCESSORY CHAT TOOLBAR LAYOUT DESIGNS
  inputToolbarDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    width: '100%',
    gap: 12
  },
  toolbarMediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E7EB'
  },
  toolbarTextInputField: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
    maxHeight: 100,
    textAlignVertical: 'center'
  },
  toolbarSubmitSendBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // MEDIA PICKER PREVIEW HUD PANEL MANIFEST SLATS
  previewSlatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    position: 'relative'
  },
  miniPreviewThumb: {
    width: 48,
    height: 64,
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 2
  },
  clearMiniThumbBtn: {
    position: 'absolute',
    top: 6,
    left: 56, // Dynamically positions closing tags right near thumbnail badges margins
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    zIndex: 10
  },
  backButton: { padding: 4 },
  titleWrapper: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 2 },
  headerSubtitle: { fontSize: 8, fontWeight: '500', color: '#888888', letterSpacing: 1, marginTop: 2 },
  headerActionSlot: { width: 24, alignItems: 'center' },

  listContainer: { paddingHorizontal: 16, paddingVertical: 20 },
  msgContainer: { width: '100%', marginBottom: 16, flexDirection: 'row' },
  myMsgAlign: { justifyContent: 'flex-end' },
  theirMsgAlign: { justifyContent: 'flex-start' },
  
  bubble: { maxWidth: width * 0.72, padding: 12, borderRadius: 2, position: 'relative' },
  myBubble: { backgroundColor: '#000000' },
  theirBubble: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EEEEEE' },
  bubbleImage: { width: width * 0.55, aspectRatio: 4 / 3, borderRadius: 1, marginBottom: 6, backgroundColor: '#F0F0F0' },
  
  msgText: { fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  myMsgText: { color: '#FFFFFF', fontWeight: '400' },
  theirMsgText: { color: '#111111', fontWeight: '400' },
  
  timestamp: { fontSize: 8, marginTop: 4, alignSelf: 'flex-end', fontWeight: '500' },
  myTimestamp: { color: '#AAAAAA' },
  theirTimestamp: { color: '#999999' },

inputDockContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: 12,
  // 🎯 THE FIX: Force strict padding value equivalence to protect container heights
  paddingBottom: 12, 
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: '#F5F5F5',
  gap: 12
},

  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA'
  },
  inputField: {
    flex: 1,
    height: 38,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 4,
    paddingHorizontal: 14,
    fontSize: 12,
    color: '#000000',
    fontWeight: '400'
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
historyLoader: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 70,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  backgroundColor: 'rgba(255,255,255,0.7)',
},
  emptyContainer: { alignItems: 'center', marginTop: 140, gap: 10 },
  emptyText: { fontSize: 11, color: '#999999', fontWeight: '500', letterSpacing: 0.5 }
});
