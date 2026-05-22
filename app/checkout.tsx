import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, StyleSheet, Platform , KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { authClient } from '@/lib/auth-client';
import { useCart } from '@/Contexts/CartContext';
import UnifiedMap from '@/components/UnifiedMap';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/Contexts/LanguageContext';

const API_URL = "http://192.168.1.3:8787";

export default function CheckoutScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { data: session } = authClient.useSession();
  const { addToCart: dispatchAddToCart, clearCart,  state} = useCart(); 
   const [selectedColor, setSelectedColor] = useState<string>("Standard"); 

  // Now this line resolves perfectly without throwing a ReferenceError
  const cartItems = state?.items || []; 

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [coords, setCoords] = useState<[number, number]>([34.5553, 69.2075]);
  
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);

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

  // 2. Automated GPS Grabber
  const handleGPSCapture = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert(t('gpsDenied'), t('gpsRequired'));
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords([location.coords.latitude, location.coords.longitude]);
    } catch (e) {
      if (!silent) Alert.alert(t('error'), t('gpsError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!hasAutoFetchedGps.current) {
      hasAutoFetchedGps.current = true;
      handleGPSCapture(true);
    }
  }, [handleGPSCapture]);

  const handleMapLocationSelect = useCallback((c: [number, number]) => setCoords(c), []);

  // 3. FIXED PRICING CALCULATION MATRIX (Incorporate Exchange rate and Profits into subtotal calculations)
   // 3. FIXED FLAT-SCHEMA PRICING CALCULATION MATRIX
   // 3. ENHANCED SYSTEM-WIDE MULTI-TIER BILLING MATRICES ENGINE
  const totals = useMemo(() => {
    // 🎯 READ LIVE SCHEMAS WITH ACCURATE DEFAULT HOOK FALLBACKS
    const baseDeliveryFee = parseFloat(settings?.deliveryFee || '150');
    const freeDeliveryLimit = parseFloat(settings?.freeDeliveryThreshold || '2000');
    
    const prepayLimit = parseFloat(settings?.prepaymentThreshold || '2500');
    const prepayPercentage = parseFloat(settings?.prepaymentPercentage || '30');
    
    const rewardLimit = parseFloat(settings?.rewardThreshold || '5000');
    const rewardValueAmount = parseFloat(settings?.rewardValue || '500');
    const rewardType = settings?.rewardType || 'discount';

    // Step A: Calculate items subtotal from flat pricing context keys
    const calculatedSubtotalAfn = cartItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.price || '0');
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (unitPrice * itemQuantity);
    }, 0);

    // Step B: Calculate Promotional Code Markdown Reductions
    let voucherMarkdownAfn = 0;
    if (appliedPromo) {
      voucherMarkdownAfn = appliedPromo.type === 'percentage' 
        ? calculatedSubtotalAfn * (parseFloat(appliedPromo.value) / 100)
        : parseFloat(appliedPromo.value);
    }

    // Step C: Apply Dynamic Free Gift / Milestone Reward Reductions
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

    // Step D: Calculate Shipping Freight Logistics Costs
    const isDeliveryFree = calculatedSubtotalAfn >= freeDeliveryLimit;
    const shippingCostAfn = isDeliveryFree ? 0 : baseDeliveryFee;

    // Step E: Aggregate Absolute Grand Final Balances
    const finalAmountAfn = Math.max(0, calculatedSubtotalAfn - voucherMarkdownAfn - rewardDiscountAfn + shippingCostAfn);

    // Step F: Evaluate Prepayment Requirements Upfront Bounds
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
        Alert.alert(t('success'), `Promo Code Applied!`);
      } else {
        Alert.alert(t('error'), data.error || "Invalid promo code");
        setAppliedPromo(null);
      }
    } catch (e) {
      Alert.alert(t('error'), "Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  // 4. Stable Memoized Map
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

    const destination: [number, number] = [
      parseFloat(coords[0] as any) || 34.5553,
      parseFloat(coords[1] as any) || 69.2075
    ];

    return (
      <UnifiedMap 
        role="DELIVER" 
        destinationCoords={destination} 
        warehouseCoords={warehouse} 

        orderStatus="confirmed" 
        orderId="checkout-preview"
      />
    );
  }, [coords, settings, handleMapLocationSelect]);

  // 🎯 THE FIX: Destructure both functions cleanly from your global useCart context hook

  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address) return Alert.alert(t('requiredFields'), t('fillAllDetails'));
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
            productId: item.id, // 🎯 Flat schema match
            quantity: item.quantity,
            price: item.price.toString(), // Already converted to AFN!
            selectedSize: item.selectedSize || 'M',
            selectedColor: item.selectedColor || 'Standard'
          })), 
        }),
      });

      if (response.ok) {
        // 🎯 THE CRITICAL FIX: Call your clearCart function natively instead of dispatching to addToCart
        clearCart(); 
        
        Alert.alert(t('success'), t('orderPlacedSuccess'));
        router.replace('/orders');
      } else {
        Alert.alert(t('error'), t('failedStatusUpdate'));
      }
    } catch (e) {
      Alert.alert(t('error'), t('serverConnectionFailed'));
    } finally {
      setLoading(false);
    }
  };

return (
  // 🎯 FIX 1: Wrap the root element in a full flex layout container
  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      // 🎯 FIX 2: iOS scales using viewport padding offsets, Android shifts layout flags natively
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
          // 🎯 FIX 3: Prevent keyboard from dismissing on accidental outer form touches
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent} 
        >
          <View style={styles.section}>
            <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.sectionLabel}>{(t('shippingAddress') || 'SHIPPING ADDRESS').toUpperCase()}</Text>
              <TouchableOpacity onPress={() => handleGPSCapture(false)} style={[styles.gpsBtn, isRTL && { flexDirection: 'row-reverse' }]} activeOpacity={0.7}>
                 <Ionicons name="navigate-circle" size={16} color="#000" />
                 <Text style={styles.gpsBtnText}>{(t('liveGps') || 'LIVE GPS').toUpperCase()}</Text>
              </TouchableOpacity>
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

            {/* PROMO VOUCHERS INPUT STRIP */}
            <Text style={[styles.subSectionLabel, isRTL && { textAlign: 'right' }]}>DISCOUNT PROMO CODE</Text>
            <View style={[styles.promoRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <TextInput 
                placeholder="ENTER CODE" 
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
                  <Text style={styles.promoApplyText}>{appliedPromo ? "APPLIED" : "APPLY"}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* REVENUE LEDGER BILLING ROWS */}
            <View style={styles.billingCard}>
              <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.billLabel}>{t('subtotal') || 'Subtotal'}</Text>
                <Text style={styles.billVal}>AFN {Math.round(totals.subtotal).toLocaleString()}</Text>
              </View>
              {totals.discount > 0 && (
                <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.billLabel, { color: '#22C55E' }]}>PROMO DISCOUNT</Text>
                  <Text style={[styles.billVal, { color: '#22C55E' }]}>-AFN {Math.round(totals.discount).toLocaleString()}</Text>
                </View>
              )}
                  {/* 🎯 NEW: PREPAYMENT GATEWAY WARNING NOTIFICATION CARD */}
      {totals.requiresPrepayment && (
        <View style={styles.prepayAlertCard}>
          <View style={styles.alertHeaderRow}>
            <Ionicons name="shield-checkmark" size={16} color="#FF9500" />
            <Text style={styles.prepayAlertTitle}>SECURITY PREPAYMENT REQUIRED</Text>
          </View>
          <Text style={styles.prepayAlertBody}>
            Orders exceeding AFN {parseFloat(settings?.prepaymentThreshold || '2500').toLocaleString()} require an upfront clearance layout. Please transfer <Text style={{fontWeight: '900'}}>AFN {totals.prepayAmount.toLocaleString()} ({totals.prepayPercent}%)</Text> via Moneta or bank channel path to lock dispatch manifest assignment.
          </Text>
        </View>
      )}

      {/* 🎯 NEW: FREE GIFT EARNED CELEBRATION BADGE CARD */}
      {totals.gift && (
        <View style={styles.giftCelebrationBadge}>
          <Ionicons name="gift-sharp" size={16} color="#22C55E" />
          <Text style={styles.giftCelebrationText}>
            MILESTONE GIFT UNLOCKED: <Text style={{fontWeight: '900'}}>{totals.gift.toUpperCase()}</Text> WILL BE INCLUDED IN CARGO BAG FREE!
          </Text>
        </View>
      )}

      {/* RE-BUILT ACCOUNTING BILLING SUMMARY STATEMENT CONTAINER */}
      <View style={styles.billingSummarySheet}>
        <Text style={styles.sectionTitle}>ORDER FINANCIAL RECAP</Text>
        
        <View style={styles.billingRow}>
          <Text style={styles.billLabel}>Bag Subtotal</Text>
          <Text style={styles.billValue}>AFN {Math.round(totals.subtotal).toLocaleString()}</Text>
        </View>

        {totals.discount > 0 && (
          <View style={styles.billingRow}>
            <Text style={[styles.billLabel, {color: '#FF3B30'}]}>Promo Code Markdown</Text>
            <Text style={[styles.billValue, {color: '#FF3B30'}]}>- AFN {Math.round(totals.discount).toLocaleString()}</Text>
          </View>
        )}

        {totals.rewardDiscount > 0 && (
          <View style={styles.billingRow}>
            <Text style={[styles.billLabel, {color: '#22C55E'}]}>Milestone Spend Reward</Text>
            <Text style={[styles.billValue, {color: '#22C55E'}]}>- AFN {Math.round(totals.rewardDiscount).toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.billingRow}>
          <Text style={styles.billLabel}>Logistics Shipping Freight</Text>
          <Text style={[styles.billValue, totals.shipping === 0 && { color: '#22C55E', fontWeight: '900' }]}>
            {totals.shipping === 0 ? "FREE SHIPPING" : `AFN ${totals.shipping.toLocaleString()}`}
          </Text>
        </View>

        <View style={styles.dividerLine} />

        <View style={styles.totalRowSplit}>
          <Text style={styles.grandTotalLabel}>TOTAL PAYABLE COLLECT BALANCE</Text>
          <Text style={styles.grandTotalValue}>AFN {Math.round(totals.final).toLocaleString()}</Text>
        </View>
      </View>

            </View>
          </View>
        </ScrollView>

        {/* 3. FIXED NON-OVERLAPPING STICKY FOOTER ANCHOR */}
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
                {((t('placeOrder') || 'CONFIRM ORDER').toUpperCase())} (AFN {Math.round(totals.final).toLocaleString()})
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
      </View>
    </KeyboardAvoidingView>
  </View>
);}
// Drop this directly into your checkout page styles to complete the premium redesign
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
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billLabel: { fontSize: 11, color: '#666666', letterSpacing: 0.3 },
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
