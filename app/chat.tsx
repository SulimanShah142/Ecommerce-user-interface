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

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.1.3:8787';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const refreshMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    const data = await loadMessages(convId);
    setMessages(data || []);
    // Slight timeout allows layouer frame adjustments to process cleanly
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;

    const initializeChatSession = async () => {
      try {
        const targetUserId = (params.userId as string) || session?.user?.id || 'guest-user';
        setActiveUserId(targetUserId);

        if (params.conversationId) {
          setActiveConvId(params.conversationId as string);
        } else {
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
  }, [sessionLoading, session?.user?.id, params.conversationId, params.userId]);

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

  const handleSend = async (imageUri?: string) => {
    if (!activeConvId || (!input.trim() && !imageUri)) return;

    setIsSending(true);
    const messageId = Crypto.randomUUID();
    const currentInput = input.trim();
    setInput(""); 

    const msgData = {
      id: messageId,
      conversationId: activeConvId,
      senderId: activeUserId || 'guest-user',
      content: currentInput,
      attachmentUrl: null as string | null,
      createdAt: new Date().toISOString(),
    };

    try {
      if (imageUri) {
        msgData.attachmentUrl = await uploadImage(imageUri);
      }

      await addLocalMessage({
        id: msgData.id,
        conversationId: msgData.conversationId,
        senderId: msgData.senderId,
        content: msgData.content,
        attachmentUrl: imageUri || null, 
        isRead: 1,
        isSyncedToServer: 0,
        createdAt: msgData.createdAt
      });

      await refreshMessages(activeConvId);

      const res = await fetch(`${API_URL}/api/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData),
      });

      if (!res.ok) throw new Error("HTTP write rejected by server");

    } catch (err) {
      console.error("❌ Send pipeline error flag detected:", err);
      Alert.alert("Saved", "Message saved locally. It will sync once connection stabilizes.");
    } finally {
      setIsSending(false);
    }
  };

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
      handleSend(result.assets[0].uri);
    }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
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
    // 🎯 FIX 1: Use safe-area wrappers inside container frames to establish boundaries
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        // 🎯 FIX 2: Android handles keyboard natively using windowTranslucent adjustments, iOS requires precise padding calculations
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // 🎯 FIX 3: Dynamic vertical offset matching navigation header depth
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            
            {/* HIGH-END BLACK/WHITE EDITORIAL HEADER */}
            <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color="#000000" />
              </TouchableOpacity>
              <View style={styles.titleWrapper}>
                <Text style={styles.headerTitle}>BRAND GALLERY SUPPORT</Text>
                <Text style={styles.headerSubtitle}>ONLINE ASSISTANCE CHANNEL</Text>
              </View>
              <View style={styles.headerActionSlot}>
                {historyLoading && <ActivityIndicator size="small" color="#000000" />}
              </View>
            </View>

            {/* CHAT MESSAGES LOG RUNNER */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id?.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              renderItem={renderMessageItem}
              // 🎯 FIX 4: Ensure touches inside list register immediately and don't conflict with keyboard dismiss
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color="#CCCCCC" />
                  <Text style={styles.emptyText}>Start a dialogue with our styling desk.</Text>
                </View>
              )}
            />

            {/* FLOATING TEXT INPUT DOCK COMPONENT */}
            <View style={[styles.inputDockContainer, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={20} color="#000000" />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.inputField, isRTL && { textAlign: 'right' }]}
                placeholder={t('typeMessage') || "Type your inquiry..."}
                placeholderTextColor="#999999"
                value={input}
                onChangeText={setInput}
                multiline={false}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />

              <TouchableOpacity 
                style={[styles.sendBtn, !input.trim() && { opacity: 0.3 }]} 
                onPress={() => handleSend()}
                disabled={!input.trim() || isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

          </View>
        </TouchableWithoutFeedback>
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
    // 🎯 FIX 5: Normalizes standard screen edge spacings when keyboard is dropped
    paddingBottom: Platform.OS === 'ios' ? 14 : 14, 
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

  emptyContainer: { alignItems: 'center', marginTop: 140, gap: 10 },
  emptyText: { fontSize: 11, color: '#999999', fontWeight: '500', letterSpacing: 0.5 }
});
