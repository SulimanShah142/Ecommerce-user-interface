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
    backgroundColor: '#FFFFFF',
  },

  // 🎯 PREMIUM FLOATING HEADER
  topBar: {
    paddingTop: 5,
    paddingHorizontal: 18,
    paddingBottom: 16,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  // 🎯 MODERN SEARCH BAR
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    height: 46,

    backgroundColor: '#F7F7F7',

    borderRadius: 14,

    paddingHorizontal: 14,

    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  searchInput: {
    flex: 1,

    marginLeft: 10,

    fontSize: 13,

    fontWeight: '500',

    color: '#111111',

    letterSpacing: 0.2,
  },

  // 🎯 CATEGORY STRIP
  catScroll: {
    backgroundColor: '#FFFFFF',
  },

  catScrollContent: {
    paddingLeft: 18,
    paddingRight: 8,
    paddingTop: 18,
    paddingBottom: 8,
  },

  catCircleItem: {
    alignItems: 'center',

    marginRight: 16,

    width: 72,
  },

  // 🎯 PREMIUM CATEGORY BUBBLE
  circle: {
    width: 68,
    height: 68,

    borderRadius: 34,

    backgroundColor: '#F8F8F8',

    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#F2F2F2',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,

    elevation: 2,
  },

  circleImg: {
    width: '100%',
    height: '100%',

    resizeMode: 'cover',
  },

  catLabel: {
    marginTop: 10,

    fontSize: 10,

    textAlign: 'center',

    fontWeight: '700',

    color: '#111111',

    letterSpacing: 0.4,
  },

  // 🎯 PREMIUM SECTION TITLE
  sectionTitle: {
    fontSize: 16,

    fontWeight: '800',

    color: '#111111',

    letterSpacing: 1.2,

    marginTop: 30,
    marginBottom: 18,

    paddingHorizontal: 18,
  },

  // 🎯 PRODUCT GRID
  productGrid: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent: 'space-between',

    paddingHorizontal: 12,
  },

  // 🎯 PRODUCT CARD
  productCard: {
    width: PRODUCT_CARD_WIDTH,

    marginBottom: 28,

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    overflow: 'hidden',
  },

  // 🎯 IMAGE CONTAINER
  imageContainer: {
    width: '100%',

    aspectRatio: 3 / 4,

    backgroundColor: '#F5F5F5',

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 14,
  },

  productImage: {
    width: '100%',
    height: '100%',

    resizeMode: 'cover',

    transform: [{ scale: 1.01 }],
  },

  // 🎯 SALE BADGE
  badge: {
    position: 'absolute',

    top: 10,
    left: 10,

    backgroundColor: '#000000',

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 6,
  },

  badgeText: {
    color: '#FFFFFF',

    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  // 🎯 WISHLIST BUTTON
  wishlistBtn: {
    position: 'absolute',

    top: 10,
    right: 10,

    width: 34,
    height: 34,

    borderRadius: 17,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.96)',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },

  // 🎯 PRODUCT INFO
  productInfo: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },

  // 🎯 PRODUCT NAME
  productName: {
    fontSize: 12,

    color: '#222222',

    fontWeight: '600',

    lineHeight: 18,

    marginBottom: 6,
  },

  // 🎯 META TEXT
  metaText: {
    marginBottom: 6,

    fontSize: 10,

    color: '#777777',

    fontWeight: '500',
  },

  // 🎯 PRICE ROW
  priceRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,
  },

  // 🎯 CURRENT PRICE
  productPrice: {
    fontSize: 14,

    color: '#000000',

    fontWeight: '800',
  },

  // 🎯 OLD PRICE
  oldPrice: {
    fontSize: 11,

    color: '#999999',

    textDecorationLine: 'line-through',
  },

  // 🎯 LOADING STATE
  mapLoaderContainer: {
    height: 220,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#FAFAFA',

    borderRadius: 18,

    marginHorizontal: 18,
  },

  // 🎯 EMPTY STATE
  emptyContainer: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

    paddingHorizontal: 40,
  },

  emptyTitle: {
    fontSize: 18,

    fontWeight: '800',

    color: '#111111',

    marginTop: 16,
  },

  emptyText: {
    marginTop: 8,

    fontSize: 13,

    textAlign: 'center',

    lineHeight: 20,

    color: '#777777',
  },

  // 🎯 FLOATING FILTER BUTTON
  floatingFilterBtn: {
    position: 'absolute',

    bottom: 28,
    right: 22,

    height: 52,

    paddingHorizontal: 22,

    borderRadius: 26,

    backgroundColor: '#000000',

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 6,
  },

  floatingFilterText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',

    marginLeft: 8,

    letterSpacing: 0.4,
  },

  // 🎯 PREMIUM DIVIDER
  divider: {
    height: 1,

    backgroundColor: '#F3F3F3',

    marginVertical: 10,
  },

  // 🎯 SHIMMER / SKELETON PLACEHOLDER
  skeletonCard: {
    width: PRODUCT_CARD_WIDTH,

    marginBottom: 28,
  },

  skeletonImage: {
    width: '100%',

    aspectRatio: 3 / 4,

    borderRadius: 14,

    backgroundColor: '#F2F2F2',
  },

  skeletonText: {
    height: 12,

    borderRadius: 6,

    backgroundColor: '#F2F2F2',

    marginTop: 10,
  },
});