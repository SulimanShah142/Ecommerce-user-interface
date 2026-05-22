import React, { useState, useEffect, useReducer , } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/Contexts/CartContext';
import CachedImage from '@/components/CachedImage';
import { initOfflineDb, loadProductsLocal, syncRemoteCatalog, isOnline, execSql } from '@/lib/offline';
import { useLanguage } from '@/Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';

const API_URL = "http://192.168.1.3:8787";

export default function ProductsPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { data: session } = authClient.useSession();
  
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setupAndLoad();
  }, []);

  const setupAndLoad = async () => {
    try {
      await initOfflineDb();
      await loadProducts(true); 
      setLoading(false);

      const online = await isOnline().catch(() => false);
      if (online) {
        await syncRemoteCatalog();
        await loadProducts(false);
      }
    } catch (e) {
      console.error("❌ Setup failed:", e);
      setLoading(false);
    }
  };

  const loadProducts = async (isInitial = false) => {
    try {
      const [localProds, settingsResult] = await Promise.all([
        loadProductsLocal(),
        execSql('SELECT * FROM app_settings LIMIT 1')
      ]);
      
      setProducts(localProds || []);
      
      if (settingsResult && settingsResult.length > 0) {
        setSettings(settingsResult[0]); 
      }

      const online = await isOnline().catch(() => false);
      if (!isInitial && online) {
        const sRes = await fetch(`${API_URL}/api/admin/settings`);
        if (sRes.ok) {
          const freshSettings = await sRes.json();
          setSettings(freshSettings);
        }
      }
    } catch (err) {
      console.error('Failed to load products/settings', err);
    }
  };

  // 🎯 RE-ENGINEERED UNIFIED DISP PRICE CALCULATOR
  const getDisplayPrice = (usdPrice: string) => {
    // 🎯 FIX A: Aligned default fallback constants ('68' and '20') to guarantee calculation uniformity on boot
    const rate = parseFloat(settings?.usdToAfnRate || '68');
    const profit = parseFloat(settings?.profitPercentage || '20');
    
    const baseAfn = parseFloat(usdPrice || '0') * rate;
    
    // 🎯 FIX B: Swapped out legacy multi-fraction multiplication logic with the standardized addition layout formula
    let finalPrice = baseAfn + (baseAfn * (profit / 100));

    // Dynamic New User Promotional Eligibility Check Cues
    if (settings?.newUserDiscountActive && session?.user?.createdAt) {
      const signupDate = new Date(session.user.createdAt).getTime();
      const hoursSinceSignup = (new Date().getTime() - signupDate) / (1000 * 60 * 60);
      
      if (hoursSinceSignup <= (parseInt(settings.discountDurationHours) || 24)) {
        const discountVal = parseFloat(settings.newUserDiscountValue || '0');
        if (settings.newUserDiscountType === 'percentage') {
          finalPrice *= (1 - discountVal / 100);
        } else {
          finalPrice -= discountVal;
        }
      }
    }
    
    return Math.round(Math.max(0, finalPrice)).toLocaleString();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const addToCart = (product: any) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity: 1 } });
    Alert.alert(t('addedToCart'), `${product.name} ${t('productAdded')}`);
  };
const renderProduct = ({ item }: { item: any }) => (
  <TouchableOpacity 
    activeOpacity={0.9}
    style={[styles.card, isRTL && styles.rtlCard]} 
    onPress={() => router.push(`/product/${item.id}`)}
  >
    <View style={styles.imageContainer}>
      <CachedImage remoteUrl={item.imageUrl} style={styles.image} />
      
      {/* Discount Badge */}
      {settings?.newUserDiscountActive && (
        <View style={styles.saleBadge}>
          <Text style={styles.saleText}>SALE</Text>
        </View>
      )}

      {/* Subtle Wishlist Icon */}
      <TouchableOpacity style={styles.favBtn}>
        <Ionicons name="heart-outline" size={18} color="#000" />
      </TouchableOpacity>
    </View>

    <View style={styles.cardBody}>
      <Text style={[styles.name, isRTL && styles.rtlText]} numberOfLines={1}>
        {item.name}
      </Text>
      
      <View style={styles.priceRow}>
        <Text style={[styles.price, isRTL && styles.rtlText]}>
          AFN {getDisplayPrice(item.usdPrice)}
        </Text>
        
        {settings?.newUserDiscountActive && (
           <Text style={styles.wasPrice}>
             AFN {Math.round(parseFloat(item.usdPrice || '0') * parseFloat(settings.usdToAfnRate || 65) * 1.2)}
           </Text>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

  // FIXED: Return is now active and uses the list
  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{t('products')}</Text>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A1128" />
        </View>
      ) : (
        <FlatList
  data={products}
  keyExtractor={(item) => item.id.toString()}
  renderItem={renderProduct}
  numColumns={2} // THE KEY CHANGE
  columnWrapperStyle={styles.row}
  contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A1128" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('noProducts')}</Text>
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    paddingHorizontal: 16, 
    paddingBottom: 15, 
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2'
  },
  title: { 
    fontSize: 16, 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    letterSpacing: 2,
    textAlign: 'center' 
  },
  list: { paddingHorizontal: 8, paddingBottom: 100, paddingTop: 10 },
  row: { justifyContent: 'space-between' }, // Spaces out the 2 columns
  card: { 
    width: '48%', // Fits two per row
    backgroundColor: '#fff', 
    marginBottom: 20, 
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#F9F9F9',
  },
  image: { 
    width: '100%', 
    height: 240, // Tall fashion aspect ratio
    resizeMode: 'cover'
  },
  saleBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saleText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  favBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 20,
  },
  cardBody: { paddingVertical: 10, paddingHorizontal: 4 },
  name: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4,
    fontWeight: '400' 
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap'
  },
  price: { 
    fontSize: 14, 
    color: '#000', 
    fontWeight: '700' 
  },
  wasPrice: {
    fontSize: 10, 
    textDecorationLine: 'line-through', 
    color: '#999',
    marginLeft: 6
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 14 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  rtlCard: { alignItems: 'flex-end' },
});
