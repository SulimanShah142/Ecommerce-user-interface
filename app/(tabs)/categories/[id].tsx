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
   await initOfflineDb(); 
    try {

      // 1. Fetch Local Data (Ensure settings is extracted from array correctly)
      const [localCat, localSubs, localProds, settingsResult] = await Promise.all([
        loadCategoryLocal(catId),
        loadSubcategoriesLocal(catId), 
        loadProductsByCategoryLocal(catId),
        execSql('SELECT * FROM app_settings LIMIT 1')
      ]);

      if (localCat) setCategory(localCat);
      setSubcategories(localSubs || []);
      setProducts(localProds || []);
      
      // FIX: Settings extraction to prevent "..." prices
      if (settingsResult && settingsResult.length > 0) {
        setSettings(settingsResult[0]);
      }

      setLoading(false);

      // 2. Background Sync
      const online = await isOnline().catch(() => false);
      if (online) {
        syncRemoteCatalog().then(async () => {
          const freshProds = await loadProductsByCategoryLocal(catId);
          if (freshProds) setProducts(freshProds);
          
          // Refresh settings for latest conversion rates
          const freshSettings = await execSql('SELECT * FROM app_settings LIMIT 1');
          if (freshSettings?.length > 0) setSettings(freshSettings[0]);
        });
      }
    } catch (err) {
      console.error('Category Load Error:', err);
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
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee'
  },
  titleContainer: { flex: 1, marginLeft: 15 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  list: { paddingHorizontal: 10, paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between' },
  
  productCard: { 
    width: COLUMN_WIDTH, 
    marginBottom: 20,
    backgroundColor: '#fff' 
  },
  imageContainer: {
    width: '100%',
    height: 240, // Height is CRITICAL for RTL visibility
    backgroundColor: '#F9F9F9',
    position: 'relative',
    overflow: 'hidden'
  },
  productImage: { width: '100%', height: '100%' },
  productInfo: { paddingVertical: 8, paddingHorizontal: 4 },
  productName: { fontSize: 12, color: '#444' },
  productPrice: { fontSize: 14, fontWeight: '900', color: '#000', marginTop: 4 },
  
  wishlistBtn: { position: 'absolute', bottom: 10, backgroundColor: 'rgba(255,255,255,0.7)', padding: 6, borderRadius: 20 },
 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#555' },

  subtitle: { fontSize: 10, color: '#999', marginTop: 2 },
  
  headerContent: { backgroundColor: '#fff' },
  subCatScroll: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  subCatCapsule: { 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    backgroundColor: '#F9F9F9', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE' 
  },
  subCatText: { fontSize: 10, fontWeight: '700', color: '#222', letterSpacing: 0.5 },
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
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  price: { fontSize: 14, fontWeight: '900', color: '#FA6338' },
  wasPrice: { fontSize: 10, color: '#BBB', textDecorationLine: 'line-through' },
  
  saleBadge: { position: 'absolute', top: 0, backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4 },
  saleText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  favBtn: { position: 'absolute', bottom: 10, backgroundColor: 'rgba(255,255,255,0.7)', padding: 6, borderRadius: 20 },
  
 
  filterBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  resultsCount: { fontSize: 11, color: '#999', fontWeight: '500' },
  filterBtn: { flexDirection: 'row', alignItems: 'center' },
  filterBtnText: { fontSize: 11, fontWeight: '800', marginRight: 4 },

 
  tagBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagText: { color: '#fff', fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },

 
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 15 },

});

