import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/Contexts/LanguageContext';

const { width } = Dimensions.get('window');
const API_URL = "http://192.168.1.3:8787";

export default function SpecializedProductReviewsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL, locale } = useLanguage(); 

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

  const aggregateScoreMetrics = useMemo(() => {
    if (reviews.length === 0) return { avg: "5.0", label: t('reviewsPreview') || "Excellent Feedback" };
    const sum = reviews.reduce((acc, item) => acc + (item.rating || 5), 0);
    const average = (sum / reviews.length).toFixed(1);
    
    return {
      avg: average,
      label: parseFloat(average) >= 4.2 
        ? (locale === 'en' ? "HIGH RATED PIECE" : (locale === 'fa' ? "محصول با امتیاز بالا" : "لوړ رتبه شوی محصول")) 
        : (locale === 'en' ? "STANDARD GALLERY GOODS" : (locale === 'fa' ? "جنس استاندارد گالری" : "معیاري برانډ شوي توکي"))
    };
  }, [reviews, locale, t]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < rating ? "star" : "star-outline"} size={10} color="#000000" style={{ marginRight: 1 }} />
    ));
  };

  const getLocalizedDateStr = (dateInput: any) => {
    if (!dateInput) return '';
    const dateObj = new Date(dateInput);
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
          // 🎯 THE RESILIENCE FIX: Robust string-to-array safe conversion layer
          let attachments: string[] = [];
          try {
            if (Array.isArray(item.images)) {
              attachments = item.images;
            } else if (typeof item.images === 'string' && item.images.trim().length > 0) {
              // Extract data parameters safely whether string wrapped or comma separated
              if (item.images.startsWith('[') || item.images.startsWith('{')) {
                attachments = JSON.parse(item.images);
              } else {
                attachments = item.images.split(',').map((s: string) => s.trim());
              }
            }
          } catch (e) {
            console.warn("⚠️ Image array layout parsing deferred:", e);
          }

          return (
            <View style={styles.fullReviewRowCard}>
              <View style={[styles.cardTopRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.buyerMetaBox, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.initialsCircle}>
                    <Text style={styles.initialsText}>{(item.userName || 'B')[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.buyerRosterName}>{item.userName || t('buyerVerified') || 'Verified Buyer'}</Text>
                </View>
                <View style={styles.starsClusterRow}>{renderStars(item.rating)}</View>
              </View>

              <Text style={[styles.commentBodyText, isRTL && { textAlign: 'right' }]}>{item.comment}</Text>
              
              {/* 🎯 SHEIN STYLE VISUAL IMAGE GRID CAROUSEL SLOTS */}
              {attachments.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.mediaCarouselRow} 
                  contentContainerStyle={styles.mediaCarouselContainer}
                >
                  {attachments.map((imgUrl, fileIdx) => {
                    if (!imgUrl || !imgUrl.trim()) return null;
                    return (
                      <View key={`attachment-frame-${fileIdx}`} style={styles.imageFrameThumbnail}>
                        <Image 
                          source={{ uri: imgUrl.trim() }} 
                          style={styles.expandedReviewMediaAsset} 
                          resizeMode="cover"
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              
              <Text style={[styles.timestampLabel, isRTL && { textAlign: 'left' }]}>
                {getLocalizedDateStr(item.createdAt)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.blankBox}>
            <Ionicons name="chatbox-ellipses-outline" size={40} color="#CCC" />
            <Text style={styles.blankText}>{t('noReviewsYet') || 'No entries stored inside review buckets.'}</Text>
          </View>
        }
      />
    </View>
  );
}

// 🎯 HARDENED MONOCHROME REVIEWS TIMELINE STYLES SHEET
const styles = StyleSheet.create({

  // 🎯 ROOT CONTAINER
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  // 🎯 PREMIUM FLOATING HEADER
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 18,
    paddingBottom: 16,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,

    elevation: 2,
  },

  backBtn: {
    width: 38,
    height: 38,

    borderRadius: 19,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#F8F8F8',
  },

  headerTitleText: {
    fontSize: 15,

    fontWeight: '900',

    color: '#111111',

    letterSpacing: 1,
  },

  // 🎯 PREMIUM SCORE CARD
  scoreOverviewCard: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 10,

    borderRadius: 22,

    padding: 22,

    backgroundColor: '#FAFAFA',

    borderWidth: 1,
    borderColor: '#F0F0F0',

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,

    elevation: 2,
  },

  scoreCluster: {
    flexDirection: 'row',
    alignItems: 'baseline',

    marginRight: 20,
  },

  bigScoreText: {
    fontSize: 42,

    fontWeight: '900',

    color: '#000000',
  },

  outOfText: {
    fontSize: 16,

    fontWeight: '700',

    color: '#999999',

    marginLeft: 3,
  },

  scoreLabelText: {
    fontSize: 13,

    fontWeight: '800',

    color: '#111111',

    marginBottom: 4,

    letterSpacing: 0.4,
  },

  totalReviewsCount: {
    fontSize: 11,

    color: '#777777',

    lineHeight: 17,

    fontWeight: '500',
  },

  // 🎯 LIST CONTAINER
  listContainer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },

  // 🎯 PREMIUM REVIEW CARD
  fullReviewRowCard: {
    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 18,

    marginBottom: 18,

    borderWidth: 1,
    borderColor: '#F2F2F2',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.035,
    shadowRadius: 10,

    elevation: 2,
  },

  // 🎯 CARD HEADER
  cardTopRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 14,
  },

  buyerMetaBox: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,
  },

  // 🎯 PREMIUM AVATAR
  initialsCircle: {
    width: 38,
    height: 38,

    borderRadius: 19,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#111111',
  },

  initialsText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',
  },

  buyerRosterName: {
    fontSize: 13,

    fontWeight: '800',

    color: '#111111',
  },
  // 🎯 STAR ROW
  starsClusterRow: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  // 🎯 COMMENT BODY
  commentBodyText: {
    fontSize: 14,

    color: '#333333',

    lineHeight: 24,

    fontWeight: '400',

    marginBottom: 14,
  },

  // 🎯 MEDIA STRIP
  mediaCarouselRow: {
    marginTop: 2,
    marginBottom: 16,
  },

  mediaCarouselContainer: {
    paddingRight: 10,
  },

  // 🎯 PREMIUM IMAGE CARD
  imageFrameThumbnail: {
    width: 100,
    height: 132,

    marginRight: 12,

    borderRadius: 16,

    overflow: 'hidden',

    backgroundColor: '#F6F6F6',

    borderWidth: 1,
    borderColor: '#EFEFEF',
  },

  expandedReviewMediaAsset: {
    width: '100%',
    height: '100%',
  },

  // 🎯 REVIEW FOOTER
  timestampLabel: {
    fontSize: 10,

    color: '#999999',

    fontWeight: '600',

    letterSpacing: 0.2,
  },

  // 🎯 EMPTY STATE
  blankBox: {
    marginTop: 140,

    alignItems: 'center',

    paddingHorizontal: 40,
  },

  blankText: {
    marginTop: 14,

    fontSize: 13,

    color: '#888888',

    fontWeight: '500',

    textAlign: 'center',

    lineHeight: 20,
  },

  // 🎯 OPTIONAL VERIFIED PURCHASE TAG
  verifiedTag: {
    marginTop: 6,

    alignSelf: 'flex-start',

    backgroundColor: '#F5F5F5',

    borderRadius: 20,

    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  verifiedTagText: {
    fontSize: 9,

    fontWeight: '800',

    color: '#111111',

    letterSpacing: 0.3,
  },

  // 🎯 OPTIONAL REVIEW METRICS
  reviewMetaRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 10,

    gap: 16,
  },

  reviewMetaText: {
    fontSize: 11,

    color: '#777777',

    fontWeight: '600',
  },

});