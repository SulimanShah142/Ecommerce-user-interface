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
import * as ImagePicker from 'expo-image-picker'; // 🎯 NEEDED FOR GALLERY HARDWARE ENTRY
import { uploadImage } from '@/lib/uploadthing'; // 🎯 POINTS DIRECTLY TO YOUR REAL UPLOADTHING HELPERS UTILITY FILE
import * as ImageManipulator from 'expo-image-manipulator'; // 🎯 ENSURE THIS IS IMPORTED


const API_URL = "http://192.168.1.3:8787";
  const { width } = Dimensions.get('window');
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

        const prodData = await prodRes.json();
        const settingsData = await settingsRes.json();
        const reviewsData = await reviewsRes.json();
        const similarData = await similarRes.json();

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

  // 2. Computed Converted Afghani Retails Pricing
  const finalDisplayPrice = useMemo(() => {
    if (!product) return 0;
    const rate = parseFloat(settings?.usdToAfnRate || "68");
    const margin = parseFloat(settings?.profitPercentage || "20");

    const baseAfn = parseFloat(product.usdPrice || "0") * rate;
    return Math.round(baseAfn + baseAfn * (margin / 100));
  }, [product, settings]);

  // 3. Media Upload & Review Handlers
  // app/product/[id].tsx -> Core Interaction Logic Block
const handlePickAndUploadImage = async () => {
  try {
    // 1. Request gallery permissions from the hardware device OS
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t("error") || "Permission Blocked", "Gallery permissions are required to attach review images.");
      return;
    }

    // 2. Launch native mobile camera roll selection sheet
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5, // Initial fast compression pass
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      console.log("📸 Image picker cancelled by customer.");
      return;
    }

    const selectedAsset = pickerResult.assets[0];
    
    // Trigger progress loading feedback spinners instantly
    setUploading(true);
    console.log("🖼️ Raw image locked, starting on-device optimization pass...");

    // 3. 🎯 THE SPEED FIX: Manipulate and shrink the asset uri before uploading!
    // Scales the image to 600px width and strips quality to a lightweight 30% compressed JPEG binary
    const optimizedImage = await ImageManipulator.manipulateAsync(
      selectedAsset.uri,
      [{ resize: { width: 600 } }], // Keeps aspect ratio intact while down-sizing width boundary
      { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG } // Sharp web compression ratio
    );

    console.log("⚡ Optimization complete. Scaled file path:", optimizedImage.uri);
    console.log("📤 Pushing lightweight compressed image through UploadThing endpoints...");

    // 4. Send the super-lightweight compressed local image URI onto your edge network
    const remoteCdnUrl = await uploadImage(optimizedImage.uri);

    if (remoteCdnUrl) {
      console.log("✅ Upload successful. CDN Link secured:", remoteCdnUrl);
      
      // Save the direct uploaded image link string token directly inside your view state array rows
      setUploadedPhotos((prev) => [...prev, remoteCdnUrl]);
    } else {
      throw new Error("UploadThing structural routing error");
    }

  } catch (e: any) {
    console.error("❌ High-speed review media upload failed:", e.message);
    Alert.alert(t("error") || "Upload Stalled", "Could not process review image storage across edge node endpoints.");
  } finally {
    setUploading(false); // Shut down progress loading spin indicators instantly
  }
};


  const submitReview = async () => {
    if (!comment.trim()) return Alert.alert(t("error"), t("fillAllDetails"));
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
        Alert.alert(t("success"), "Review Posted!");
        setComment("");
        setUploadedPhotos([]);
        const freshReviews = await fetch(
          `${API_URL}/api/products/${id}/reviews`,
        ).then((r) => r.json());
        setReviews(freshReviews);
      }
    } catch (e) {
      Alert.alert(t("error"), "Failed to publish review.");
    }
  };

  const addToCart = () => {
    if (!product) return;
    if (!selectedSize) {
      return Alert.alert(
        t("error") || "Error",
        "Please select a product size before continuing.",
      );
    }

    const optimizedProductPayload = {
      ...product,
      price: finalDisplayPrice,
    };

    dispatchAddToCart(optimizedProductPayload, 1, selectedSize, selectedColor);

    Alert.alert(
      t("success") || "Added",
      `${product.name?.toUpperCase()} (${selectedSize}) has been added to your shopping bag.`,
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
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
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
            <View
              style={[
                styles.sizeMatrixHeader,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <Text style={styles.sizeSectionTitle}>
                {/* 🎯 THE FIX: Changed 'language === "English"' to 'locale === "en"' */}
                {locale === "en" ? "SELECT SIZE" : "اندازه را انتخاب کنید"}
              </Text>

              <Text style={styles.sizeGuideLabelText}>SIZE GUIDE</Text>
            </View>

            <View
              style={[
                styles.sizeGridWrapper,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              {["S", "M", "L", "XL"].map((size) => (
                <TouchableOpacity
                  key={`size-${size}`}
                  style={[
                    styles.sizeItemBox,
                    selectedSize === size && styles.sizeItemBoxActive,
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selectedSize === size && styles.sizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TABS */}
            <View
              style={[
                styles.segmentTabBar,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.segmentTabBtn,
                  activeTab === "DETAILS" && styles.segmentTabBtnActive,
                ]}
                onPress={() => setActiveTab("DETAILS")}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    activeTab === "DETAILS" && styles.segmentTabTextActive,
                  ]}
                >
                  {/* 🎯 THE FIX: Changed 'language === "English"' to 'locale === "en"' */}
                  {locale === "en" ? "DETAILS" : "جزئیات"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTabBtn,
                  activeTab === "REVIEWS" && styles.segmentTabBtnActive,
                ]}
                onPress={() => setActiveTab("REVIEWS")}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    activeTab === "REVIEWS" && styles.segmentTabTextActive,
                  ]}
                >
                  REVIEWS ({reviews.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT */}
            <View style={styles.tabContentViewWrapper}>
              {activeTab === "DETAILS" ? (
                <Text
                  style={[
                    styles.bodyDescriptionText,
                    isRTL && { textAlign: "right" },
                  ]}
                >
                  {product.description ||
                    t("noDescription") ||
                    "No description provided."}
                </Text>
              ) : (
                <View>
                  {/* REVIEW FORM */}
                  <View style={styles.reviewFormCard}>
                    <Text style={styles.formSectionTitle}>
                      SHARE YOUR EXPERIENCE
                    </Text>

                    <View style={styles.starsFormRow}>
                      {renderStars(userRating, true)}
                    </View>

                    <TextInput
                      placeholder={
                        t("typeMessage") ||
                        "Write your opinion about size, fit, or material..."
                      }
                      placeholderTextColor="#999"
                      style={[
                        styles.commentInputField,
                        isRTL && { textAlign: "right" },
                      ]}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />

                    {/* UPLOAD */}
                    <View
                      style={[
                        styles.photoUploadStrip,
                        isRTL && {
                          flexDirection: "row-reverse",
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.uploadBoxBtn}
                        onPress={handlePickAndUploadImage}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <Ionicons
                              name="camera-outline"
                              size={18}
                              color="#000"
                            />
                            <Text style={styles.uploadBoxText}>ADD PHOTOS</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {uploadedPhotos.map((url, i) => (
                          <Image
                            key={`upload-thumb-${i}`}
                            source={{ uri: url }}
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
                        POST CLIENT REVIEW
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* REVIEWS */}
                  {reviews.length > 0 ? (
                    <View style={styles.previewReviewsSection}>
                      <View
                        style={[
                          styles.previewHeaderRow,
                          isRTL && {
                            flexDirection: "row-reverse",
                          },
                        ]}
                      >
                        <Text style={styles.previewTitle}>
                          REVIEWS PREVIEW ({reviews.length})
                        </Text>

                        <TouchableOpacity
                          onPress={() => router.push(`/product/${id}/reviews`)}
                        >
                          <Text style={styles.viewAllTriggerLinkText}>
                            VIEW ALL REVIEWS →
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[
                          isRTL && {
                            flexDirection: "row-reverse",
                          },
                        ]}
                        style={styles.horizontalReviewsScrollWrapper}
                      >
                        {reviews.slice(0, 4).map((item: any, idx: number) => {
                          let reviewImages: string[] = [];

                          try {
                            reviewImages = Array.isArray(item.images)
                              ? item.images
                              : JSON.parse(item.images || "[]");
                          } catch {
                            reviewImages = [];
                          }

                          return (
                            <View
                              key={`review-node-${idx}`}
                              style={styles.horizontalReviewTile}
                            >
                              <View
                                style={[
                                  styles.tileHeaderRow,
                                  isRTL && {
                                    flexDirection: "row-reverse",
                                  },
                                ]}
                              >
                                <Text
                                  style={styles.buyerNameText}
                                  numberOfLines={1}
                                >
                                  {item.userName || "Verified Buyer"}
                                </Text>

                                <View style={styles.starsRowWrap}>
                                  {renderStars(item.rating)}
                                </View>
                              </View>

                              <Text
                                style={[
                                  styles.buyerCommentParagraph,
                                  isRTL && {
                                    textAlign: "right",
                                  },
                                ]}
                                numberOfLines={3}
                              >
                                {item.comment}
                              </Text>

                              {reviewImages.length > 0 && (
                                <View
                                  style={[
                                    styles.attachedImagesRow,
                                    isRTL && {
                                      flexDirection: "row-reverse",
                                    },
                                  ]}
                                >
                                  {reviewImages
                                    .slice(0, 2)
                                    .map((imgUrl: string, imgIdx: number) => (
                                      <Image
                                        key={`preview-img-${imgIdx}`}
                                        source={{
                                          uri: imgUrl,
                                        }}
                                        style={styles.attachedReviewThumb}
                                      />
                                    ))}
                                </View>
                              )}

                              <Text
                                style={[
                                  styles.tileFooterDate,
                                  isRTL && {
                                    textAlign: "left",
                                  },
                                ]}
                              >
                                {new Date(item.createdAt).toLocaleDateString()}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : (
                    <View style={styles.blankStateReviewBox}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color="#BBB"
                      />

                      <Text style={styles.blankStateReviewText}>
                        No reviews yet. Be the first to rate this piece.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* SIMILAR PRODUCTS */}
            <Text
              style={[
                styles.crossSellCarouselTitle,
                isRTL && { textAlign: "right" },
              ]}
            >
              {(t("justForYou") || "YOU MIGHT ALSO LIKE").toUpperCase()}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                isRTL && { flexDirection: "row-reverse" },
              ]}
              style={styles.crossSellCarouselScroll}
            >
              {similarProducts.map((item: any) => {
                const itemPrice = Math.round(
                  parseFloat(item.usdPrice || "0") *
                    parseFloat(settings?.usdToAfnRate || "65") *
                    (1 + parseFloat(settings?.profitPercentage || "20") / 100),
                );

                return (
                  <TouchableOpacity
                    key={`cross-sell-${item.id}`}
                    style={styles.crossSellCardTile}
                    onPress={() => router.replace(`/product/${item.id}`)}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.crossSellThumbImage}
                    />

                    <Text style={styles.crossSellItemName} numberOfLines={1}>
                      {item.name?.toUpperCase()}
                    </Text>

                    <Text style={styles.crossSellItemPrice}>
                      AFN {itemPrice.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER */}
      <View style={styles.stickyFooterBar}>
        <TouchableOpacity
          style={styles.callToBagBtn}
          onPress={addToCart}
          activeOpacity={0.9}
        >
          <Ionicons
            name="bag-handle-outline"
            size={15}
            color="#FFF"
            style={{ marginRight: 8 }}
          />

          <Text style={styles.callToBagBtnText}>
            {(t("addToCart") || "ADD TO BAG").toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  scroll: { flex: 1 },

  // Image Framework
  imageFrameWrapper: {
    width: "100%",
    aspectRatio: 3 / 4,
    position: "relative",
    backgroundColor: "#FAFAFA",
  },
  productMediaImage: { width: "100%", height: "100%" },
  navCircleBtn: {
    position: "absolute",
    top: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },

  // Information layouts
  infoContainer: { paddingHorizontal: 16, paddingTop: 20 },
  priceHeadlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  viewAllTriggerLinkText: {
    fontSize: 10,
    color: "#666666",
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  photoUploadStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },

  uploadBoxBtn: {
    width: 88,
    height: 88,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadBoxText: {
    fontSize: 9,
    color: "#333333",
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.5,
  },

  uploadedPreviewThumb: {
    width: 88,
    height: 88,
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
  },

  previewReviewsSection: {
    marginTop: 8,
  },

  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  previewTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: 1,
  },

  attachedImagesRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 6,
  },

  attachedReviewThumb: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: "#EEEEEE",
  },
  currencyRetailPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: 0.5,
  },
  productBrandName: {
    fontSize: 13,
    color: "#333333",
    fontWeight: "500",
    letterSpacing: 1.2,
    lineHeight: 18,
  },
  dividerHairline: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 18,
  },

  // Size selectors
  sizeMatrixHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sizeSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 1,
  },
  sizeGuideLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#777777",
    textDecorationLine: "underline",
    letterSpacing: 0.5,
  },
  sizeGridWrapper: { flexDirection: "row", gap: 10 },
  sizeItemBox: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 2,
  },
  sizeItemBoxActive: { borderColor: "#000000", backgroundColor: "#000000" },
  sizeText: { fontSize: 11, fontWeight: "600", color: "#555555" },
  sizeTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Segmentation tabs
  segmentTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginTop: 26,
    gap: 24,
  },
  segmentTabBtn: { paddingBottom: 10, position: "relative" },
  segmentTabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#000000" },
  segmentTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999999",
    letterSpacing: 1,
  },
  segmentTabTextActive: { color: "#000000", fontWeight: "800" },
  tabContentViewWrapper: { paddingTop: 16, minHeight: 120 },
  bodyDescriptionText: {
    fontSize: 12,
    color: "#444444",
    lineHeight: 20,
    letterSpacing: 0.4,
  },

  // Reviews Module
  reviewFormCard: {
    backgroundColor: "#FAFAFA",
    padding: 14,
    borderRadius: 2,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#222",
  },
  starsFormRow: { flexDirection: "row", marginVertical: 8 },
  commentInputField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 2,
    padding: 10,
    fontSize: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  submitButtonBlock: {
    backgroundColor: "#111111",
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderRadius: 2,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  horizontalReviewsScrollWrapper: { flexDirection: "row", marginVertical: 8 },
  horizontalReviewTile: {
    width: width * 0.7,
    backgroundColor: "#FAFAFA",
    padding: 12,
    marginRight: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  tileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  buyerNameText: { fontSize: 11, fontWeight: "700", color: "#333" },
  starsRowWrap: { flexDirection: "row" },
  buyerCommentParagraph: {
    fontSize: 11,
    color: "#555555",
    lineHeight: 16,
    height: 48,
  },
  tileFooterDate: { fontSize: 9, color: "#AAAAAA", marginTop: 4 },
  blankStateReviewBox: { alignItems: "center", paddingVertical: 20, gap: 6 },
  blankStateReviewText: { fontSize: 11, color: "#999999" },

  // Cross Sells
  crossSellCarouselTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 14,
  },
  crossSellCarouselScroll: { flexDirection: "row", marginBottom: 100 },
  crossSellCardTile: { width: (width - 44) / 3, marginRight: 12 },
  crossSellThumbImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#FAFAFA",
    borderRadius: 2,
  },
  crossSellItemName: {
    fontSize: 9,
    fontWeight: "500",
    color: "#333",
    marginTop: 6,
  },
  crossSellItemPrice: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000",
    marginTop: 2,
  },

  // Sticky Footers
  stickyFooterBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  callToBagBtn: {
    backgroundColor: "#000000",
    height: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 2,
  },
  callToBagBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});
