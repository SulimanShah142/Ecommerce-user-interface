import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  initOfflineDb, 
  loadCategoriesLocal, 
  loadProductsByCategoryLocal, 
  isOnline, 
  syncCategories, 
  syncRemoteCatalog,
  execSql, 
  loadProductsLocal
} from '../lib/offline'; 
import { useLanguage } from '../Contexts/LanguageContext';
import CachedImage from '../components/CachedImage';

const SIDEBAR_WIDTH = 90;
const { width } = Dimensions.get('window');

export default function CategoriesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

   // 🔍 NEW STATE HOOKS FOR SEARCH & FILTER
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'NONE' | 'PRICE_LOW' | 'PRICE_HIGH'>('NONE');

  // 1. Sidebar logic (Top-level categories only)
  const parentCategories = useMemo(() => categories.filter(cat => !cat.parentId), [categories]);

  // 🎯 2. UNIFIED PRICE CALCULATION ENGINE MATRICES
  const calculateAfnPriceNum = (usdPrice: string | number) => {
    // 🎯 FIX A: Fallback to the exact same system constants ('68' and '20') during initialization passes
    const rate = parseFloat(settings?.usdToAfnRate || '68');
    const profit = parseFloat(settings?.profitPercentage || '20');
    
    const base = parseFloat(usdPrice.toString() || '0') * rate;
    
    // 🎯 FIX B: Restored the correct addition markup formula to match the rest of your app!
    return Math.round(base + (base * (profit / 100)));
  };

  const getDisplayPrice = (usdPrice: string | number) => {
    return calculateAfnPriceNum(usdPrice).toLocaleString();
  };

  // 🔍 LIVE COMBINED FILTER MATRIX (Safely handles sorting arrays)
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Apply Live Search Query
    if (searchQuery.trim().length > 0) {
      const cleanQuery = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.name?.toLowerCase().includes(cleanQuery));
    }

    // Apply Price Sorters using the updated unified pricing engine parameters
    if (sortBy === 'PRICE_LOW') {
      result.sort((a, b) => calculateAfnPriceNum(a.usdPrice) - calculateAfnPriceNum(b.usdPrice));
    } else if (sortBy === 'PRICE_HIGH') {
      result.sort((a, b) => calculateAfnPriceNum(b.usdPrice) - calculateAfnPriceNum(a.usdPrice));
    }

    return result;
  }, [products, searchQuery, sortBy, settings]);

  // 3. Main Data Orchestrator
  const handleLoadData = useCallback(async () => {
    try {
      setLoading(true);

      const [localCats, localProds] = await Promise.all([
        loadCategoriesLocal(),
        loadProductsLocal()
      ]);

      setCategories(localCats || []);
      setProducts(localProds || []);

      const settingsData = await execSql('SELECT * FROM app_settings LIMIT 1');
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
      }

      if (localCats?.length > 0 && !selectedParentId) {
        const firstParent = localCats.find((c: any) => !c.parentId);
        if (firstParent) setSelectedParentId(firstParent.id);
      }

      setLoading(false);

      const online = await isOnline().catch(() => false);
      if (online) {
        const syncSuccess = await syncRemoteCatalog().catch((e) => {
          console.warn("⚠️ Catalog synchronization deferred silently:", e.message);
          return false;
        });

        if (syncSuccess) {
          const freshCats = await loadCategoriesLocal();
          const freshProds = await loadProductsLocal();
          const freshSettings = await execSql('SELECT * FROM app_settings LIMIT 1');
          
          setCategories(freshCats || []);
          setProducts(freshProds || []);
          if (freshSettings?.length > 0) setSettings(freshSettings[0]);
        }
      }
    } catch (err: any) {
      console.error('❌ Categories critical data load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedParentId]);

  // 4. Product Fetcher (Triggered when sidebar changes)
  const loadProducts = async (catId: string) => {
    setProductsLoading(true);
    const localProds = await loadProductsByCategoryLocal(catId);
    setProducts(localProds || []);
    setProductsLoading(false);
  };

  useEffect(() => {
    handleLoadData();
  }, []); 

  useEffect(() => {
    if (selectedParentId) {
      loadProducts(selectedParentId);
    }
  }, [selectedParentId]);

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={styles.imageWrapper}>
        <CachedImage remoteUrl={item.imageUrl} style={styles.productImage} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name?.toUpperCase()}</Text>
        <Text style={styles.productPrice}>AFN {getDisplayPrice(item.usdPrice)}</Text>
      </View>
    </TouchableOpacity>
  );



  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      
      {/* 🔍 TOP INTERACTIVE CONTROLS BAR */}
      <View style={[styles.filterSearchBarRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.searchBoxFrame, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="search-outline" size={16} color="#888" style={{ marginHorizontal: 6 }} />
          <TextInput
            style={[styles.searchTextInput, isRTL && { textAlign: 'right' }]}
            placeholder={t('searchProduct') || "Search item..."}
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* PRICE FILTER TOGGLE CONTROLLERS */}
        <TouchableOpacity 
          style={[styles.filterActionChip, sortBy !== 'NONE' && styles.filterActionChipActive]}
          onPress={() => {
            if (sortBy === 'NONE') setSortBy('PRICE_LOW');
            else if (sortBy === 'PRICE_LOW') setSortBy('PRICE_HIGH');
            else setSortBy('NONE');
          }}
        >
          <Ionicons 
            name={sortBy === 'PRICE_HIGH' ? "arrow-down-outline" : "arrow-up-outline"} 
            size={14} 
            color={sortBy !== 'NONE' ? '#FFF' : '#000'} 
          />
          <Text style={[styles.filterChipText, sortBy !== 'NONE' && { color: '#FFF' }]}>
            {sortBy === 'NONE' ? 'PRICE' : sortBy === 'PRICE_LOW' ? 'LOW-HIGH' : 'HIGH-LOW'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.container, isRTL && styles.rtlContainer]}>
        {/* LEFT SIDEBAR */}
        <View style={styles.sidebar}>
          <FlatList
            data={parentCategories}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = selectedParentId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                  onPress={() => {
                    setSelectedParentId(item.id);
                    setSearchQuery(''); // Reset search when switching categories
                  }}
                >
                  <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
                    {item.name.toUpperCase()}
                  </Text>
                  {isActive && <View style={styles.activeLine} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* RIGHT CONTENT */}
        <View style={styles.mainContent}>
          {productsLoading ? (
            <ActivityIndicator style={{ marginTop: 50 }} color="#000" />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={styles.mainHeader}>
                  <Text style={[styles.mainTitle, isRTL && { textAlign: 'right' }]}>
                    {parentCategories.find(p => p.id === selectedParentId)?.name}
                  </Text>
                  <View style={styles.headerDivider} />
                </View>
              )}
              renderItem={renderProductItem}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="basket-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>{t('noProducts') || 'No products found'}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', flexDirection: 'row' },
  rtlContainer: { flexDirection: 'row-reverse' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  
  // Search & Filters Row Layout
  filterSearchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
    gap: 8
  },
  searchBoxFrame: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 4
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#000',
    height: '100%',
    padding: 0
  },
  filterActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 8,
    gap: 4
  },
  filterActionChipActive: {
    backgroundColor: '#000'
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000'
  },

  // Sidebar Layout
  sidebar: {
    width: SIDEBAR_WIDTH, 
    backgroundColor: '#F8F8F8',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  sidebarItem: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  sidebarItemActive: {
    backgroundColor: '#fff',
  },
  activeLine: {
    position: 'absolute',
    left: 0,
    top: '30%',
    bottom: '30%',
    width: 3,
    backgroundColor: '#000', 
  },
  sidebarText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  sidebarTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // Main Content
  mainContent: { flex: 1, paddingHorizontal: 12 },
  mainHeader: { paddingTop: 14, paddingBottom: 10 },
  mainTitle: { fontSize: 13, fontWeight: '800', color: '#000', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerDivider: { height: 1, backgroundColor: '#F0F0F0', marginTop: 6, marginBottom: 4 },
  row: { justifyContent: 'flex-start', gap: 10, marginBottom: 12 },
  
  // Product Card styles
  productCard: {
    width: (width - SIDEBAR_WIDTH - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden'
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    overflow: 'hidden'
  },
  productImage: { width: '100%', height: '100%' },
  productInfo: { paddingVertical: 6, paddingHorizontal: 2 },
  productName: { fontSize: 11, color: '#333', fontWeight: '400' },
  productPrice: { fontSize: 11, color: '#000', fontWeight: '700', marginTop: 2 },

  // Empty Frameworks
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontSize: 12, color: '#AAA', fontWeight: '500' }
});
