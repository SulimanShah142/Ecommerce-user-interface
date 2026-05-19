import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ScrollView, TouchableOpacity, Text, StyleSheet, View, 
  Dimensions, RefreshControl, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  initOfflineDb, loadCategoriesLocal, loadProductsLocal, 
  syncRemoteCatalog, isOnline, execSql 
} from '@/lib/offline';
import { useLanguage } from '@/Contexts/LanguageContext';
import CachedImage from '@/components/CachedImage';

const { width } = Dimensions.get('window');

const SkeletonCard = () => (
  <View style={styles.productCard}>
    <View style={[styles.productImage, { backgroundColor: '#F5F5F5' }]} />
    <View style={styles.productInfo}>
      <View style={{ height: 12, backgroundColor: '#EEE', width: '80%', marginBottom: 6 }} />
      <View style={{ height: 14, backgroundColor: '#EEE', width: '40%' }} />
    </View>
  </View>
);

export default function HomePage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const isMounted = useRef(true);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [displayLimit, setDisplayLimit] = useState(6);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const list = products.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return list.slice(0, displayLimit);
  }, [products, searchQuery, displayLimit]);

  const handleLoadData = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setIsLoading(true);
      
      // 1. Load Local Everything (Fast UI)
      const [localCats, localProds, localSettings] = await Promise.all([
        loadCategoriesLocal(),
        loadProductsLocal(),
        execSql('SELECT * FROM app_settings LIMIT 1')
      ]);

      if (isMounted.current) {
        setCategories(localCats || []);
        setProducts(localProds || []);
        if (localSettings?.length > 0) setSettings(localSettings[0]);
        if (localProds?.length > 0) setIsLoading(false);
      }

      // 2. Background Sync
      if (await isOnline().catch(() => false)) {
        const syncSuccess = await syncRemoteCatalog();
        if (syncSuccess) {
          const [freshCats, freshProds, freshSettings] = await Promise.all([
            loadCategoriesLocal(),
            loadProductsLocal(),
            execSql('SELECT * FROM app_settings LIMIT 1')
          ]);
          
          if (isMounted.current) {
            setCategories(freshCats || []);
            setProducts(freshProds || []);
            if (freshSettings?.length > 0) setSettings(freshSettings[0]);
          }
        }
      }
    } catch (err) {
      console.error('Data load failed:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const setup = async () => {
      await initOfflineDb();
      await handleLoadData(true);
    };
    setup();
    return () => { isMounted.current = false; };
  }, []);

  // Calculation Logic using DB Settings
  const getPrices = (usdPrice: string) => {
    const rate = parseFloat(settings?.usdToAfnRate || '68');
    const profit = parseFloat(settings?.profitPercentage || '20');
    const base = parseFloat(usdPrice || '0') * rate;
    
    return {
      current: Math.round(base * (1 + profit / 100)).toLocaleString(),
      old: Math.round(base * (1 + (profit + 15) / 100)).toLocaleString()
    };
  };

  const renderProduct = (item: any) => {
    const { current, old } = getPrices(item.usdPrice);
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={styles.productCard} 
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <CachedImage remoteUrl={item.imageUrl} style={styles.productImage} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
          <TouchableOpacity style={styles.wishlistBtn}>
            <Ionicons name="heart-outline" size={18} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={[styles.productName, isRTL && styles.rtlText]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.priceRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.productPrice}>AFN {current}</Text>
            <Text style={styles.oldPrice}>AFN {old}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#000" />
          <TextInput
            placeholder="Search on SHEIN"
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => handleLoadData(false)} tintColor="#000" />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.catCircleItem} onPress={() => router.push(`/categories/${cat.id}`)}>
              <View style={styles.circle}>
                <CachedImage remoteUrl={cat.imageUrl} style={styles.circleImg} />
              </View>
              <Text style={styles.catLabel} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>JUST FOR YOU</Text>
        
        <View style={styles.productGrid}>
          {isLoading && products.length === 0 ? (
            Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            filteredProducts.map((item) => renderProduct(item))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  topBar: { 
    paddingTop: 50, 
    paddingHorizontal: 16, 
    paddingBottom: 12,
    backgroundColor: '#FFF'
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F7F7F7', // Slightly softer grey
    borderRadius: 0, // SHEIN uses sharp edges for search
    paddingHorizontal: 15, 
    height: 36,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 12, 
    fontWeight: '400',
    letterSpacing: 0.5 
  },
  catScroll: { 
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2'
  },
  catCircleItem: { 
    alignItems: 'center', 
    width: 80 
  },
  circle: { 
    width: 58, 
    height: 58, 
    borderRadius: 29, 
    backgroundColor: '#FFF', 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F2F2F2' 
  },
  circleImg: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover' 
  },
  catLabel: { 
    fontSize: 10, 
    marginTop: 6, 
    textAlign: 'center', 
    fontWeight: '500',
    textTransform: 'uppercase', // Minimalist aesthetic
    color: '#222'
  },
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 2, // Spacing is key for "Lux" feel
    textAlign: 'center', 
    marginVertical: 25,
    textTransform: 'uppercase',
    color: '#000'
  },
  productGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 4 // Tighter grid
  },
  productCard: { 
    width: (width / 2) - 8, 
    marginHorizontal: 4, 
    marginBottom: 20 
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  productImage: { 
    width: '100%', 
    height: 250, // Longer aspect ratio looks more like fashion editorial
    backgroundColor: '#F9F9F9' 
  },
  wishlistBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 6,
    borderRadius: 20
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold'
  },
  productInfo: { 
    paddingVertical: 10,
    paddingHorizontal: 2
  },
  productName: { 
    fontSize: 11, 
    color: '#666', // Lighter name to emphasize price
    lineHeight: 14 
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  productPrice: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#000' // Using Black instead of Orange for a "High Fashion" minimal look
  },
  oldPrice: {
    fontSize: 11,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    fontWeight: '400'
  },
  rtlText: { 
    textAlign: 'right' 
  }
});
