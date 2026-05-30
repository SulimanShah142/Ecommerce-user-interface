import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, ScrollView, 
  StyleSheet, Dimensions, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/Contexts/LanguageContext';
import CachedImage from '@/components/CachedImage';
import { 
  loadCategoryLocal, loadSubcategoriesLocal, loadProductsByCategoryLocal, 
  execSql, initOfflineDb, isOnline, syncRemoteCatalog, 
  loadProductLocal
} from '@/lib/offline';
import LanguageSelector from '@/components/LanguageSelector';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width / 2) - 15;

export default function CategoryPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t, isRTL } = useLanguage();
  
  const [products, setProducts] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (catId: string) => {
    try {
      // 1. Ensure database initialization is complete before making any queries
      await initOfflineDb(); 
      
      console.log("📂 Category Screen: Executing sequential database read lifecycle...");

      // 🎯 THE CRITICAL TRANSACTIONS FIX: 
      // Swapped out Promise.all for sequential awaits! This processes tasks one by one, 
      // which completely prevents SQLite connection overlap locks and clears the rollback error.
      const localCat = await loadCategoryLocal(catId);
      const localSubs = await loadSubcategoriesLocal(catId); 
      const localProds = await loadProductsByCategoryLocal(catId);
      const settingsResult = await execSql('SELECT * FROM app_settings LIMIT 1');

      // Update UI states safely as the data returns sequentially
      if (localCat) setCategory(localCat);
      setSubcategories(localSubs || []);
      setProducts(localProds || []);
      
      if (settingsResult && settingsResult.length > 0) {
        setSettings(settingsResult[0]);
      }

      setLoading(false);

      // 2. Background Server Catalog Sync Engine Handshake
      const online = await isOnline().catch(() => false);
      if (online) {
        // Run background catalog queries outside the main UI blocking thread loop
        syncRemoteCatalog()
          .then(async () => {
            console.log("🛰️ Background Sync complete. Refreshing local views arrays...");
            
            // Execute background state updates sequentially as well to protect the SQLite instance
            const freshProds = await loadProductsByCategoryLocal(catId);
            if (freshProds) setProducts(freshProds);
            
            const freshSettings = await execSql('SELECT * FROM app_settings LIMIT 1');
            if (freshSettings && freshSettings.length > 0) {
              setSettings(freshSettings[0]);
            }
          })
          .catch(e => console.log("⚠️ Background synchronization skipped a cycle:", e));
      }
    } catch (err: any) {
      console.error('❌ Category Load Error Intercepted:', err.message || err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData(id as string);
  }, [id]);

  const getDisplayPrice = (usdPrice: string) => {
    if (!settings) return "...";
    const rate = parseFloat(settings.usdToAfnRate || '68');
    const profit = parseFloat(settings.profitPercentage || '20');
    const finalPrice = parseFloat(usdPrice || '0') * rate * (1 + profit / 100);
    return Math.round(finalPrice).toLocaleString();
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.9}
    >
      {/* IMAGE CONTAINER FIXED FOR RTL */}
      <View style={styles.imageContainer}>
        <CachedImage 
            remoteUrl={item.imageUrl} 
            style={styles.productImage} 
            resizeMode="cover"
        />
        <TouchableOpacity style={[styles.wishlistBtn, isRTL ? { left: 10 } : { right: 10 }]}>
          <Ionicons name="heart-outline" size={18} color="#000" />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.productInfo, isRTL && { alignItems: 'flex-end' }]}>
        <Text style={[styles.productName, isRTL && styles.rtlText]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.productPrice, isRTL && styles.rtlText]}>
          AFN {getDisplayPrice(item.usdPrice)}
        </Text>
      </View>
    </TouchableOpacity>
  );


const renderHeader = () => (
  <View style={styles.headerContent}>
    {subcategories.length > 0 && (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.subCatScroll}
        contentContainerStyle={{ paddingHorizontal: 15 }}
      >
        {subcategories.map((sub) => (
          <TouchableOpacity 
            key={sub.id} 
            style={styles.subCatCapsule} 
            onPress={() => router.push(`/categories/${sub.id}`)}
          >
            <Text style={styles.subCatText}>{sub.name.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
    <View style={styles.filterBar}>
      <Text style={styles.resultsCount}>{products.length} {t('itemsFound')}</Text>
      <TouchableOpacity style={styles.filterBtn}>
        <Text style={styles.filterBtnText}>SORT/FILTER</Text>
        <Ionicons name="chevron-down" size={12} color="#000" />
      </TouchableOpacity>
    </View>
  </View>
);

  return (
    <View style={styles.container}>
      {/* 1. HEADER SECTION */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons 
            name={isRTL ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color="#000" 
          />
        </TouchableOpacity>
        
        <View style={[styles.titleContainer, isRTL && { alignItems: 'flex-end', marginLeft: 0, marginRight: 15 }]}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>
            {category?.name || t('loading')}
          </Text>
        </View>
      </View>

      {/* 2. MAIN CONTENT AREA */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          numColumns={2}
          // Fix: ensure the row reverses for Dari/Pashto
          columnWrapperStyle={[
            styles.columnWrapper, 
            isRTL && { flexDirection: 'row-reverse' }
          ]}
          contentContainerStyle={styles.list} // Fixed: removed extra '}'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>{t('noProductsInCategory')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}


 
const styles = StyleSheet.create({
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingTop: 54,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F5F5F5',
  backgroundColor: '#FFFFFF',
},

titleContainer: {
  flex: 1,
  marginLeft: 12,
},

title: {
  fontSize: 14,
  fontWeight: '900',
  letterSpacing: 1.5,
  color: '#000',
},

subtitle: {
  fontSize: 9,
  color: '#999',
  marginTop: 2,
  letterSpacing: 0.4,
},

headerContent: {
  backgroundColor: '#FFFFFF',
},

subCatScroll: {
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F7F7F7',
  paddingLeft: 16,
},

subCatCapsule: {
  paddingHorizontal: 14,
  paddingVertical: 7,
  backgroundColor: '#FAFAFA',
  marginRight: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#EEEEEE',
},

subCatText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#222',
  letterSpacing: 0.6,
},

filterBar: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#F7F7F7',
  backgroundColor: '#FFFFFF',
},

resultsCount: {
  fontSize: 10,
  color: '#999',
  fontWeight: '600',
},

filterBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FAFAFA',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
},

filterBtnText: {
  fontSize: 10,
  fontWeight: '800',
  marginRight: 4,
  color: '#111',
},

list: {
  paddingHorizontal: 12,
  paddingTop: 14,
  paddingBottom: 100,
},

columnWrapper: {
  justifyContent: 'space-between',
},

productCard: {
  width: COLUMN_WIDTH,
  marginBottom: 18,
  backgroundColor: '#FFFFFF',
},

imageContainer: {
  width: '100%',
  height: 210,
  backgroundColor: '#F8F8F8',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 2,
},

productImage: {
  width: '100%',
  height: '100%',
  resizeMode: 'cover',
},

productInfo: {
  paddingTop: 8,
  paddingHorizontal: 2,
},

productName: {
  fontSize: 10,
  color: '#333',
  fontWeight: '600',
  lineHeight: 14,
  letterSpacing: 0.3,
},

priceRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 5,
  gap: 5,
},

productPrice: {
  fontSize: 12,
  fontWeight: '900',
  color: '#000',
},

wasPrice: {
  fontSize: 9,
  color: '#B5B5B5',
  textDecorationLine: 'line-through',
},

wishlistBtn: {
  position: 'absolute',
  right: 8,
  bottom: 8,
  backgroundColor: 'rgba(255,255,255,0.92)',
  width: 28,
  height: 28,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
},

saleBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: '#000',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 2,
},

saleText: {
  color: '#FFF',
  fontSize: 7,
  fontWeight: '900',
  letterSpacing: 0.8,
},

tagBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: '#111',
  paddingHorizontal: 5,
  paddingVertical: 3,
  borderRadius: 2,
},

tagText: {
  color: '#fff',
  fontSize: 7,
  fontWeight: '900',
  letterSpacing: 0.7,
},

emptyContainer: {
  alignItems: 'center',
  marginTop: 120,
},

emptyText: {
  fontSize: 11,
  color: '#AAA',
  marginTop: 12,
  fontWeight: '600',
  letterSpacing: 0.4,
},
 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#555' },

 container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  // ADD THIS BLOCK
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  // ALSO ADD THIS TO FIX OTHER POTENTIAL ERRORS
  rtlCard: {
    alignItems: 'flex-end',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },


  row: { justifyContent: 'space-between' }, // Keeps the 2 columns neat
  
  card: { 
    width: COLUMN_WIDTH, 
    marginBottom: 20,
    backgroundColor: '#fff' 
  },

  image: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  name: { fontSize: 12, color: '#333', fontWeight: '400' },
  
});

