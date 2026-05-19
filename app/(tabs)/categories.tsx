import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
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
} from '../../lib/offline'; 
import { useLanguage } from '../../Contexts/LanguageContext';
import CachedImage from '../../components/CachedImage';

const SIDEBAR_WIDTH = 100;
const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - SIDEBAR_WIDTH - 30) / 2;

export default function CategoriesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // 1. Sidebar logic (Top-level categories only)
  const parentCategories = useMemo(() => categories.filter(cat => !cat.parentId), [categories]);

  // 2. Price Calculation Logic
  const getDisplayPrice = (usdPrice: string | number) => {
    if (!settings) return "...";
    const rate = parseFloat(settings.usdToAfnRate || '68');
    const profit = parseFloat(settings.profitPercentage || '20');
    const base = parseFloat(usdPrice.toString()) * rate;
    return Math.round(base * (1 + profit / 100)).toLocaleString();
  };

  // 3. Main Data Orchestrator
 const handleLoadData = useCallback(async (isInitialLoad = false) => {
  try {
    if (isInitialLoad) setLoading(true);

    // STEP 1: Load Local Data (Cats, Prods, AND Settings)
    const [localCats, localProds, settingsData] = await Promise.all([
      loadCategoriesLocal(),
      loadProductsLocal(),
      execSql('SELECT * FROM app_settings LIMIT 1') // CRITICAL: Get the rates
    ]);

    setCategories(localCats || []);
    setProducts(localProds || []);
    
    // Set settings so getDisplayPrice works immediately
    if (settingsData && settingsData.length > 0) {
      setSettings(settingsData[0]);
    }

    // Auto-select first category if none selected
    if (localCats?.length > 0 && !selectedParentId) {
      const firstParent = localCats.find((c: any) => !c.parentId);
      if (firstParent) setSelectedParentId(firstParent.id);
    }

    // STEP 2: Background Sync
    if (await isOnline()) {
      console.log("📡 Starting remote sync...");
      const syncSuccess = await syncRemoteCatalog();

      if (syncSuccess) {
        // STEP 3: Refresh state from updated SQLite
        const [freshCats, freshProds, freshSettings] = await Promise.all([
          loadCategoriesLocal(),
          loadProductsLocal(),
          execSql('SELECT * FROM app_settings LIMIT 1')
        ]);
        
        setCategories(freshCats);
        setProducts(freshProds);
        if (freshSettings?.length > 0) setSettings(freshSettings[0]);
      }
    }
  } catch (err) {
    console.error('Data load failed:', err);
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
  }, []); // Run once on mount

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
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>AFN {getDisplayPrice(item.usdPrice)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

return (
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
              onPress={() => setSelectedParentId(item.id)}
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
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.mainHeader}>
              <Text style={styles.mainTitle}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', flexDirection: 'row' },
  
  // Sidebar - SHEIN style is light grey background, white active state
  sidebar: {
    width: 90, // Fixed width for clean look
    backgroundColor: '#F8F8F8',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  sidebarItem: {
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
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
    backgroundColor: '#000', // Bold black indicator
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
  mainContent: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
  },
  mainHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mainTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#000',
  },
  headerDivider: {
    width: 20,
    height: 2,
    backgroundColor: '#000',
    marginTop: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%', // Balanced grid
    marginBottom: 15,
  },
  imageWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: '#F9F9F9',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  miniBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  miniBadgeText: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: 'bold',
  },
  productInfo: {
    paddingVertical: 8,
  },
  productName: {
    fontSize: 10,
    color: '#777',
    fontWeight: '400',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000', // Clean black price
    marginTop: 2,
  },
  rtlContainer: { flexDirection: 'row-reverse' },
});
