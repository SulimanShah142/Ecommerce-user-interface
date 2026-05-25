import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Alert, Platform, Modal } from 'react-native';
import { useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";
import { authClient } from "@/lib/auth-client";
import { useCart } from '../Contexts/CartContext';
import UnifiedMap from '@/components/UnifiedMap';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const API_URL = "https://workers.dev";

export default function CheckoutScreen() {
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();
  const { data: session } = authClient.useSession();
  const { clearCart, state } = useCart(); 

  const cartItems = state?.items || []; 

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [coords, setCoords] = useState<[number, number]>([34.5553, 69.2075]);
  
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // 🎯 GOOGLE PLAY / APPLE APP STORE COMPLIANCE STATES
  const [showCustomPermissionModal, setShowCustomPermissionModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const hasAutoFetchedGps = useRef(false);

  // 1. Initial configurations loading pool
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/settings`)
      .then(res => res.json())
      .then(data => { if (active) setSettings(data); })
      .catch(err => console.error("❌ Settings fetch failure:", err));
    return () => { active = false; };
  }, []);

  // 🎯 2. AUTOMATED SEEDING GPS PERMISSION LOGIC (NO MANUAL BUTTONS)
  const captureUserLocationAutomatically = useCallback(async () => {
    try {
      const providerCheck = await Location.getProviderStatusAsync();
      if (!providerCheck.locationServicesEnabled) return;

      let userCoords = await Location.getLastKnownPositionAsync({});
      if (!userCoords) {
        userCoords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      if (userCoords?.coords) {
        setCoords([userCoords.coords.latitude, userCoords.coords.longitude]);
        console.log(`🎯 Auto Coordinates Anchored: ${userCoords.coords.latitude}, ${userCoords.coords.longitude}`);
      }
    } catch (hardwareErr) {
      console.log("GPS sensor timing loop skipped. Using defaults.", hardwareErr);
    }
  }, []);

  const executeNativeLocationSequence = async () => {
    setShowCustomPermissionModal(false);
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await captureUserLocationAutomatically();
      } else {
        Alert.alert(t('error') || "Permission Denied", "Please select location manually on the map.");
      }
    } catch (err) {
      console.error("GPS Bootstrap Error:", err);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAutoFetchedGps.current) {
      hasAutoFetchedGps.current = true;
      
      const evaluatePermissionStatus = async () => {
        const foregroundStatus = await Location.getForegroundPermissionsAsync();
        if (foregroundStatus.granted) {
          await captureUserLocationAutomatically();
        } else {
          // Present App Store compliant explanation dialog card first
          setShowCustomPermissionModal(true);
        }
      };
      evaluatePermissionStatus();
    }
  }, [captureUserLocationAutomatically]);

  // 3. ENHANCED SYSTEM-WIDE MULTI-TIER BILLING MATRICES ENGINE
  const totals = useMemo(() => {
    const baseDeliveryFee = parseFloat(settings?.deliveryFee || '150');
    const freeDeliveryLimit = parseFloat(settings?.freeDeliveryThreshold || '2000');
    
    const prepayLimit = parseFloat(settings?.prepaymentThreshold || '2500');
    const prepayPercentage = parseFloat(settings?.prepaymentPercentage || '30');
    
    const rewardLimit = parseFloat(settings?.rewardThreshold || '5000');
    const rewardValueAmount = parseFloat(settings?.rewardValue || '500');
    const rewardType = settings?.rewardType || 'discount';

    const calculatedSubtotalAfn = cartItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.price || '0');
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (unitPrice * itemQuantity);
    }, 0);

    let voucherMarkdownAfn = 0;
    if (appliedPromo) {
      voucherMarkdownAfn = appliedPromo.type === 'percentage' 
        ? calculatedSubtotalAfn * (parseFloat(appliedPromo.value) / 100)
        : parseFloat(appliedPromo.value);
    }

    let rewardDiscountAfn = 0;
    let earnedGiftText = null;
    const qualifiesForReward = calculatedSubtotalAfn >= rewardLimit;

    if (qualifiesForReward) {
      if (rewardType === 'discount') {
        rewardDiscountAfn = rewardValueAmount;
      } else if (rewardType === 'gift') {
        earnedGiftText = settings?.rewardValue || "FREE GIFT";
      }
    }

    const isDeliveryFree = calculatedSubtotalAfn >= freeDeliveryLimit;
    const shippingCostAfn = isDeliveryFree ? 0 : baseDeliveryFee;

    const finalAmountAfn = Math.max(0, calculatedSubtotalAfn - voucherMarkdownAfn - rewardDiscountAfn + shippingCostAfn);
    const requiresPrepayment = finalAmountAfn > prepayLimit;
    const upfrontPaymentAfn = requiresPrepayment ? Math.round(finalAmountAfn * (prepayPercentage / 100)) : 0;

    return {
      subtotal: calculatedSubtotalAfn,
      discount: voucherMarkdownAfn,
      rewardDiscount: rewardDiscountAfn,
      gift: earnedGiftText,
      shipping: shippingCostAfn,
      isFree: isDeliveryFree,
      final: finalAmountAfn,
      requiresPrepayment,
      prepayPercent: prepayPercentage,
      prepayAmount: upfrontPaymentAfn
    };
  }, [cartItems, settings, appliedPromo]);

  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/discounts/validate?code=${promoInput.toUpperCase().trim()}&amount=${totals.subtotal}`);
      const data = await res.json();
      if (res.ok) {
        setAppliedPromo(data);
        Alert.alert(t('success') || "Success", `Promo Code Applied!`);
      } else {
        Alert.alert(t('error') || "Error", data.error || "Invalid promo code");
        setAppliedPromo(null);
      }
    } catch (e) {
      Alert.alert(t('error') || "Error", "Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address) return Alert.alert(t('requiredFields') || "Required Fields", t('fillAllDetails') || "Fill in info");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || 'guest',
          customerName: form.name,
          phoneNumber: form.phone,
          address: form.address,
          latitude: coords[0].toString(), 
          longitude: coords[1].toString(),
          totalAmount: totals.final.toString(),
          shippingFee: totals.shipping.toString(),
          promoCode: appliedPromo ? promoInput.toUpperCase().trim() : null,
          items: cartItems.map(item => ({
            productId: item.id, 
            quantity: item.quantity,
            price: item.price.toString(), 
            selectedSize: item.selectedSize || 'M',
            selectedColor: item.selectedColor || 'Standard'
          })), 
        }),
      });

      if (response.ok) {
        clearCart(); 
        Alert.alert(t('success') || "Success", t('orderPlacedSuccess') || "Order Placed!");
        router.replace('/orders');
      } else {
        Alert.alert(t('error') || "Error", "Order placement failed.");
      }
    } catch (e) {
      Alert.alert(t('error') || "Error", "Network connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const MemoizedMap = useMemo(() => {
    if (!settings) {
      return (
        <View style={styles.mapLoaderContainer}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

    const warehouse: [number, number] = [
      parseFloat(settings?.warehouseLat || settings?.warehouse_lat) || 34.5330,
      parseFloat(settings?.warehouseLng || settings?.warehouse_lng) || 69.1660
    ];

    return (
      <UnifiedMap 
        role="USER" 
        destinationCoords={coords} 
        warehouseCoords={warehouse} 
        orderStatus="confirmed" 
        orderId="checkout-preview"
      />
    );
  }, [coords, settings]);


return (
  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
    >
      <View style={styles.container}>
        
        {/* 1. MAP BOX AT ABSOLUTE TOP */}
        <View style={styles.mapContainer}>
          {MemoizedMap}
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backFloatBtn, isRTL ? { right: 20, left: undefined } : { left: 20, right: undefined }]}
            activeOpacity={0.7}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* 2. ISOLATED SCROLLING FORM ENTRIES */}
        <ScrollView 
          style={styles.scrollForm} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent} 
        >
          <View style={styles.section}>
            {/* 🎯 CLEAN DESIGN UPDATE: Removed the redundant live GPS trigger button tray entirely */}
            <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.sectionLabel}>
                {(t('shippingAddress') || t('deliveryAddress') || 'SHIPPING ADDRESS').toUpperCase()}
              </Text>
            </View>

            {/* INPUT FORM FIELDS */}
            <TextInput 
              placeholder={t('fullName') || "FULL NAME"} 
              placeholderTextColor="#BBBBBB" 
              style={[styles.input, isRTL && { textAlign: 'right' }]} 
              value={form.name} 
              onChangeText={(v) => setForm({...form, name: v})} 
              autoCapitalize="words"
            />
            <TextInput 
              placeholder={t('phoneNumber') || "PHONE NUMBER"} 
              placeholderTextColor="#BBBBBB" 
              style={[styles.input, isRTL && { textAlign: 'right' }]} 
              keyboardType="phone-pad"
              value={form.phone} 
              onChangeText={(v) => setForm({...form, phone: v})} 
            />
            <TextInput 
              placeholder={t('address') || "SHIPPING ADDRESS"} 
              placeholderTextColor="#BBBBBB" 
              style={[styles.input, isRTL && { textAlign: 'right' }]} 
              value={form.address} 
              onChangeText={(v) => setForm({...form, address: v})} 
            />

            {/* 🎯 THE NUMERAL TRANSLATOR CONFACTOR ENGINE */}
            {(() => {
              const toLocalNumbers = (num: string | number) => {
                const str = Math.round(Number(num || 0)).toLocaleString();
                if (locale === 'en') return str;
                const easternDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
                return str.replace(/[0-9]/g, (w) => easternDigits[parseInt(w)]);
              };

              return (
                <View style={{ width: '100%', marginTop: 20 }}>
                  
                  {/* PROMO VOUCHERS INPUT STRIP */}
                  <Text style={[styles.subSectionLabel, isRTL && { textAlign: 'right' }]}>
                    {(t('discountPromoCode') || 'DISCOUNT PROMO CODE').toUpperCase()}
                  </Text>
                  
                  <View style={[styles.promoRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <TextInput 
                      placeholder={t('enterCode') || "ENTER CODE"} 
                      placeholderTextColor="#BBBBBB" 
                      autoCapitalize="characters" 
                      style={[styles.promoInput, isRTL && { textAlign: 'right' }]} 
                      value={promoInput} 
                      onChangeText={setPromoInput} 
                      editable={!appliedPromo} 
                    />
                    <TouchableOpacity 
                      style={[styles.promoApplyBtn, appliedPromo && { backgroundColor: '#22C55E' }]} 
                      onPress={handleValidatePromo} 
                      disabled={promoLoading || !!appliedPromo}
                      activeOpacity={0.8}
                    >
                      {promoLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.promoApplyText}>
                          {appliedPromo ? (t('applied') || "APPLIED") : (t('apply') || "APPLY")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* 🎯 PREPAYMENT GATEWAY WARNING CARD */}
                  {totals.requiresPrepayment && (
                    <View style={styles.prepayAlertCard}>
                      <View style={[styles.alertHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="shield-checkmark" size={16} color="#FF9500" />
                        <Text style={styles.prepayAlertTitle}>{t('prepaymentTitle') || 'SECURITY PREPAYMENT REQUIRED'}</Text>
                      </View>
                      <Text style={[styles.prepayAlertBody, isRTL && { textAlign: 'right' }]}>
                        {(t('prepaymentBody') || 'Prepayment required')
                          .replace('{threshold}', toLocalNumbers(settings?.prepaymentThreshold || '2500'))
                          .replace('{amount}', toLocalNumbers(totals.prepayAmount))
                          .replace('{percent}', toLocalNumbers(totals.prepayPercent))
                        }
                      </Text>
                    </View>
                  )}

                  {/* 🎯 FREE GIFT CELEBRATION BADGE CARD */}
                  {totals.gift && (
                    <View style={styles.giftCelebrationBadge}>
                      <View style={[styles.alertHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="gift-sharp" size={16} color="#22C55E" />
                        <Text style={styles.giftCelebrationText}>
                          {(t('giftBody') || 'Gift Unlocked: {gift}').replace('{gift}', totals.gift.toUpperCase())}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ACCOUNTING BILLING SUMMARY STATEMENT SHEET */}
                  <View style={styles.billingSummarySheet}>
                    <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
                      {(t('financialRecap') || 'ORDER FINANCIAL RECAP').toUpperCase()}
                    </Text>
                    
                    <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                      <Text style={styles.billLabel}>{t('bagSubtotal') || 'Bag Subtotal'}</Text>
                      <Text style={styles.billValue}>AFN {toLocalNumbers(totals.subtotal)}</Text>
                    </View>

                    {totals.discount > 0 && (
                      <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.billLabel, {color: '#FF3B30'}]}>{t('promoMarkdown') || 'Promo Code Markdown'}</Text>
                        <Text style={[styles.billValue, {color: '#FF3B30'}]}>- AFN {toLocalNumbers(totals.discount)}</Text>
                      </View>
                    )}

                    {totals.rewardDiscount > 0 && (
                      <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.billLabel, {color: '#22C55E'}]}>{t('milestoneReward') || 'Milestone Spend Reward'}</Text>
                        <Text style={[styles.billValue, {color: '#22C55E'}]}>- AFN {toLocalNumbers(totals.rewardDiscount)}</Text>
                      </View>
                    )}

                    <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                      <Text style={styles.billLabel}>{t('shippingFreight') || 'Logistics Shipping Freight'}</Text>
                      <Text style={[styles.billValue, totals.shipping === 0 && { color: '#22C55E', fontWeight: '900' }]}>
                        {totals.shipping === 0 ? (t('freeShipping') || "FREE SHIPPING").toUpperCase() : `AFN ${toLocalNumbers(totals.shipping)}`}
                      </Text>
                    </View>

                    <View style={styles.dividerLine} />

                    <View style={[styles.totalRowSplit, isRTL && { flexDirection: 'row-reverse' }]}>
                      <Text style={styles.grandTotalLabel}>{(t('totalPayable') || 'TOTAL PAYABLE').toUpperCase()}</Text>
                      <Text style={styles.grandTotalValue}>AFN {toLocalNumbers(totals.final)}</Text>
                    </View>
                  </View>

                  {/* STICKY FOOTER ACTION GATE */}
                  <View style={styles.stickyFooter}>
                    <TouchableOpacity 
                      style={[styles.orderBtn, loading && { opacity: 0.7 }]} 
                      onPress={handlePlaceOrder} 
                      disabled={loading}
                      activeOpacity={0.9}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.orderBtnText}>
                          {((t('placeOrder') || 'CONFIRM ORDER').toUpperCase())} (AFN {toLocalNumbers(totals.final)})
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })()}

          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>

    {/* 🎯 APPMARKET COMPLIANT TRANSPARENT SYSTEM RATIONALE OVERLAY MODAL */}

    </View>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
    billingSummarySheet: { backgroundColor: '#FFFFFF', padding: 18, borderVerticalWidth: 1, borderColor: '#F5F5F5', marginVertical: 10 },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  billLabel: { fontSize: 13, color: '#666666', fontWeight: '500' },
  billValue: { fontSize: 13, color: '#000000', fontWeight: '700' },
  dividerLine: { height: 1, backgroundColor: '#EFEFEF', marginVertical: 14 },
  totalRowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: 11, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
  grandTotalValue: { fontSize: 20, fontWeight: '900', color: '#000000', letterSpacing: -0.5 },

  // Prepayment Required Alerts Card layout
  prepayAlertCard: { backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFEAA7', padding: 16, marginHorizontal: 0, marginVertical: 10, gap: 6 },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prepayAlertTitle: { fontSize: 10, fontWeight: '900', color: '#D97706', letterSpacing: 1 },
  prepayAlertBody: { fontSize: 12, color: '#B45309', lineHeight: 18, fontWeight: '500' },

  // Gift validation badges configurations
  giftCelebrationBadge: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  giftCelebrationText: { fontSize: 11, color: '#15803D', fontWeight: '700', flex: 1, letterSpacing: 0.2 },

  mapContainer: { 
    height: 260, 
    width: '100%', 
    backgroundColor: '#FAFAFA', 
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  backFloatBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 56 : 24, 
    left: 16, 
    backgroundColor: '#FFFFFF', 
    width: 38,
    height: 38,
    borderRadius: 19, 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000000', 
    shadowOpacity: 0.06, 
    shadowRadius: 6, 
    shadowOffset: { width: 0, height: 3 }, 
    elevation: 3 
  },
  scrollForm: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { 
    // Safely sets clearance above the newly lowered sticky button
    paddingBottom: Platform.OS === 'ios' ? 110 : 90 
  },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#000000', letterSpacing: 2, borderLeftWidth: 1.5, borderLeftColor: '#000000', paddingLeft: 8 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsBtnText: { fontSize: 9, fontWeight: '700', color: '#000000', letterSpacing: 1 },
  input: { height: 44, borderBottomWidth: 1, borderBottomColor: '#EAEAEA', paddingVertical: 10, marginBottom: 16, fontSize: 13, color: '#000000', letterSpacing: 0.4 },
  subSectionLabel: { fontSize: 10, fontWeight: '800', color: '#111111', letterSpacing: 1.5, marginTop: 18, marginBottom: 10 },
  promoRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 24 },
  promoInput: { flex: 1, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EAEAEA', paddingHorizontal: 14, height: 40, fontSize: 12, color: '#000000', fontWeight: '600', letterSpacing: 1, borderRadius: 2 },
  promoApplyBtn: { backgroundColor: '#000000', paddingHorizontal: 16, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 2 },
  promoApplyText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  billingCard: { borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 16, marginTop: 6, gap: 12 },
  
  billVal: { fontSize: 12, color: '#000000', fontWeight: '600', letterSpacing: 0.3 },
  
  // 🎯 THE PERFECTED STICKY FOOTER: Sits perfectly flush against the hardware safe space
  stickyFooter: {
    position: 'absolute',
    bottom: 0, 
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    // Uses platform padding metrics to sit perfectly above the home indicator line
    paddingBottom: Platform.OS === 'ios' ? 28 : 16, 
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 10
  },
  orderBtn: { backgroundColor: '#000000', height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 2 },
  orderBtnText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 2, fontSize: 12 }
});
