import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Alert, Platform, Modal } from 'react-native';
import { useRouter } from "expo-router";
import { useLanguage } from "@/Contexts/LanguageContext";
import { authClient } from "@/lib/auth-client";
import { useCart } from '../Contexts/CartContext';
import UnifiedMap from '@/components/UnifiedMap';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationPermissionModal from '@/components/LoxationPermissionModal';

const API_URL = "http://192.168.1.3:8787";

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
const [showLocationPermissionModal, setShowLocationPermissionModal] =
  useState(false);

const [locationBootLoading, setLocationBootLoading] =
  useState(false);

  // 🎯 GOOGLE PLAY / APPLE APP STORE COMPLIANCE STATES
const [showCustomPermissionModal, setShowCustomPermissionModal] =
  useState(false);

const [locationLoading, setLocationLoading] =
  useState(false);

const [gpsServicesDisabled, setGpsServicesDisabled] =
  useState(false);

const permissionFlowStarted =
  useRef(false);
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
 // 🎯 PRODUCTION GPS INITIALIZATION ENGINE
useEffect(() => {

  const initializeCheckoutGpsFlow = async () => {

    try {

      console.log(
        "🛰️ Checkout GPS bootstrap initialized"
      );

      if (permissionFlowStarted.current) {
        return;
      }

      permissionFlowStarted.current = true;

      // 🎯 STEP 1: CHECK EXISTING PERMISSION
      const existingPermission =
        await Location.getForegroundPermissionsAsync();

      console.log(
        "📍 Existing Checkout Permission:",
        existingPermission
      );

      // 🎯 STEP 2: SHOW BRANDED MODAL IF NOT GRANTED
      if (!existingPermission.granted) {

        setShowCustomPermissionModal(true);

        return;
      }

      // 🎯 STEP 3: CHECK GPS HARDWARE
      const providerStatus =
        await Location.getProviderStatusAsync();

      console.log(
        "🛰️ Checkout Provider Status:",
        providerStatus
      );

      // 🎯 STEP 4: IF GPS OFF -> SHOW MODAL
      if (!providerStatus.locationServicesEnabled) {

        setGpsServicesDisabled(true);

        setShowCustomPermissionModal(true);

        return;
      }

      // 🎯 STEP 5: FETCH LIVE LOCATION
      const currentPosition =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      if (currentPosition?.coords) {

        const liveCoords: [number, number] = [
          currentPosition.coords.latitude,
          currentPosition.coords.longitude,
        ];

        setCoords(liveCoords);

        console.log(
          "✅ Checkout GPS Coordinates:",
          liveCoords
        );
      }

    } catch (gpsErr) {

      console.log(
        "❌ Checkout GPS bootstrap failed",
        gpsErr
      );
    }
  };

  initializeCheckoutGpsFlow();

}, []);

  // 3. ENHANCED SYSTEM-WIDE MULTI-TIER BILLING MATRICES ENGINE
  // 3. ENHANCED SYSTEM-WIDE MULTI-TIER BILLING MATRICES ENGINE WITH NEW USER REWARD LOGIC
    // 3. ENHANCED SYSTEM-WIDE MULTI-TIER BILLING MATRICES ENGINE (SHEIN EFFICIENCY UPGRADE)
  const totals = useMemo(() => {
    const baseDeliveryFee = parseFloat(settings?.deliveryFee || '150');
    const freeDeliveryLimit = parseFloat(settings?.freeDeliveryThreshold || '2000');
    
    const prepayLimit = parseFloat(settings?.prepaymentThreshold || '2500');
    const prepayPercentage = parseFloat(settings?.prepaymentPercentage || '30');
    
    const rewardLimit = parseFloat(settings?.rewardThreshold || '5000');
    const rewardValueAmount = parseFloat(settings?.rewardValue || '500');
    const rewardType = settings?.rewardType || 'discount';

    // Calculate baseline contents amount values
    const calculatedSubtotalAfn = cartItems.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.price || '0');
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (unitPrice * itemQuantity);
    }, 0);

    // 🎯 1. NEW USER DISCOUNT TIMELINE & PURCHASE CAP LATCH
    let newUserCampaignMarkdownAfn = 0;
    
    const isNewUserPromoActive = settings?.newUserDiscountActive === true || settings?.newUserDiscountActive === 'true';
    const pastOrderCount = Number(session?.user?.orderCount || 0);
    const maxAllowedPurchases = Number(settings?.newUserMaxPurchaseCount || 1);
    
    // Check campaign expiration date rules safely
    let isCampaignDateValid = true;
    if (settings?.newUserDiscountExpiresAt) {
      isCampaignDateValid = new Date() < new Date(settings.newUserDiscountExpiresAt);
    }

    if (isNewUserPromoActive && pastOrderCount < maxAllowedPurchases && isCampaignDateValid) {
      const discountType = settings?.newUserDiscountType || 'fixed';
      const rawDiscountValue = parseFloat(settings?.newUserDiscountValue || '0');

      if (discountType === 'percentage') {
        newUserCampaignMarkdownAfn = calculatedSubtotalAfn * (rawDiscountValue / 100);
      } else {
        newUserCampaignMarkdownAfn = rawDiscountValue;
      }
      console.log(`✨ [CHECKOUT BONUS] New User Promo active: AFN ${newUserCampaignMarkdownAfn}`);
    }

    // 🎯 2. SMARTER MILESTONE REWARD LATCH (EFFICIENT SHEIN REPLICATION)
    let rewardDiscountAfn = 0;
    let earnedGiftText = null;

    // Check past structural fields to see if this specific reward milestone has ALREADY been claimed and logged
    const hasAlreadyClaimedMilestoneReward = session?.user?.hasClaimedMilestoneReward === true || session?.user?.hasClaimedMilestoneReward === 'true';
    
    // Sum total lifetime spend across past completed transactions safely
    const pastLifetimeSpendAfn = parseFloat(session?.user?.totalLifetimeSpend || '0');

    // Latch matches if: current basket hits limit OR total historic spend hits limit (and hasn't been claimed yet)
    const qualifiesByCurrentBasket = calculatedSubtotalAfn >= rewardLimit;
    const qualifiesByHistoricSpend = pastLifetimeSpendAfn >= rewardLimit;

    if ((qualifiesByCurrentBasket || qualifiesByHistoricSpend) && !hasAlreadyClaimedMilestoneReward) {
      if (rewardType === 'discount') {
        rewardDiscountAfn = rewardValueAmount;
        console.log(`🎉 [MILESTONE LATCH] Applied One-Time AFN ${rewardValueAmount} Spend Discount!`);
      } else if (rewardType === 'gift') {
        earnedGiftText = settings?.rewardValue || "FREE GIFT";
        console.log(`🎁 [MILESTONE LATCH] Free Gift Unlocked: ${earnedGiftText}`);
      }
    }

    // 3. STANDARD PROMO CODES VOUCHER HANDLING MATRIX
    let voucherMarkdownAfn = 0;
    if (appliedPromo) {
      voucherMarkdownAfn = appliedPromo.type === 'percentage' 
        ? calculatedSubtotalAfn * (parseFloat(appliedPromo.value) / 100)
        : parseFloat(appliedPromo.value);
    }

    // 4. LOGISTICS SHIPPING FREIGHT CALCULATION
    const isDeliveryFree = calculatedSubtotalAfn >= freeDeliveryLimit;
    const shippingCostAfn = isDeliveryFree ? 0 : baseDeliveryFee;

    // Deduct promotions and compile totals invoice balance metrics safely
    const finalAmountAfn = Math.max(0, 
      calculatedSubtotalAfn - newUserCampaignMarkdownAfn - voucherMarkdownAfn - rewardDiscountAfn + shippingCostAfn
    );
    
    const requiresPrepayment = finalAmountAfn > prepayLimit;
    const upfrontPaymentAfn = requiresPrepayment ? Math.round(finalAmountAfn * (prepayPercentage / 100)) : 0;

    return {
      subtotal: calculatedSubtotalAfn,
      newUserDiscount: newUserCampaignMarkdownAfn,
      discount: voucherMarkdownAfn,
      rewardDiscount: rewardDiscountAfn,
      gift: earnedGiftText,
      shipping: shippingCostAfn,
      isFree: isDeliveryFree,
      final: finalAmountAfn,
      requiresPrepayment,
      prepayPercent: prepayPercentage,
      prepayAmount: upfrontPaymentAfn,
      triggerMilestoneClaimFlag: (qualifiesByCurrentBasket || qualifiesByHistoricSpend) && !hasAlreadyClaimedMilestoneReward
    };
  }, [cartItems, settings, appliedPromo, session?.user]);


    // 🎯 PROMO CODE LEDGER MATRIX VERIFICATION GATES RESTORED
  const handleValidatePromo = async () => {
    if (!promoInput.trim()) {
      return Alert.alert(t('error') || "Error", "Please enter a valid discount code string.");
    }
    
    setPromoLoading(true);
    try {
      console.log(`📡 [PROMO VERIFICATION] Querying database ledger for voucher code: ${promoInput.toUpperCase().trim()}`);
      
      const res = await fetch(
        `${API_URL}/api/discounts/validate?code=${promoInput.toUpperCase().trim()}&amount=${totals.subtotal}`
      );
      const data = await res.json();
      
      if (res.ok) {
        setAppliedPromo(data);
        Alert.alert(t('success') || "Success", `Promo Code Applied Successfully!`);
      } else {
        Alert.alert(t('error') || "Error", data.error || "Invalid promo code or below minimum spend requirement.");
        setAppliedPromo(null);
      }
    } catch (e: any) {
      console.error("❌ Promo validation network drop exception:", e.message);
      Alert.alert(t('error') || "Error", "Failed to validate promo code. Check your network link indicators.");
    } finally {
      setPromoLoading(false);
    }
  };


  // 🎯 CORE TRANSACTIONAL ORDER PLACEMENT ACTION HANDLER
  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address) {
      return Alert.alert(
        t('requiredFields') || "Required Fields", 
        t('fillAllDetails') || "Please fill in all information details before submitting."
      );
    }

    console.log("🚀 Dispatched custom order transactional request payload to server...");
    setLoading(true);

    try {
           // Inside app/checkout.tsx -> handlePlaceOrder function payload fetch block
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
          newUserDiscountApplied: totals.newUserDiscount.toString(),
          
          // 🎯 THE EFFICIENCY SYNC LOCK:
          // Tells the backend to immediately lock down and set 'hasClaimedMilestoneReward' to true 
          // inside the database user row if they earned the reward on this check pass!
          consumesMilestoneRewardFlag: totals.triggerMilestoneClaimFlag,
          milestoneRewardMarkdownApplied: totals.rewardDiscount.toString(),

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
        Alert.alert(
          t('success') || "Success", 
          t('orderPlacedSuccess') || "Your order has been recorded successfully!"
        );
        router.replace('/orders');
      } else {
        const errPayload = await response.json().catch(() => ({}));
        Alert.alert(t('error') || "Error", errPayload?.error || "Order placement failed.");
      }
    } catch (e) {
      console.error("❌ Checkout submit execution network drop out:", e);
      Alert.alert(t('error') || "Error", "Network connection failed. Check your Wi-Fi.");
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
       behavior={Platform.OS === "ios" ? "padding" : "height"}
       keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
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

                  {/* 🎯 NEW USER CELEBRATION BADGE CARD INSULATOR DOCK */}
                  {totals.newUserDiscount > 0 && (
                    <View style={styles.newUserIncentiveBadgeCard}>
                      <View style={[styles.alertHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Ionicons name="sparkles-sharp" size={16} color="#000000" />
                        <Text style={styles.newUserIncentiveTitleText}>
                          {(t('welcomeBonusUnlocked') || 'WELCOME BONUS INSTANTLY UNLOCKED').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.newUserIncentiveBodyText, isRTL && { textAlign: 'right' }]}>
                        {locale === 'en' 
                          ? `As a verified new member, an automatic markdown of AFN ${toLocalNumbers(totals.newUserDiscount)} has been successfully subtracted from your final collect statement balance!`
                          : `به عنوان یک کاربر جدید، تخفیف خوش‌آمدگویی به مبلغ افغانی ${toLocalNumbers(totals.newUserDiscount)} به صورت خودکار از صورتحساب شما کسر گردید!`}
                      </Text>
                    </View>
                  )}

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

                    {/* 🎯 NEW USER ACCUMULATED LEDGER MARKDOWN ROW BLOCK */}
                    {totals.newUserDiscount > 0 && (
                      <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <Text style={[styles.billLabel, { color: '#000000', fontWeight: '700' }]}>
                          {t('newUserMarkdown') || 'New Member Account Bonus'}
                        </Text>
                        <Text style={[styles.billValue, { color: '#000000', fontWeight: '800' }]}>
                          - AFN {toLocalNumbers(totals.newUserDiscount)}
                        </Text>
                      </View>
                    )}

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
    <LocationPermissionModal
  visible={showCustomPermissionModal}
  loading={locationLoading}
  title="Enable Precise Location"
  description="Brand Gallery uses your live location to improve delivery accuracy, estimate arrival times, and automatically position your delivery pin."

  onClose={() => {
    setShowCustomPermissionModal(false);
  }}

  onAllow={async () => {

    try {

      setLocationLoading(true);

      console.log(
        "📍 Starting checkout GPS permission flow..."
      );

      // 🎯 CHECK EXISTING PERMISSION
      let permission =
        await Location.getForegroundPermissionsAsync();

      // 🎯 REQUEST IF NOT GRANTED
      if (!permission.granted) {

        permission =
          await Location.requestForegroundPermissionsAsync();

        console.log(
          "📍 Checkout Permission Response:",
          permission
        );

        if (!permission.granted) {

          Alert.alert(
            "Permission Required",
            "Location access improves delivery accuracy."
          );

          return;
        }
      }

      // 🎯 FORCE NATIVE GPS ENABLE POPUP
      const currentPosition =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      // 🎯 SAVE LIVE COORDS
      if (currentPosition?.coords) {

        const liveCoords: [number, number] = [
          currentPosition.coords.latitude,
          currentPosition.coords.longitude,
        ];

        setCoords(liveCoords);

        console.log(
          "✅ Checkout Coordinates Updated:",
          liveCoords
        );
      }

      // 🎯 CLOSE MODAL
      setGpsServicesDisabled(false);

      setShowCustomPermissionModal(false);

    } catch (err) {

      console.log(
        "❌ Checkout GPS permission flow failed",
        err
      );

      Alert.alert(
        "GPS Required",
        "Please enable device location services."
      );

    } finally {

      setLocationLoading(false);
    }
  }}
/>


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
    // 🎯 HIGH-END MONOCHROME RETENTION DESIGN SPECIFICATIONS ADDITIONS
  mapLoaderContainer: {
    height: 280, // Matches your standalone fixed map height boundaries perfectly
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  
  // RETAIN GLOBAL CARD WRAPPER CELL ALIGNMENTS
  subSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#777777',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  promoInput: {
    flex: 2,
    height: '100%',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#000000',
  },
  promoApplyBtn: {
    flex: 1,
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Sharp square SHEIN aesthetic boundaries
  },
  promoApplyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
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
  // 🎯 HIGH-END BRAND MONOCHROME CAMPAIGN BADGE SPECIFICATIONS
  newUserIncentiveBadgeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000', // Signature hard monochrome boundary line
    borderRadius: 0,        // Sharp geometric corners
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
  },
  newUserIncentiveTitleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    marginLeft: 6,
  },
  newUserIncentiveBodyText: {
    fontSize: 11,
    color: '#333333',
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 6,
    letterSpacing: 0.1,
  },

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
