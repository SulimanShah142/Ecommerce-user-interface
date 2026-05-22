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
// Premium 2-column calculation spacing accounts for side edge insets
const PRODUCT_CARD_WIDTH = (width - 42) / 2; 

const SkeletonCard = () => (
  <View style={styles.productCard}>
    <View style={[styles.imageContainer, { backgroundColor: '#F8F8F8' }]} />
    <View style={styles.productInfo}>
      <View style={{ height: 10, backgroundColor: '#EEEEEE', width: '80%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: '#EEEEEE', width: '40%' }} />
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
  const [displayLimit, setDisplayLimit] = useState(12); // Elevated count for richer browsing layouts
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

  // Inside your User App product listing page file block
  
  const getPrices = (usdPrice: string) => {
    // 🎯 THE FIX: Change fallback exchange rate to '65' to match Admin server nodes perfectly
    const rate = parseFloat(settings?.usdToAfnRate || '65');
    const profit = parseFloat(settings?.profitPercentage || '20');
    
    // Base localized calculation conversion
    const base = parseFloat(usdPrice || '0') * rate;
    
    // Standard retail formula matching your Hono worker analytics output precisely
    const currentPriceCalculated = Math.round(base + (base * (profit / 100)));
    
    // Old price anchor marked up by an additional static 15% clearance cue index
    const oldPriceCalculated = Math.round(base + (base * ((profit + 15) / 100)));
    
    return {
      current: currentPriceCalculated.toLocaleString(),
      old: oldPriceCalculated.toLocaleString()
    };
  };

  const renderProduct = (item: any) => {
    const { current, old } = getPrices(item.usdPrice);
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={styles.productCard} 
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.imageContainer}>
          <CachedImage remoteUrl={item.imageUrl} style={styles.productImage} />
          <View style={[styles.badge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
          <TouchableOpacity style={[styles.wishlistBtn, isRTL ? { left: 8 } : { right: 8 }]} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={16} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={[styles.productName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
            {item.name?.toUpperCase()}
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
      {/* MINIMAL SHARP TOP BAR */}
      <View style={styles.topBar}>
        <View style={[styles.searchContainer, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search-outline" size={16} color="#666" />
          <TextInput
            placeholder={t('searchProduct') || "SEARCH BRAND GALLERY..."}
            placeholderTextColor="#999"
            style={[styles.searchInput, isRTL && { textAlign: 'right', marginRight: 10, marginLeft: 0 }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => handleLoadData(false)} tintColor="#000" />}
      >
        {/* REFINED HORIZONTAL STORY CIRCLES */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.catScrollContent, isRTL && { flexDirection: 'row-reverse' }]}
          style={styles.catScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.catCircleItem} onPress={() => router.push(`/categories/${cat.id}`)}>
              <View style={styles.circle}>
                <CachedImage remoteUrl={cat.imageUrl} style={styles.circleImg} />
              </View>
              <Text style={styles.catLabel} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{t('justForYou')?.toUpperCase() || 'JUST FOR YOU'}</Text>
        
        {/* PORTRAIT GRID FRAMEWORK */}
        <View style={[styles.productGrid, isRTL && { flexDirection: 'row-reverse' }]}>
          {isLoading && products.length === 0 ? (
            Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            filteredProducts.map((item) => renderProduct(item))
          )}
        </View>
        <View style={{ height: 60 }} />
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
    paddingTop: 54, 
    paddingHorizontal: 16, 
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FAFAFA', 
    borderRadius: 4, 
    paddingHorizontal: 12, 
    height: 40,
    borderWidth: 1,
    borderColor: '#EAEAEA'
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 11, 
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000000'
  },
  catScroll: { 
    backgroundColor: '#FFFFFF'
  },
  catScrollContent: {
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 18
  },
  catCircleItem: { 
    alignItems: 'center', 
    marginRight: 14,
    width: 64
  },
  circle: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#FAFAFA', 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE' 
  },
  circleImg: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover' 
  },
  catLabel: { 
    fontSize: 9, 
    marginTop: 8, 
    textAlign: 'center', 
    fontWeight: '600',
    textTransform: 'uppercase', 
    color: '#111111',
    letterSpacing: 0.5
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '800', 
    letterSpacing: 3, 
    textAlign: 'center', 
    marginTop: 28,
    marginBottom: 20,
    textTransform: 'uppercase',
    color: '#000000'
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    marginBottom: 24,
    backgroundColor: '#FFFFFF'
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4, // 🎯 High-end 3:4 portrait fashion ratio
    backgroundColor: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2
  },
  productImage: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover'
  },
  badge: {
    position: 'absolute',
    top: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 1
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  productInfo: { 
    paddingTop: 10,
    paddingHorizontal: 2
  },
  productName: { 
    fontSize: 10, 
    color: '#222222', 
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  productPrice: { 
    fontSize: 11, 
    color: '#000000', 
    fontWeight: '700' 
  },
  oldPrice: { 
    fontSize: 9, 
    color: '#999999', 
    textDecorationLine: 'line-through',
    fontWeight: '400'
  }
});
