import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, TouchableOpacity, 
  Alert, ActivityIndicator, Dimensions, TextInput , Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../../Contexts/CartContext';
import CachedImage from '../../../components/CachedImage';
import { 
  initOfflineDb, loadProductLocal, isOnline, 
  syncRemoteCatalog, execSql, loadProductsByCategoryLocal 
} from '../../../lib/offline';
import { useLanguage } from '../../../Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';

const API_URL = "http://192.168.1.3:8787";
const { width } = Dimensions.get('window');

export default function ProductPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { dispatch } = useCart();
  const { t, isRTL } = useLanguage();
  const { data: session } = authClient.useSession();
const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  // Core State
  const [product, setProduct] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'REVIEWS'>('DETAILS');
  
  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  // RESTORED: Parsing helper for arrays
  const parseProductData = (raw: any) => ({
    ...raw,
    availableSizes: typeof raw.availableSizes === 'string' ? JSON.parse(raw.availableSizes) : (raw.availableSizes || []),
    availableColors: typeof raw.availableColors === 'string' ? JSON.parse(raw.availableColors) : (raw.availableColors || []),
  });

  // RESTORED: Main Data Loading Function
const loadProductData = async (productId: string) => {
  try {
    await initOfflineDb(); 
    
    const product = await loadProductLocal(id);

    // 1. Fetch both from SQLite
    const [localProduct, settingsArray] = await Promise.all([
      loadProductLocal(productId),
      execSql('SELECT * FROM app_settings LIMIT 1')
    ]);

    // 2. CRITICAL FIX: Set the settings state so getDisplayPrice() works
    if (settingsArray && settingsArray.length > 0) {
      setSettings(settingsArray[0]);
    }

    if (localProduct) {
      setProduct(parseProductData(localProduct));
      
      const similar = await loadProductsByCategoryLocal(localProduct.categoryId);
      setSimilarProducts(similar.filter((p: any) => p.id !== productId).slice(0, 4));
      
      setLoading(false);
    }

    // 3. Optional: Sync fresh settings from server if online
    if (await isOnline()) {
      const sRes = await fetch(`${API_URL}/api/admin/settings`).then(r => r.json());
      if (sRes) setSettings(sRes);
    }
  } catch (err) {
    console.error("Failed to load product data:", err);
  }
};

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}/reviews`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Review fetch error", e); }
  };

  // RESTORED: Price Calculation Logic
  const getDisplayPrice = () => {
    if (!product || !settings) return "...";
    const rate = parseFloat(settings.usdToAfnRate || '65');
    const profit = parseFloat(settings.profitPercentage || '20');
    let finalPrice = parseFloat(product.usdPrice || '0') * rate * (1 + profit / 100);

    if (settings.newUserDiscountActive && session?.user?.createdAt) {
      const hours = (new Date().getTime() - new Date(session.user.createdAt).getTime()) / (1000 * 60 * 60);
      if (hours <= (parseInt(settings.discountDurationHours) || 24)) {
        settings.newUserDiscountType === 'percentage' 
          ? finalPrice *= (1 - parseFloat(settings.newUserDiscountValue) / 100)
          : finalPrice -= parseFloat(settings.newUserDiscountValue);
      }
    }
    return Math.round(finalPrice).toLocaleString();
  };

  useEffect(() => {
    if (id) {
      loadProductData(id as string);
      fetchReviews();
    }
  }, [id]);

  const submitReview = async () => {
    if (userRating === 0) return Alert.alert("Required", "Please select a star rating.");
    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: id,
          userId: session?.user?.id,
          rating: userRating,
          comment: comment.trim()
        })
      });
      if (res.ok) {
        Alert.alert("Success", "Review posted!");
        setComment('');
        setUserRating(0);
        fetchReviews();
      }
    } catch (e) { Alert.alert("Error", "Could not submit review"); }
  };

  const renderStars = (count: number, interactive = false) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} disabled={!interactive} onPress={() => setUserRating(s)}>
          <Ionicons name={s <= count ? "star" : "star-outline"} size={interactive ? 30 : 14} color="#FFC107" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const addToCart = () => {
    if (!product) return;
    if (product.availableSizes?.length > 0 && !selectedSize) return Alert.alert(t('required'), t('pleaseSelectSize'));
    dispatch({
      type: 'ADD_ITEM',
      payload: { product, quantity: 1, selectedSize, selectedColor },
    });
    Alert.alert(t('addedToBag'), `${product.name} ${t('addedSuccess')}`);
  };

  if (loading && !product) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#000" />;
  if (!product) return <View style={styles.center}><Text>Product not found</Text></View>;

const renderSimilarCard = (item: any) => {
  // Use the logic: (USD * Rate) * (1 + Profit/100)
  const rate = parseFloat(settings?.usdToAfnRate || '68');
  const profit = parseFloat(settings?.profitPercentage || '20');
  const displayPrice = Math.round(parseFloat(item.usdPrice) * rate * (1 + profit / 100));

  return (
    <TouchableOpacity 
      key={item.id} 
      style={styles.similarCard} 
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <CachedImage remoteUrl={item.imageUrl} style={styles.similarImage} />
      <Text style={styles.similarName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.similarPrice}>AFN {displayPrice.toLocaleString()}</Text>
    </TouchableOpacity>
  );
};

  return (
  <View style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
      {/* 1. IMAGE SECTION - Full width, tall aspect */}
      <View style={styles.imageContainer}>
        <CachedImage remoteUrl={product.imageUrl} style={styles.image} resizeMode="cover" />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        {/* 2. HEADER INFO */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>AFN {getDisplayPrice()}</Text>
          <TouchableOpacity>
             <Ionicons name="heart-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{product.name.toUpperCase()}</Text>

        {/* 3. SIZE SELECTOR (Crucial for SHEIN look) */}
        <View style={styles.sectionDivider} />
        <View style={styles.sizeHeader}>
          <Text style={styles.sectionTitle}>SELECT SIZE</Text>
          <Text style={styles.sizeGuide}>Size Guide</Text>
        </View>
        <View style={styles.sizeGrid}>
          {['S', 'M', 'L', 'XL'].map((size) => (
            <TouchableOpacity 
              key={size} 
              style={[styles.sizeBox, selectedSize === size && styles.sizeBoxActive]}
              onPress={() => setSelectedSize(size)}
            >
              <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. TABS */}
               {/* 4. TABS CONTENT */}
        <View style={styles.tabContentArea}>
          {activeTab === 'DETAILS' ? (
            <Text style={styles.descriptionText}>
              {product.description || "Minimalist daily wear designed for comfort and style."}
            </Text>
          ) : (
            <View>
              {/* WRITE A REVIEW SUB-SECTION */}
              <View style={styles.reviewInputCard}>
                <Text style={styles.reviewFormTitle}>SHARE YOUR THOUGHTS</Text>
                <View style={{ marginVertical: 12 }}>{renderStars(userRating, true)}</View>
                <TextInput 
                  placeholder="How is the quality and fit?" 
                  style={styles.reviewInput} 
                  value={comment} 
                  onChangeText={setComment} 
                  multiline 
                />
                <TouchableOpacity style={styles.submitReviewBtn} onPress={submitReview}>
                  <Text style={styles.submitReviewText}>POST REVIEW</Text>
                </TouchableOpacity>
              </View>

              {/* REVIEWS LIST */}
              {reviews.length > 0 ? (
                reviews.map((item, idx) => (
                  <View key={idx} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{item.userName || 'Verified Buyer'}</Text>
                      <View style={styles.starsSmall}>{renderStars(item.rating)}</View>
                    </View>
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                    <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyReviews}>
                  <Ionicons name="chatbox-outline" size={30} color="#DDD" />
                  <Text style={styles.emptyReviewsText}>No reviews yet. Be the first!</Text>
                </View>
              )}
            </View>
          )}
        </View>


        {/* 5. SIMILAR PRODUCTS */}
        <Text style={styles.relevantTitle}>YOU MIGHT ALSO LIKE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarScroll}>
          {similarProducts.map(renderSimilarCard)}
        </ScrollView>

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>

    {/* 6. STICKY FOOTER */}
    <View style={styles.footer}>
      <TouchableOpacity style={styles.cartBtn} onPress={addToCart}>
        <Text style={styles.cartBtnText}>ADD TO BAG</Text>
      </TouchableOpacity>
    </View>
  </View>
);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: width, height: width * 1.4, backgroundColor: '#F9F9F9' },
  image: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 25 },
  shareBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 25 },
  
  info: { padding: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 24, fontWeight: '800', color: '#000', letterSpacing: -0.5 },
  name: { fontSize: 13, color: '#666', marginTop: 8, letterSpacing: 0.5, lineHeight: 18 },

  sectionDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  
  // Size Selector
  sizeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sizeGuide: { fontSize: 11, color: '#999', textDecorationLine: 'underline' },
  sizeGrid: { flexDirection: 'row', gap: 10 },
  sizeBox: { width: 50, height: 40, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  sizeBoxActive: { borderColor: '#000', borderWidth: 2 },
  sizeText: { fontSize: 12, color: '#000' },
  sizeTextActive: { fontWeight: '800' },

  // Tabs
  tabContainer: { flexDirection: 'row', marginTop: 30, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabButton: { marginRight: 30, paddingBottom: 10 },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: '#000' },
  tabHeaderText: { fontSize: 12, fontWeight: '600', color: '#999' },
  activeTabHeaderText: { color: '#000' },
  tabContentArea: { paddingVertical: 20 },
  descriptionText: { fontSize: 13, color: '#444', lineHeight: 22 },

  // Similar Products Horizontal
  relevantTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginVertical: 30 },
  similarScroll: { flexDirection: 'row' },
  similarCard: { width: 140, marginRight: 12 },
  similarImage: { width: 140, height: 190, backgroundColor: '#F5F5F5' },
  similarName: { fontSize: 10, color: '#666', marginTop: 8 },
  similarPrice: { fontSize: 12, fontWeight: '700', color: '#000' },

  // Sticky Footer
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    padding: 16, 
    paddingBottom: 34, // Safe area for iPhones
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  cartBtn: { 
    flex: 1, 
    backgroundColor: '#000', 
    height: 50, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cartBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
    reviewInputCard: { backgroundColor: '#F9F9F9', padding: 15, marginBottom: 20 },
  reviewFormTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  reviewInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', padding: 12, height: 70, textAlignVertical: 'top', fontSize: 13, marginTop: 5 },
  submitReviewBtn: { backgroundColor: '#000', paddingVertical: 12, marginTop: 10, alignItems: 'center' },
  submitReviewText: { color: '#FFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 },

  // Review List Items
  reviewItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: '#222' },
  starsSmall: { transform: [{ scale: 0.8 }] }, // Make stars a bit smaller in list
  reviewComment: { fontSize: 13, color: '#555', lineHeight: 20 },
  reviewDate: { fontSize: 10, color: '#AAA', marginTop: 8 },

  // Empty State
  emptyReviews: { alignItems: 'center', paddingVertical: 40 },
  emptyReviewsText: { fontSize: 12, color: '#999', marginTop: 10 },
  
  similarScroll: { paddingLeft: 16 }
});
