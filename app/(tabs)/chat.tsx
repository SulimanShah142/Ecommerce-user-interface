import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, FlatList, TextInput, TouchableOpacity, Image, 
  Text, StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, 
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io, Socket } from "socket.io-client";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { 
  getOrCreateConversation, addLocalMessage, loadMessages, 
  isOnline, syncMessagesForConversation 
} from '../../lib/offline';
import { uploadImage } from '../../lib/uploadthing';
import { authClient } from '@/lib/auth-client';

const API_URL = 'http://192.168.1.3:8787';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Core Layout State
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // 1. Memoized SQLite Local Reader
  const refreshMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    const data = await loadMessages(convId);
    setMessages(data || []);
    // Guard tracking anchor to push interface lower down nicely
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // 2. CONVERSATION SYNC GATEWAY
  useEffect(() => {
    if (sessionLoading) return;

    const initializeChatSession = async () => {
      try {
        const targetUserId = (params.userId as string) || session?.user?.id || 'guest-user';
        setActiveUserId(targetUserId);

        if (params.conversationId) {
          setActiveConvId(params.conversationId as string);
        } else {
          console.log("🛠️ Requesting conversational identity matrix for:", targetUserId);
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

  // 3. SECURE RE-RENDER IMMUNE SOCKET CONNECTION
  useEffect(() => {
    if (!activeConvId) return;

    if (!socketRef.current) {
      console.log("🛰️ Setting up active message processing stream wrapper:", activeConvId);
      
      const socket = io(API_URL, { 
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 25
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("🟢 User app linked into core room index:", activeConvId);
        socket.emit("join_room", activeConvId);
      });

      socket.on("receive_message", async (msg) => {
        if (msg.senderId === activeUserId) return;

        let localPath = msg.attachmentUrl;
        if (msg.attachmentUrl) {
          localPath = await downloadChatImage(msg.attachmentUrl, msg.id);
        }
        
        // FIXED: Enforce absolute database column compatibility schema property binding mapping
        await addLocalMessage({ 
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          content: msg.content,
          attachmentUrl: localPath, 
          isRead: 1, 
          isSyncedToServer: 1,
          createdAt: msg.createdAt
        });
        refreshMessages(activeConvId);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔴 Stream boundary lost connection. Reason:", reason);
      });
    } else {
      if (socketRef.current.connected) {
        socketRef.current.emit("join_room", activeConvId);
      }
    }

      // Load initial table contents sequentially
    const loadChronology = async () => {
      // CRITICAL GUARD: Stop immediately if the ID hasn't initialized yet
      if (!activeConvId || activeConvId === "undefined") {
        console.log("⏳ Delaying API fetch: activeConvId is not ready yet.");
        return;
      }

      await refreshMessages(activeConvId);
      const online = await isOnline().catch(() => false);
      
      if (online) {
        try {
          console.log(`📡 Fetching history safely for room: ${activeConvId}`);
          const res = await fetch(`${API_URL}/api/conversations/${activeConvId}/messages`);
          
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
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
          console.warn("Direct history pre-fetch failed, using backup sync block", e);
        }
        
        await syncMessagesForConversation({ id: activeConvId }, activeUserId).catch(() => {});
        await refreshMessages(activeConvId);
      }
    };

    loadChronology();


    return () => {
      socketRef.current?.off("receive_message");
    };
  }, [activeConvId, activeUserId, refreshMessages]);

  // 4. MESSAGE EMISSION LIFECYCLE
  const handleSend = async (imageUri?: string) => {
    if (!activeConvId || (!input.trim() && !imageUri)) return;

    if (!socketRef.current?.connected) {
      socketRef.current?.connect();
    }

    setIsSending(true);
    const messageId = Crypto.randomUUID();

    const msgData = {
      id: messageId,
      conversationId: activeConvId,
      senderId: activeUserId || 'guest-user',
      content: input.trim(),
      attachmentUrl: null as string | null,
      createdAt: new Date().toISOString(),
    };

    try {
      if (imageUri) {
        msgData.attachmentUrl = await uploadImage(imageUri);
      }

      // Safe immediate storage transaction mapping
      await addLocalMessage({
        id: msgData.id,
        conversationId: msgData.conversationId,
        senderId: msgData.senderId,
        content: msgData.content,
        attachmentUrl: imageUri || null, // Render local disk string preview instantly
        isRead: 1,
        isSyncedToServer: 0,
        createdAt: msgData.createdAt
      });

      await refreshMessages(activeConvId);
      setInput("");

      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", msgData);
      } else {
        // Fallback network router boundary if user app experiences a cellular data drop out
        await fetch(`${API_URL}/api/conversations/${activeConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msgData),
        });
      }
    } catch (err) {
      console.error("❌ Send pipeline dropped data:", err);
      Alert.alert("Network Failure", "Failed to transfer message block to server container.");
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
      aspect: [4, 3],
      quality: 0.4,
    });

    if (!result.canceled) {
      handleSend(result.assets[0].uri);
    }
  };

  const downloadChatImage = async (remoteUrl: string, msgId: string) => {
    try {
      const localUri = `${FileSystem.documentDirectory}chat_img_${msgId}.jpg`;
      const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
      return uri;
    } catch (e) {
      return remoteUrl;
    }
  };

  if (!activeConvId || sessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.initText}>SECURE DIALOG BRIDGE INITIALIZING...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* BRANDING HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BRAND GALLERY LIVE SUPPORT</Text>
      </View>

      {/* STREAM LIST AREA */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMine = item.senderId === activeUserId;
          return (
            <View style={[styles.msgBox, isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                {item.attachmentUrl && (
                  <Image source={{ uri: item.attachmentUrl }} style={styles.chatImg} resizeMode="cover" />
                )}
                {item.content ? (
                  <Text style={isMine ? styles.myText : styles.theirText}>{item.content}</Text>
                ) : null}
              </View>
              <Text style={styles.timeText}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No messages yet. Send a note to connect with the team.</Text>
        }
      />

      {/* BOTTOM COMPOSER */}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
          <Ionicons name="add-circle-outline" size={26} color="#000" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="TYPE RESPONSE..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity 
          onPress={() => handleSend()} 
          style={styles.sendBtn}
          disabled={!input.trim() || isSending}
        >
          {isSending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.sendText}>SEND</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  initText: { marginTop: 15, fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#BBB' },
  header: { paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', alignItems: 'center', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: '#000' },
  list: { padding: 16 },
  msgBox: { marginBottom: 15, width: '100%' },
  bubble: { paddingVertical: 12, paddingHorizontal: 16, maxWidth: '78%', borderRadius: 4 },
  myBubble: { backgroundColor: '#000' },
  theirBubble: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  myText: { color: '#FFF', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  theirText: { color: '#000', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  chatImg: { width: 220, height: 160, marginBottom: 6, borderRadius: 2 },
  timeText: { fontSize: 9, color: '#BBB', marginTop: 5, fontWeight: '700', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1, borderTopColor: '#F2F2F2', backgroundColor: '#FFF' },
  attachBtn: { marginRight: 12 },
  input: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 15, paddingVertical: 10, fontSize: 13, maxHeight: 80, color: '#000', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 4 },
  sendBtn: { marginLeft: 15, paddingVertical: 10 },
  sendText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: '#000' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#CCC', fontSize: 12, letterSpacing: 0.5, lineHeight: 18 }
});
