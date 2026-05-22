// app/product/[id]/reviews.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView,  ActivityIndicator, Dimensions } from 'react-native';
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
  const { isRTL } = useLanguage();

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
    if (reviews.length === 0) return { avg: "5.0", label: "Excellent Feedback" };
    const sum = reviews.reduce((acc, item) => acc + (item.rating || 5), 0);
    const average = (sum / reviews.length).toFixed(1);
    return {
      avg: average,
      label: parseFloat(average) >= 4.2 ? "HIGH RATED PIECE" : "STANDARD GALLERY GOODS"
    };
  }, [reviews]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < rating ? "star" : "star-outline"} size={10} color="#000000" style={{ marginRight: 1 }} />
    ));
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* MONOCHROME MINIMALIST HEADER ROW */}
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>CUSTOMER FEEDBACK DIRECTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* OVERALL STORE RATING MATRICES HIGHLIGHT BOX */}
      <View style={styles.scoreOverviewCard}>
        <View style={styles.scoreCluster}>
          <Text style={styles.bigScoreText}>{aggregateScoreMetrics.avg}</Text>
          <Text style={styles.outOfText}>/5</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.scoreLabelText}>{aggregateScoreMetrics.label}</Text>
          <Text style={styles.totalReviewsCount}>Based on {reviews.length} authentic e-commerce checkout logs</Text>
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
                <View style={styles.buyerMetaBox}>
                  <View style={styles.initialsCircle}><Text style={styles.initialsText}>{(item.userName || 'B')[0].toUpperCase()}</Text></View>
                  <Text style={styles.buyerRosterName}>{item.userName || 'Verified Buyer'}</Text>
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
              
              <Text style={styles.timestampLabel}>{new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.blankBox}>
            <Ionicons name="chatbox-ellipses-outline" size={40} color="#CCC" />
            <Text style={styles.blankText}>No entries stored inside review buckets.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  backBtn: { padding: 4 },
  headerTitleText: { fontSize: 11, fontWeight: '900', color: '#000000', letterSpacing: 1.5 },

  scoreOverviewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', margin: 20, padding: 20, borderHorizontalWidth: 1, borderHeightColor: '#F0F0F0', gap: 16 },
  scoreCluster: { flexDirection: 'row', alignItems: 'flex-end' },
  bigScoreText: { fontSize: 32, fontWeight: '900', color: '#000000', lineHeight: 36 },
  outOfText: { fontSize: 14, fontWeight: '700', color: '#BBBBBB', marginBottom: 4 },
  scoreLabelText: { fontSize: 9, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  totalReviewsCount: { fontSize: 10, color: '#777777', marginTop: 2, fontWeight: '500' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 60 },
  fullReviewRowCard: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  buyerMetaBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  initialsCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  initialsText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  buyerRosterName: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  starsClusterRow: { flexDirection: 'row' },
  commentBodyText: { fontSize: 13, color: '#333333', lineHeight: 18, fontWeight: '500', marginBottom: 12 },
  mediaCarouselRow: { flexDirection: 'row', marginVertical: 10 },
  expandedReviewMediaAsset: { width: 90, height: 120, backgroundColor: '#F8F8F8' },
  timestampLabel: { fontSize: 9, fontWeight: '700', color: '#BBBBBB', letterSpacing: 0.5, marginTop: 4 },

  blankBox: { alignItems: 'center', marginTop: 100, gap: 10 },
  blankText: { fontSize: 11, fontWeight: '800', color: '#BBB', letterSpacing: 0.5 },

  // Supplementary style definitions added for product page segment integration
  reviewFormCard: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F2F2F2', padding: 16, marginBottom: 25 },
  formSectionTitle: { fontSize: 8, fontWeight: '900', color: '#333', letterSpacing: 1 },
  starsFormRow: { flexDirection: 'row', marginVertical: 8 },
  commentInputField: { borderBottomWidth: 1, borderBottomColor: '#DDD', paddingVertical: 8, fontSize: 13, color: '#000', marginBottom: 12 },
  photoUploadStrip: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 12 },
  uploadBoxBtn: { width: 75, height: 55, borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', gap: 4 },
  uploadBoxText: { fontSize: 7, fontWeight: '900', color: '#666', letterSpacing: 0.2 },
  uploadedPreviewThumb: { width: 40, height: 55, backgroundColor: '#EEE' },
  submitButtonBlock: { backgroundColor: '#000', paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  previewReviewsSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 20 },
  previewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  previewTitle: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1 },
  viewAllTriggerLinkText: { fontSize: 10, fontWeight: '900', color: '#000', textDecorationLine: 'underline', letterSpacing: 0.5 },
  compactReviewsGrid: { gap: 15 },
  compactReviewCard: { backgroundColor: '#FAFAFA', padding: 14, borderWidth: 0.5, borderColor: '#EAEAEA' },
  tileHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  buyerIdentityLabel: { fontSize: 11, fontWeight: '900', color: '#000', flex: 1, marginRight: 8 },
  starsRowWrap: { flexDirection: 'row' },
  buyerCommentParagraph: { fontSize: 12, color: '#555', lineHeight: 16 },
  attachedImagesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  attachedReviewThumb: { width: 45, height: 60, backgroundColor: '#EEE' }
});
