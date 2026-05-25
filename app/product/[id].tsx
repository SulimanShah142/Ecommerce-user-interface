import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/Contexts/CartContext";
import { useLanguage } from "@/Contexts/LanguageContext";
import * as ImagePicker from "expo-image-picker"; // 🎯 NEEDED FOR GALLERY HARDWARE ENTRY
import { uploadImage } from "@/lib/uploadthing"; // 🎯 POINTS DIRECTLY TO YOUR REAL UPLOADTHING HELPERS UTILITY FILE
import * as ImageManipulator from "expo-image-manipulator"; // 🎯 ENSURE THIS IS IMPORTED

const API_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";
const { width } = Dimensions.get("window");
export default function UserProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // 🎯 CORE HOOK CONTEXT BINDINGS
  const { addToCart: dispatchAddToCart } = useCart();
  const { t, isRTL, locale } = useLanguage();

  // Core Functional States
  const [product, setProduct] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Interaction States
  const [activeTab, setActiveTab] = useState<"DETAILS" | "REVIEWS">("DETAILS");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedColor, setSelectedColor] = useState<string>("Standard");
  const [userRating, setUserRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // 1. Fetch Complete Product Context data from Cloud Worker
  useEffect(() => {
    if (!id) return;

    const loadProductData = async () => {
      try {
        setLoading(true);
        const [prodRes, settingsRes, reviewsRes, similarRes] =
          await Promise.all([
            fetch(`${API_URL}/api/products/${id}`),
            fetch(`${API_URL}/api/admin/settings`),
            fetch(`${API_URL}/api/products/${id}/reviews`),
            fetch(`${API_URL}/api/products?limit=6`),
          ]);
        // Inside your loadProductData() async routine inside the useEffect hook
        const prodData = await prodRes.json();
        const settingsData = await settingsRes.json();
        const reviewsData = await reviewsRes.json();
        const similarData = await similarRes.json();

        setProduct(prodData);
        setSettings(settingsData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);

        // 🎯 THE CRITICAL CONFIGURATION FIX: Auto-select the first actual color returned from your Neon database!
        if (prodData?.availableColors && prodData.availableColors.length > 0) {
          setSelectedColor(prodData.availableColors[0]);
        } else {
          setSelectedColor("Standard"); // Reliable backup if the item lacks explicit color properties
        }

        if (Array.isArray(similarData)) {
          setSimilarProducts(
            similarData.filter((p: any) => p.id !== id).slice(0, 4),
          );
        }

        setProduct(prodData);
        setSettings(settingsData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);

        if (Array.isArray(similarData)) {
          setSimilarProducts(
            similarData.filter((p: any) => p.id !== id).slice(0, 4),
          );
        }
      } catch (err) {
        console.error("❌ Failed to parse item metrics topology:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  const finalDisplayPrice = useMemo(() => {
    if (!product) return 0;
    const rate = parseFloat(settings?.usdToAfnRate || "68");
    const margin = parseFloat(settings?.profitPercentage || "20");

    const baseAfn = parseFloat(product.usdPrice || "0") * rate;
    return Math.round(baseAfn + baseAfn * (margin / 100));
  }, [product, settings]);

  // 3. Media Upload & Review Handlers
  const handlePickAndUploadImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        // 🎯 THE ALERT FIX: Localized Permission Rejections Text Banners
        Alert.alert(
          t("permissionBlocked") || "Permission Blocked",
          t("galleryRequired") || "Gallery access is required.",
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.5,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      setUploading(true);

      const optimizedImage = await ImageManipulator.manipulateAsync(
        pickerResult.assets[0].uri,
        [{ resize: { width: 600 } }],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG },
      );

      const remoteCdnUrl = await uploadImage(optimizedImage.uri);

      if (remoteCdnUrl) {
        console.log("🚀 Secure CDN Link saved to local cache rows:", remoteCdnUrl);

        setUploadedPhotos((prevArray) => {
          const updated = [...prevArray, remoteCdnUrl];
          console.log("📸 Current local file collection stack count:", updated.length);
          return updated;
        });

        // 🎯 THE ALERT FIX: Localized Image Attachment Success
        Alert.alert(
          t("photoAttached") || "Success", 
          t("photoAttachedBody") || "Photo attached successfully!"
        );
      } else {
        throw new Error("Empty URL returned from gateway route.");
      }
    } catch (e: any) {
      console.error("❌ Media upload thread broken:", e.message);
      // 🎯 THE ALERT FIX: Localized Upload Errors
      Alert.alert(
        t("uploadStalled") || "Upload Stalled",
        t("uploadStalledBody") || "Could not complete image stream operations.",
      );
    } finally {
      setUploading(false);
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) return Alert.alert(t("error") || "Error", t("fillAllDetails") || "Please fill details.");
    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          rating: userRating,
          comment: comment.trim(),
          userId: "guest-user",
          images: uploadedPhotos,
        }),
      });

      if (res.ok) {
        // 🎯 THE ALERT FIX: Localized Review Creation Confirmed
        Alert.alert(
          t("reviewPosted") || "Success", 
          t("reviewPostedBody") || "Review Posted!"
        );
        setComment("");
        setUploadedPhotos([]);
        const freshReviews = await fetch(`${API_URL}/api/products/${id}/reviews`).then((r) => r.json());
        setReviews(freshReviews);
      }
    } catch (e) {
      // 🎯 THE ALERT FIX: Localized Review Fallback Failure
      Alert.alert(
        t("error") || "Error", 
        t("reviewFailedBody") || "Failed to publish review."
      );
    }
  };

  const addToCart = () => {
    if (!product) return;
    if (!selectedSize) {
      // 🎯 THE ALERT FIX: Localized Selection Validation Guard
      return Alert.alert(
        t("error") || "Error", 
        t("sizeRequired") || "Please select a product size before continuing."
      );
    }
    if (!selectedColor) {
      // 🎯 THE ALERT FIX: Localized Selection Validation Guard
      return Alert.alert(
        t("error") || "Error", 
        t("colorRequired") || "Please select a product color before continuing."
      );
    }

    const optimizedProductPayload = {
      ...product,
      price: finalDisplayPrice,
    };

    dispatchAddToCart(optimizedProductPayload, 1, selectedSize, selectedColor);

    // 🎯 THE ALERT FIX: Dynamic Macro Text Interpolation for Shopping Bag Feedback
    const successTemplate = t('addedToBagBody') || "{name} ({size} / {color}) has been added to your shopping bag.";
    const formattedAlertMessage = successTemplate
      .replace('{name}', product.name?.toUpperCase() || '')
      .replace('{size}', selectedSize)
      .replace('{color}', selectedColor.toUpperCase());

    Alert.alert(
      t("addedToBag") || "Added to Bag",
      formattedAlertMessage
    );
  };

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity
        key={i}
        disabled={!interactive}
        onPress={() => interactive && setUserRating(i + 1)}
      >
        <Ionicons
          name={i < rating ? "star" : "star-outline"}
          size={interactive ? 24 : 10}
          color="#000000"
          style={{ marginRight: 2 }}
        />
      </TouchableOpacity>
    ));
  };

  // 🎯 FIXED CONTAINER RETENTION: Guard statement runs perfectly inside the functional scope boundaries!
  if (loading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* IMAGE SECTION */}
          <View style={styles.imageFrameWrapper}>
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.productMediaImage}
              resizeMode="cover"
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.navCircleBtn,
                isRTL ? { right: 16 } : { left: 16 },
              ]}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={18}
                color="#000"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navCircleBtn,
                isRTL ? { left: 16 } : { right: 16 },
              ]}
            >
              <Ionicons name="share-social-outline" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          {/* INFO */}
          <View style={styles.infoContainer}>
            <View
              style={[
                styles.priceHeadlineRow,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <Text style={styles.currencyRetailPrice}>
                AFN {finalDisplayPrice.toLocaleString()}
              </Text>

              <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#FF3B30" : "#000"}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.productBrandName, isRTL && { textAlign: "right" }]}
            >
              {product.name?.toUpperCase()}
            </Text>

            <View style={styles.dividerHairline} />

            {/* SIZE */}
            {/* 🎯 SIZE SELECTOR LAYOUT HEADERS */}
            <View style={[styles.sizeMatrixHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.sizeSectionTitle}>
                {(t('selectSize') || 'SELECT SIZE').toUpperCase()}
              </Text>
              <Text style={styles.sizeGuideLabelText}>
                {(t('sizeGuide') || 'SIZE GUIDE').toUpperCase()}
              </Text>
            </View>

            <View style={[styles.sizeGridWrapper, isRTL && { flexDirection: "row-reverse" }]}>
              {["S", "M", "L", "XL"].map((size) => (
                <TouchableOpacity
                  key={`size-${size}`}
                  style={[styles.sizeItemBox, selectedSize === size && styles.sizeItemBoxActive]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 🎯 COLOR SELECTOR LAYOUT HEADERS */}
            <View style={[styles.sizeMatrixHeader, { marginTop: 15 }, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.sizeSectionTitle}>
                {(t('selectColor') || 'SELECT COLOR').toUpperCase()}
              </Text>
            </View>

            <View style={[styles.sizeGridWrapper, { flexWrap: 'wrap' }, isRTL && { flexDirection: 'row-reverse' }]}>
              {product?.availableColors && product.availableColors.length > 0 ? (
                product.availableColors.flatMap((item: string) => 
                  typeof item === 'string' ? item.split(',') : [item]
                ).map((rawColor: string) => {
                  const color = rawColor.trim();
                  if (!color) return null;
                  
                  return (
                    <TouchableOpacity 
                      key={`color-pill-separated-${color}`} 
                      style={[
                        styles.sizeItemBox, 
                        { flex: 0, minWidth: 64, paddingHorizontal: 16 }, 
                        selectedColor === color && styles.sizeItemBoxActive
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <Text style={[styles.sizeText, selectedColor === color && styles.sizeTextActive]}>
                        {color.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={[styles.sizeItemBox, styles.sizeItemBoxActive, { flex: 0, paddingHorizontal: 20 }]}>
                  <Text style={styles.sizeTextActive}>
                    {(t('standardColor') || 'STANDARD').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* 🎯 TABS SEGMENT STRIP LAYOUT */}
            <View style={[styles.segmentTabBar, isRTL && { flexDirection: "row-reverse" }]}>
              <TouchableOpacity
                style={[styles.segmentTabBtn, activeTab === "DETAILS" && styles.segmentTabBtnActive]}
                onPress={() => setActiveTab("DETAILS")}
              >
                <Text style={[styles.segmentTabText, activeTab === "DETAILS" && styles.segmentTabTextActive]}>
                  {(t('details') || 'DETAILS').toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTabBtn, activeTab === "REVIEWS" && styles.segmentTabBtnActive]}
                onPress={() => setActiveTab("REVIEWS")}
              >
                <Text style={[styles.segmentTabText, activeTab === "REVIEWS" && styles.segmentTabTextActive]}>
                  {(t('reviewsTab') || 'REVIEWS').toUpperCase()} ({reviews.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* 🎯 TAB WINDOW BODY SECTIONS CONTAINER */}
            <View style={styles.tabContentViewWrapper}>
              {activeTab === "DETAILS" ? (
                <Text style={[styles.bodyDescriptionText, isRTL && { textAlign: "right" }]}>
                  {product.description || t("noDescription") || "No description provided."}
                </Text>
              ) : (
                <View>
                  <View style={styles.reviewFormCard}>
                    <Text style={styles.formSectionTitle}>
                      {(t('shareYourExperience') || 'SHARE YOUR EXPERIENCE').toUpperCase()}
                    </Text>

                    <View style={styles.starsFormRow}>
                      {renderStars(userRating, true)}
                    </View>

                    <TextInput
                      placeholder={t("writeOpinionPlaceholder") || "Write your opinion about size, fit, or material..."}
                      placeholderTextColor="#999"
                      style={[styles.commentInputField, isRTL && { textAlign: "right" }]}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />

                    <View style={[styles.photoUploadStrip, isRTL && { flexDirection: "row-reverse" }]}>
                      <TouchableOpacity
                        style={styles.uploadBoxBtn}
                        onPress={handlePickAndUploadImage}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={18} color="#000" />
                            <Text style={styles.uploadBoxText}>
                              {(t('addPhotos') || 'ADD PHOTOS').toUpperCase()}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {Array.isArray(uploadedPhotos) &&
                          uploadedPhotos.map((url, i) => (
                            <Image
                              key={`upload-thumb-row-${i}`}
                              source={{ uri: url.toString() }}
                              style={styles.uploadedPreviewThumb}
                            />
                          ))}
                      </ScrollView>

                    </View>

                                        <TouchableOpacity
                      style={styles.submitButtonBlock}
                      onPress={submitReview}
                    >
                      <Text style={styles.submitButtonText}>
                        {(t('postClientReview') || 'POST CLIENT REVIEW').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ACTIVE FEEDBACK PREVIEWS */}
                  {reviews.length > 0 && (
                    <View style={styles.previewReviewsSection}>
                      <View style={[styles.previewHeaderRow, isRTL && { flexDirection: "row-reverse" }]}>
                        <Text style={styles.previewTitle}>
                          {(t('reviewsPreview') || 'REVIEWS PREVIEW').toUpperCase()} ({reviews.length})
                        </Text>

                        <TouchableOpacity onPress={() => router.push(`product/${id}/reviews`)}>
                          <Text style={styles.viewAllTriggerLinkText}>
                            {t('viewAllReviews') || 'VIEW ALL REVIEWS →'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalReviewsScrollWrapper}
                      >
                        {reviews.slice(0, 4).map((item: any, idx: number) => {
                          const reviewImages = item.images ? JSON.parse(item.images) : [];

                          return (
                            <View key={`review-node-${idx}`} style={styles.horizontalReviewTile}>
                              <View style={[styles.tileHeaderRow, isRTL && { flexDirection: "row-reverse" }]}>
                                <Text style={styles.buyerNameText} numberOfLines={1}>
                                  {item.userName || t('buyerVerified') || "Verified Buyer"}
                                </Text>

                                <View style={styles.starsRowWrap}>
                                  {renderStars(item.rating)}
                                </View>
                              </View>

                              <Text style={[styles.buyerCommentParagraph, isRTL && { textAlign: "right" }]} numberOfLines={3}>
                                {item.comment}
                              </Text>

                              {reviewImages.length > 0 && (
                                <View style={[styles.attachedImagesRow, isRTL && { flexDirection: "row-reverse" }]}>
                                  {reviewImages.slice(0, 2).map((imgUrl: string, imgIdx: number) => (
                                    <Image
                                      key={`preview-img-${imgIdx}`}
                                      source={{ uri: imgUrl }}
                                      style={styles.attachedReviewThumb}
                                    />
                                  ))}
                                </View>
                              )}

                              <Text style={[styles.tileFooterDate, isRTL && { textAlign: "left" }]}>
                                {new Date(item.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-AF' : (locale === 'ps' ? 'ps-AF' : 'en-US'))}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 🎯 PLACED PERMANENTLY OUTSIDE THE TABS HOUSING SWITCHER */}
            <Text style={[styles.crossSellCarouselTitle, isRTL && { textAlign: "right" }]}>
              {(t('youMightLike') || 'YOU MIGHT ALSO LIKE').toUpperCase()}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.crossSellCarouselScroll}
              contentContainerStyle={isRTL ? { flexDirection: "row-reverse" } : undefined}
            >
              {similarProducts.map((item: any) => {
                const itemUsd = parseFloat(item.usdPrice || "0");
                const appRate = parseFloat(settings?.usdToAfnRate || "68");
                const appMargin = parseFloat(settings?.profitPercentage || "20");
                const itemFinalPrice = Math.round(itemUsd * appRate * (1 + appMargin / 100));

                return (
                  <TouchableOpacity
                    key={`cross-sell-${item.id}`}
                    style={styles.crossSellCardTile}
                    onPress={() => router.replace(`product/${item.id}`)}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.crossSellThumbImage} />
                    <Text style={[styles.crossSellItemName, isRTL && { textAlign: "right" }] } numberOfLines={1}>
                      {item.name?.toUpperCase()}
                    </Text>
                    <Text style={[styles.crossSellItemPrice, isRTL && { textAlign: "right" }]}>
                      AFN {itemFinalPrice.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🎯 RESTORED ADD TO CART FUNCTIONALITY CONTROLLER */}
      <View style={styles.stickyFooterBar}>
        <TouchableOpacity 
          style={styles.callToBagBtn} 
          onPress={() => addToCart()} 
          activeOpacity={0.8}
        >
          <Ionicons name="bag-handle-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.callToBagBtnText}>
            {(t('addToBag') || 'ADD TO BAG').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  masterRootViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    minHeight: 400,
  },
  scroll: { flex: 1 },

  // 🎯 THE CRITICAL CONFIGURATION FIX: Re-declared missing layout style rule parameter!
  // This provides padding cushion space so products do not get stuck beneath your sticky add to bag tray footer
  scrollContentContainer: {
    paddingBottom: 120,
  },

  imageFrameWrapper: {
    width: "100%",
    height: 420,
    position: "relative",
    backgroundColor: "#F9F9F9",
  },

  blockedscrollContentContainer: { paddingBottom: 120 },

  productMediaImage: { width: "100%", height: "100%" },
  navCircleBtn: {
    position: "absolute",
    top: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  infoContainer: { paddingHorizontal: 20, paddingTop: 20 },
  priceHeadlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  currencyRetailPrice: { fontSize: 24, fontWeight: "900", color: "#000" },
  productBrandName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  dividerHairline: {
    height: 0.5,
    backgroundColor: "#EFEFEF",
    marginVertical: 15,
  },
  sizeMatrixHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sizeSectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1,
  },
  sizeGuideLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#999",
    textDecorationLine: "underline",
  },
  sizeGridWrapper: { flexDirection: "row", gap: 12, marginBottom: 20 },
  sizeItemBox: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },
  sizeItemBoxActive: { backgroundColor: "#000", borderColor: "#000" },
  sizeText: { fontSize: 13, fontWeight: "800", color: "#555" },
  sizeTextActive: { color: "#FFF" },
  segmentTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    marginBottom: 15,
  },
  segmentTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentTabBtnActive: { borderBottomColor: "#000" },
  segmentTabText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 1,
  },
  segmentTabTextActive: { color: "#000", fontWeight: "900" },
  tabContentViewWrapper: { minHeight: 120, marginBottom: 10 },
  bodyDescriptionText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 20,
    fontWeight: "500",
  },
  reviewFormCard: {
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1,
    marginBottom: 5,
  },
  starsFormRow: { flexDirection: "row", marginBottom: 10 },
  commentInputField: {
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
    paddingVertical: 8,
    fontSize: 13,
    color: "#000",
    marginBottom: 12,
  },
  photoUploadStrip: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  uploadBoxBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadBoxText: { fontSize: 9, fontWeight: "800", color: "#555" },
  uploadedPreviewThumb: { width: 35, height: 45, backgroundColor: "#EEE" },
  submitButtonBlock: {
    backgroundColor: "#000",
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  previewReviewsSection: {
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 15,
    marginBottom: 15,
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: { fontSize: 11, fontWeight: "900", color: "#000" },
  viewAllTriggerLinkText: {
    fontSize: 10,
    fontWeight: "900",
    textDecorationLine: "underline",
    color: "#000",
  },
  horizontalReviewsScrollWrapper: { flexDirection: "row", marginVertical: 5 },
  horizontalReviewTile: {
    width: 260,
    backgroundColor: "#FAFAFA",
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginRight: 15,
  },
  tileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  buyerNameText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111",
    flex: 1,
    marginRight: 5,
  },
  starsRowWrap: { flexDirection: "row" },
  buyerCommentParagraph: {
    fontSize: 12,
    color: "#555",
    lineHeight: 16,
    height: 48,
  },
  attachedImagesRow: { flexDirection: "row", gap: 6, marginVertical: 8 },
  attachedReviewThumb: { width: 40, height: 50, backgroundColor: "#EEE" },
  tileFooterDate: {
    fontSize: 8,
    color: "#999",
    marginTop: 4,
    fontWeight: "700",
  },
  blankStateReviewBox: { alignItems: "center", paddingVertical: 20, gap: 6 },
  blankStateReviewText: { fontSize: 11, color: "#BBB", fontWeight: "600" },
  crossSellCarouselScroll: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 40,
  },
  crossSellCardTile: { width: 160, marginRight: 18 },
  crossSellThumbImage: { width: 160, height: 210, backgroundColor: "#F8F8F8" },
  crossSellItemName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#222222",
    marginTop: 8,
  },
  crossSellItemPrice: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000000",
    marginTop: 3,
  },
  crossSellCarouselTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 1.5,
    marginTop: 15,
  },
  // 🎯 THE SECURED FIX: Permanently floating on the absolute base wrapper window
  layoutstickyFooterBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 0,
    left: 0,
    right: 0,
    height: 75,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingHorizontal: 20,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    zIndex: 100,
  },
  callToBagBtn: {
    backgroundColor: "#000000",
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 2,
  },
  callToBagBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
