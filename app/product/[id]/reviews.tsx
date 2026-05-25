import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/Contexts/LanguageContext';

const { width } = Dimensions.get('window');
const API_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";

export default function SpecializedProductReviewsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL, locale } = useLanguage(); // 🎯 RESTORED MASTER DICTIONARY BINDINGS

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/products/${id}/reviews`)
      .then(res => res.json())
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  // Calculate high-conversion aggregate store score numbers overview index matching standard e-commerce designs
  const aggregateScoreMetrics = useMemo(() => {
    if (reviews.length === 0) return { avg: "5.0", label: t('reviewsPreview') || "Excellent Feedback" };
    const sum = reviews.reduce((acc, item) => acc + (item.rating || 5), 0);
    const average = (sum / reviews.length).toFixed(1);
    
    // 🎯 TRANSLATED QUALITY MARKS
    return {
      avg: average,
      label: parseFloat(average) >= 4.2 
        ? (locale === 'en' ? "HIGH RATED PIECE" : (locale === 'fa' ? "محصول با امتیاز بالا" : "لوړ رتبه شوی محصول")) 
        : (locale === 'en' ? "STANDARD GALLERY GOODS" : (locale === 'fa' ? "جنس استاندارد گالری" : "معیاري برانډ شوي توکي"))
    };
  }, [reviews, locale]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < rating ? "star" : "star-outline"} size={10} color="#000000" style={{ marginRight: 1 }} />
    ));
  };

  // Convert standard JS date to localized locale string parameters dynamically
  const getLocalizedDateStr = (dateInput: any) => {
    if (!dateInput) return '';
    const dateObj = new Date(dateInput);
    
    // Fall back to clean default if native parameters are locked down
    const defaultLocaleTag = locale === 'fa' ? 'fa-AF' : (locale === 'ps' ? 'ps-AF' : 'en-US');
    return dateObj.toLocaleDateString(defaultLocaleTag, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* MONOCHROME MINIMALIST HEADER ROW */}
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#000" />
        </TouchableOpacity>
        {/* 🎯 TRANSLATED MAIN HEADER */}
        <Text style={styles.headerTitleText}>{(t('reviews') || 'CUSTOMER REVIEWS').toUpperCase()}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* OVERALL STORE RATING MATRICES HIGHLIGHT BOX */}
      <View style={styles.scoreOverviewCard}>
        <View style={[styles.scoreCluster, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.bigScoreText}>{aggregateScoreMetrics.avg}</Text>
          <Text style={styles.outOfText}>/5</Text>
        </View>
        <View style={[{ gap: 2 }, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={styles.scoreLabelText}>{aggregateScoreMetrics.label}</Text>
          {/* 🎯 DICTIONARY TRANSLATIONS EMBEDDED SAFELY */}
          <Text style={styles.totalReviewsCount}>
            {locale === 'en' && `Based on ${reviews.length} authentic e-commerce logs`}
            {locale === 'fa' && `بر اساس ${reviews.length} نظر واقعی ثبت شده خریداران`}
            {locale === 'ps' && `د پیرودونکو د ${reviews.length} تایید شوي نظرونو پر بنسټ`}
          </Text>
        </View>
      </View>

      {/* DEEP DETAILED REVIEWS STREAM TIMELINE */}
      <FlatList
        data={reviews}
        keyExtractor={(item, index) => `all-review-${item.id || index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const attachments: string[] = item.images ? JSON.parse(item.images) : [];
          return (
            <View style={styles.fullReviewRowCard}>
              <View style={[styles.cardTopRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.buyerMetaBox, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.initialsCircle}><Text style={styles.initialsText}>{(item.userName || 'B')[0].toUpperCase()}</Text></View>
                  <Text style={styles.buyerRosterName}>{item.userName || t('buyerVerified') || 'Verified Buyer'}</Text>
                </View>
                <View style={styles.starsClusterRow}>{renderStars(item.rating)}</View>
              </View>

              <Text style={[styles.commentBodyText, isRTL && { textAlign: 'right' }]}>{item.comment}</Text>
              
              {/* Image attachment layouts grid display nodes expansion links */}
              {attachments.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaCarouselRow} contentContainerStyle={{ gap: 10 }}>
                  {attachments.map((imgUrl, fileIdx) => (
                    <Image key={`attachment-grid-${fileIdx}`} source={{ uri: imgUrl }} style={styles.expandedReviewMediaAsset} />
                  ))}
                </ScrollView>
              )}
              
              {/* 🎯 TRANSLATED LOGIC CALENDAR TIME STAMP STRINGS */}
              <Text style={[styles.timestampLabel, isRTL && { textAlign: 'left' }]}>
                {getLocalizedDateStr(item.createdAt)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.blankBox}>
            <Ionicons name="chatbox-ellipses-outline" size={40} color="#CCC" />
            {/* 🎯 TRANSLATED BLANK STATE MESSAGES */}
            <Text style={styles.blankText}>{t('noReviewsYet') || 'No entries stored inside review buckets.'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', backgroundColor: '#FFFFFF' },
  backBtn: { padding: 4 },
  headerTitleText: { fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 2 },
  
  scoreOverviewCard: { flexDirection: 'row', padding: 20, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center', gap: 20 },
  scoreCluster: { flexDirection: 'row', alignItems: 'baseline' },
  bigScoreText: { fontSize: 32, fontWeight: '900', color: '#000000' },
  outOfText: { fontSize: 14, fontWeight: '700', color: '#999999', marginLeft: 2 },
  scoreLabelText: { fontSize: 10, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  totalReviewsCount: { fontSize: 11, color: '#888888', fontWeight: '500', marginTop: 2 },
  
  listContainer: { padding: 20 },
  fullReviewRowCard: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#FAFAFA', marginBottom: 20 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  buyerMetaBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  initialsCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  initialsText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  buyerRosterName: { fontSize: 11, fontWeight: '800', color: '#222222' },
  starsClusterRow: { flexDirection: 'row' },
  commentBodyText: { fontSize: 13, color: '#444444', lineHeight: 20, fontWeight: '400', marginBottom: 12 },
  
  mediaCarouselRow: { flexDirection: 'row', marginBottom: 12 },
  expandedReviewMediaAsset: { width: 85, height: 115, backgroundColor: '#F5F5F5' },
  timestampLabel: { fontSize: 9, color: '#999999', fontWeight: '700', marginTop: 4, letterSpacing: 0.2 },
  
  blankBox: { alignItems: 'center', marginTop: 150, gap: 12, paddingHorizontal: 40 },
  blankText: { fontSize: 11, color: '#999999', fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, lineHeight: 16 }
});
