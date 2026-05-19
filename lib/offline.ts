import * as SQLite from 'expo-sqlite'; // NO /legacy
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto'; 
import * as FileSystem from 'expo-file-system/legacy';
const DATABASE_NAME = 'ecommerce-offline.db';
const API_URL = "http://192.168.1.3:8787";



let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Helper to open connection
async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('ecommerce-admin.db');
  return db;
}

export async function initOfflineDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await getDatabase();
    try {
      // 1. Set journal mode (Must be outside transaction)
      await database.execAsync('PRAGMA journal_mode = WAL;');

      // 2. Execute Table Creation in an Exclusive Transaction
      await database.withExclusiveTransactionAsync(async () => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id TEXT PRIMARY KEY NOT NULL,
            usdToAfnRate REAL DEFAULT 65.0,
            profitPercentage REAL DEFAULT 20.0,
            newUserDiscountActive INTEGER DEFAULT 0,
            newUserDiscountType TEXT,
            newUserDiscountValue REAL,
            discountDurationHours INTEGER DEFAULT 24
          );

          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            imageUrl TEXT,
            parentId TEXT,
            isActive INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY NOT NULL,
            categoryId TEXT,
            name TEXT NOT NULL,
            usdPrice REAL NOT NULL,
            imageUrl TEXT,
            availableSizes TEXT,
            availableColors TEXT
          );

          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY NOT NULL,
            userId TEXT NOT NULL,
            customerName TEXT NOT NULL,
            totalAmount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt TEXT
          );

          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY NOT NULL,
            userId TEXT NOT NULL,
            userName TEXT,
            lastMessage TEXT,
            lastMessageTime TEXT,
            status TEXT DEFAULT 'active',
            createdAt TEXT 
          );

          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY NOT NULL,
            conversationId TEXT NOT NULL,
            senderId TEXT NOT NULL,
            content TEXT,
            attachmentUrl TEXT,
            isRead INTEGER DEFAULT 0,
             isSyncedToServer INTEGER DEFAULT 0,
            createdAt TEXT
          );
        `);
      }); // Fixed: Closed transaction correctly

      isInitialized = true;
      console.log("✅ Offline Tables Initialized and Ready");
    } catch (error) {
      console.error("❌ Offline DB Init Error:", error);
      initPromise = null; 
      throw error;
    }
  })(); // Fixed: Properly closed and invoked the async IIFE

  return initPromise;
}


// WRAPPER: Every data function MUST call this to ensure tables exist
async function ensureInit() {
  if (!isInitialized) {
    await initOfflineDb();
  }
  return await getDatabase();
}

export const addExpense = async (amount: number, description: string, category: string) => {
  const database = await ensureInit(); // Wait for tables!
  await database.runAsync(
    'INSERT INTO expenses (id, amount, description, category) VALUES (?, ?, ?, ?)',
    [Date.now().toString(), amount, description, category]
  );
};

export const getExpenses = async () => {
  const database = await ensureInit(); // Wait for tables!
  return await database.getAllAsync('SELECT * FROM expenses ORDER BY createdAt DESC');
};

// ... keep your other functions like syncCategories but wrap with ensureInit()

export async function saveAppSettings(settings: any) {
  const database = await getDatabase();
  // Ensure we are using the correct data types for SQLite (Numeric as Strings/Reals)
  await database.runAsync(
    `INSERT OR REPLACE INTO app_settings 
    (id, usdToAfnRate, profitPercentage, newUserDiscountActive, newUserDiscountType, newUserDiscountValue, discountDurationHours) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      '1', 
      (settings.usdToAfnRate || 68).toString(), 
      (settings.profitPercentage || 20).toString(),
      settings.newUserDiscountActive ? 1 : 0,
      settings.newUserDiscountType || 'percentage',
      (settings.newUserDiscountValue || 0).toString(),
      settings.discountDurationHours || 24
    ]
  );
  console.log("⚙️ Local Settings Updated");
}


export async function saveCategories(categories: any[]) {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    // 1. Wipe old categories to ensure consistency with server
    await database.runAsync('DELETE FROM categories');
    
    // 2. Insert fresh ones
    for (const cat of categories) {
      await database.runAsync(
        `INSERT INTO categories (id, name, description, imageUrl, parentId, isActive) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cat.id, cat.name, cat.description, cat.imageUrl, cat.parentId, cat.isActive ? 1 : 0]
      );
    }
  });
}

export async function syncCategories() {
  try {
    const online = await isOnline();
    if (!online) return null;

    const response = await fetch(`${API_URL}/api/admin/categories`);
    const remoteData = await response.json();

    if (Array.isArray(remoteData)) {
      await saveCategories(remoteData);
      console.log(`✅ Synced ${remoteData.length} categories`);
      return remoteData; // Return the array so caller can 'setCategories(remoteData)'
    }
    return [];
  } catch (error) {
    console.error("❌ syncCategories failed:", error);
    return null;
  }
}



/**
 * Saves a single message to the local SQLite database.
 * Used for instant UI feedback (Offline First) and incoming Socket messages.
 */
export async function addLocalMessage(message: any) {
  const database = await getDatabase();
  if (!database) return null;

  const safeConvId = message.conversationId || 'unknown_chat';
  const timestamp = message.createdAt || new Date().toISOString();

  try {
    await database.runAsync(
      `INSERT OR REPLACE INTO messages
       (id, conversationId, senderId, content, attachmentUrl, isRead, isSyncedToServer, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        message.id || `msg_${Date.now()}`,
        safeConvId,
        message.senderId,
        message.content || '',
        message.attachmentUrl || null,
        message.isRead ? 1 : 0,
        message.isSyncedToServer ? 1 : 0,
        timestamp
      ]
    );
    return message.id;
  } catch (error) {
    console.error("❌ SQLite Message Error:", error);
    throw error;
  }
}

export async function loadMessages(conversationId: string) {
  const database = await getDatabase();
  if (!database) return [];
  // Use strftime or simple string sort for ISO dates
  return await database.getAllAsync(
    'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
    [conversationId]
  );
}


/**
 * Loads all messages for a specific conversation from the local database.
 * Returns an array of message objects.
*/

export async function loadMyOrdersLocal(userId: string) {
  const database = await getDatabase();
  if (!database) return [];
  return await database.getAllAsync(
    'SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );
}

export async function saveMyOrders(ordersList: any[]) {
  const database = await getDatabase();
  if (!database || !ordersList.length) return;

  await database.withTransactionAsync(async () => {
    for (const order of ordersList) {
      await database.runAsync(
        `INSERT OR REPLACE INTO orders (id, userId, customerName, totalAmount, status, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order.id, order.userId, order.customerName, order.totalAmount, order.status, order.createdAt]
      );
    }
  });
}



export async function execSql(sql: string, params: any[] = []): Promise<any[]> {
  const database = await getDatabase();
  if (!database) return [];
  // Modern API returns the array directly
  return await database.getAllAsync(sql, params);
}

export async function saveProducts(products: any[]) {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM products');
    for (const p of products) {
      await database.runAsync(
        `INSERT INTO products (id, categoryId, name, usdPrice, imageUrl, availableSizes, availableColors) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, 
          p.categoryId, 
          p.name, 
          p.usdPrice.toString(), 
          p.imageUrl, 
          JSON.stringify(p.availableSizes || []), 
          JSON.stringify(p.availableColors || [])
        ]
      );
    }
  });
  console.log("📦 Fresh Product Catalog saved to SQLite");
}



export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    const connected = !!state.isConnected && (state.isInternetReachable ?? true);
    
    if (!connected) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); 
    
    try {
      const response = await fetch(`${API_URL}/api/categories`, { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  } catch (error) {
    return false;
  }
}

export async function fetchRemoteCategories() {
  try {
    console.log('📡 Fetching remote categories...');
    const response = await fetch(`${API_URL}/api/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch remote categories: ${response.status}`);
    }
    const data = await response.json();
    console.log(`✅ Fetched ${data.length} categories from server`);
    return data;
  } catch (error) {
    console.warn('❌ Remote categories fetch failed', error);
    return [];
  }
}

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}image-cache/`;

async function fetchRemoteProducts() {
  try {
    console.log('📡 Fetching remote products...');
    const response = await fetch(`${API_URL}/api/products`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    return data as any[];
  } catch (error) {
    console.warn('❌ Remote products fetch failed', error);
    return [];
  }
}

async function fetchRemoteProduct(id: string) {
  try {
    const response = await fetch(`${API_URL}/api/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.warn('Remote product fetch failed', error);
    return null;
  }
}

function safeFileName(url: string) {
  const sanitized = url.replace(/[^a-zA-Z0-9]/g, '_');
  return sanitized.length > 200 ? `${sanitized.slice(0, 200)}_${url.length}` : sanitized;
}

// Utility to ensure directory exists
async function ensureImageCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
  }
}

export async function getCachedImageUri(remoteUrl: string | undefined, fallbackUri = 'https://placehold.co/220?text=No+Image') {
  if (!remoteUrl || typeof remoteUrl !== 'string') return fallbackUri;

  try {
    await ensureImageCacheDir();
    const fileName = `${safeFileName(remoteUrl)}.jpg`;
    const localPath = `${IMAGE_CACHE_DIR}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);

    if (fileInfo.exists) return localPath;

    const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
    return downloadResult.uri;
  } catch (error) {
    console.warn('Image cache failed, using remote', error);
    return remoteUrl;
  }
}

export async function syncRemoteCatalog() {
  try {
    const online = await isOnline();
    if (!online) return false;

    // Fetch everything in parallel
    const [catRes, prodRes, setRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/categories`),
      fetch(`${API_URL}/api/products`), // or your specific endpoint
      fetch(`${API_URL}/api/admin/settings`)
    ]);

    const cats = await catRes.json();
    const prods = await prodRes.json();
    const settings = await setRes.json();

    if (Array.isArray(cats)) await saveCategories(cats);
    if (Array.isArray(prods)) await saveProducts(prods);
    if (settings) await saveAppSettings(settings);

    return true; // SUCCESS: Tell the UI to re-read SQLite
  } catch (e) {
    console.error("Sync Logic Failed", e);
    return false;
  }
}




export async function loadCategoriesLocal() {
  try {
    const data = await execSql('SELECT * FROM categories;');
    // In Legacy, the data is usually in 'rows._array'. 
    // In our new helper, we fixed it to return just the array.
    return data || []; 
  } catch (err) {
    console.error("Local load failed", err);
    return [];
  }
}

export async function loadCategoryLocal(id: string) {
  const online = await isOnline();
  if (online) {
    // Better to fetch specific category than whole list if possible
    const categories = await fetchRemoteCategories();
    const category = categories.find((item: any) => item.id === id) ?? null;
    if (category) {
      await saveCategories([category]);
      return category;
    }
  }

  const result = await execSql('SELECT * FROM categories WHERE id = ? LIMIT 1;', [id]);
  return result[0] ?? null;
}

export async function loadProductsLocal() {
  const online = await isOnline();
  if (online) {
    const products = await fetchRemoteProducts();
    if (products && products.length > 0) {
      await saveProducts(products);
      return products;
    }
  }

  console.log('📴 Loading products from local DB');
  const result = await execSql('SELECT * FROM products;');
  return result as any[];
}



// Add this at the top if not already defined for the message/convo functions
function randomId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function loadProductsByCategoryLocal(categoryId: string) {
  const database = await getDatabase();
  if (!database) return [];
  
  // Use a wildcard search if your category IDs are strings/UUIDs
  return await database.getAllAsync(
    'SELECT * FROM products WHERE categoryId = ?', 
    [categoryId]
  );
   const result = await execSql('SELECT * FROM products WHERE categoryId = ?;', [categoryId]);
  return result as any[];
}


  // Modern API: result is the array itself
 

export async function loadProductLocal(id: string) {
  const online = await isOnline();
  if (online) {
    const product = await fetchRemoteProduct(id);
    if (product) {
      await saveProducts([product]);
      return product;
    }
  }

  const result = await execSql('SELECT * FROM products WHERE id = ? LIMIT 1;', [id]);
  return (result as any[])[0] ?? null;
}


export async function getOrCreateConversation(userId: string) {
  const database = await getDatabase();
  const safeUserId = userId || 'offline-user';
  
  // 1. Check local SQLite first
  const existing = await database.getAllAsync(
    'SELECT * FROM conversations WHERE userId = ? LIMIT 1', 
    [safeUserId]
  );
  
  let conversation;
  if (existing && existing.length > 0) {
    conversation = existing[0];
  } else {
    // 2. Create new locally using a VALID UUID
    const id = Crypto.randomUUID(); // This produces a valid UUID for Postgres
    const newConv = { 
      id, 
      userId: safeUserId, 
      status: 'active', 
      createdAt: new Date().toISOString() 
    };
    
    await database.runAsync(
      'INSERT INTO conversations (id, userId, status, createdAt) VALUES (?, ?, ?, ?)',
      [newConv.id, newConv.userId, newConv.status, newConv.createdAt]
    );
    conversation = newConv;
  }

  // 3. Sync to Server
  const online = await isOnline().catch(() => false);
  if (online) {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conversation),
      });
      
      if (response.ok) {
        console.log("✅ Conversation synced to server with UUID:", conversation.id);
      } else {
        const errText = await response.text();
        console.warn("❌ Server rejected sync:", errText);
      }
    } catch (e) {
      console.warn("Could not sync conversation to server");
    }
  }

  return conversation;
}



export async function loadPendingMessages(conversationId?: string) {
  const query = conversationId
    ? 'SELECT * FROM messages WHERE conversationId = ? AND isSyncedToServer = 0;'
    : 'SELECT * FROM messages WHERE isSyncedToServer = 0;';
  const params = conversationId ? [conversationId] : [];
  
  const result = await execSql(query, params);
  return result as any[];
}

export async function markMessageSynced(messageId: string) {
  await execSql('UPDATE messages SET isSyncedToServer = 1 WHERE id = ?;', [messageId]);
}


export async function saveRemoteMessages(messages: any[]) {
  if (!messages?.length) return;
  const database = getDatabase();
  if (!database) return;

  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        for (const message of messages) {
          tx.executeSql(
            `INSERT OR REPLACE INTO messages (id, conversationId, content, isSyncedToServer)
             VALUES (?, ?, ?, ?);`,
            [message.id, message.conversationId, message.content, 1]
          );
        }
      },
      (err: any) => reject(err),
      () => resolve(true)
    );
  });
}

// Fixed: result is a direct array in modern expo-sqlite
export async function loadSubcategoriesLocal(parentId: string) {
  console.log(`📴 Loading subcategories for parent: ${parentId}`);
  const result = await execSql(
    'SELECT * FROM categories WHERE parentId = ?;',
    [parentId]
  );
  return result as any[]; 
}

async function createOrFetchRemoteConversation(conversation: any, userId: string) {
  try {
    const body = {
      id: conversation.id,
      userId,
      adminId: conversation.adminId,
      status: conversation.status,
    };

    const response = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Failed to create/fetch conversation');

    return await response.json();
  } catch (error) {
    console.warn('Remote conversation sync failed', error);
    return conversation;
  }
}

export async function syncMessagesForConversation(conversation: any, userId: string) {
  const online = await isOnline();
  if (!online || !conversation?.id) return;

  try {
    const remoteConversation = await createOrFetchRemoteConversation(conversation, userId);
    
    // Fetch and save fresh messages from server
    const response = await fetch(`${API_URL}/api/conversations/${remoteConversation.id}/messages`);
    const remoteMessages = (await response.json()) || [];
    await saveRemoteMessages(remoteMessages);

    // Sync any messages the user sent while offline
    const pendingMessages = await loadPendingMessages(remoteConversation.id);
    for (const pending of pendingMessages) {
      try {
        const sendResponse = await fetch(`${API_URL}/api/conversations/${remoteConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: pending.senderId,
            content: pending.content,
            attachmentUrl: pending.attachmentUrl,
            createdAt: pending.createdAt,
          }),
        });

        if (sendResponse.ok) {
          await markMessageSynced(pending.id);
        }
      } catch (sendError) {
        console.warn('Message send failed, will retry later', sendError);
      }
    }
  } catch (error) {
    console.warn('Failed to sync messages', error);
  }
}

export async function syncAll(userId?: string, conversation?: any) {
  const online = await isOnline();
  if (!online) {
    console.log("📴 Offline: Skipping background sync");
    return;
  }
  
  // Run these in parallel to save time
  await Promise.all([
    syncRemoteCatalog(),
    conversation ? syncMessagesForConversation(conversation, userId || 'offline-user') : Promise.resolve()
  ]);
  
  console.log("✅ Full background sync complete");
}
