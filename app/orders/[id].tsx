import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/Contexts/LanguageContext';
import UnifiedMap from '@/components/UnifiedMap';

const API_URL = "http://192.168.1.3:8787";

export default function UserOrderDetails() {
  const { id } = useLocalSearchParams();
  const { t, isRTL, locale } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveDriverCoords, setLiveDriverCoords] = useState<[number, number] | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // 1. DATA INITIALIZATION: Parallel Resource Data Fetch Engine
  useEffect(() => {
    if (!id) return;

    const loadCoreData = async () => {
      try {
        setLoading(true);
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/api/orders/${id}`),
          fetch(`${API_URL}/api/admin/settings`)
        ]);

        if (!orderRes.ok || !settingsRes.ok) throw new Error("API connections dropped");

        const orderData = await orderRes.json();
        const settingsData = await settingsRes.json();

        setOrder(orderData);
        setSettings(settingsData);

        // 🎯 FIX TYPE CASTING ON MOUNT: Parse server string decimals into pure coordinates floats cleanly
        if (orderData?.driverLat && orderData?.driverLng) {
          const initLat = parseFloat(orderData.driverLat);
          const initLng = parseFloat(orderData.driverLng);
          if (!isNaN(initLat) && !isNaN(initLng)) {
            setLiveDriverCoords([initLat, initLng]);
          }
        }
      } catch (err) {
        console.error("❌ User App tracking data load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCoreData();
  }, [id]);

  // 2. 🎯 AUTOMATED HEARTBEAT TELEMETRY LOOP WITH CONVERSIONS
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // 🎯 THE TRACKING TIMELINE SYNC: Keeps fetching real-time telemetry coordinates for both milestones
    const isLiveTrackingActive = order?.status === 'picked_up' || order?.status === 'confirmed';

    if (isLiveTrackingActive) {
      console.log(`📡 [USER APP] Initializing live telemetry worker stream for room status: ${order.status.toUpperCase()}`);

      const pollLocation = async () => {
        try {
          const res = await fetch(`${API_URL}/api/orders/${id}/driver-location`);
          if (res.ok) {
            const data = await res.json();
            
            // Explicitly verify and convert numeric variables parameters types 
            if (data?.lat !== null && data?.lng !== null) {
              const nextLat = parseFloat(data.lat);
              const nextLng = parseFloat(data.lng);

              if (!isNaN(nextLat) && !isNaN(nextLng)) {
                setLiveDriverCoords([nextLat, nextLng]);
              }
            }
          }
        } catch (e) {
          console.log("⚠️ Driver location tracking snapshot fetch skipped:", e);
        }
      };

      // Poll once immediately on view state load to eliminate map rendering gaps
      pollLocation();

      // Configure clean 12-second high-precision polling snapshots
      interval = setInterval(pollLocation, 12000); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order?.status, id]);

  // 3. SAFE NUMERIC COORDINATE MEMO CALCULATIONS
  const customerCoords = useMemo<[number, number]>(() => {
    const lat = parseFloat(order?.latitude);
    const lng = parseFloat(order?.longitude);
    return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : [34.5553, 69.2075]; 
  }, [order?.latitude, order?.longitude]);

  const warehouseCoords = useMemo<[number, number]>(() => {
    const lat = parseFloat(settings?.warehouseLat || settings?.warehouse_lat);
    const lng = parseFloat(settings?.warehouseLng || settings?.warehouse_lng);
    return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : [34.5330, 69.1660]; 
  }, [settings]);

  // 4. MEMOIZED MAP VIEW COMPONENT FRAME BLOCK
  const MemoizedMapComponent = useMemo(() => {
    return (
      <UnifiedMap
        role="USER"
        destinationCoords={customerCoords}
        warehouseCoords={warehouseCoords}
        driverCoords={liveDriverCoords}
        orderStatus={order?.status}
        orderId={id as string}
        isFullscreen={mapFullscreen}
        setIsFullscreen={setMapFullscreen}
      />
    );
  }, [customerCoords, warehouseCoords, liveDriverCoords, order?.status, id, mapFullscreen]);

  // 5. 🎯 FINANCIALLY BALANCED RECAP INVOICE CALCULATIONS MATRIX DOCK
  const totalsDataRecapMatrix = useMemo(() => {
    // If the data object is null or still loading, instantly pass safe default values
    if (!order) {
      return { subtotal: 0, discount: 0, shipping: 0, grandTotal: 0 };
    }

    const baseSubtotal = Array.isArray(order.items)
      ? order.items.reduce((sum: number, it: any) => sum + (parseFloat(it.price || it.unitPrice || '0') * (Number(it.quantity) || 1)), 0)
      : parseFloat(order.subtotal || order.subtotalAmount || '0');

    const markdownDiscount = parseFloat(order.discount || order.discountAmount || '0') + parseFloat(order.newUserDiscountApplied || '0');
    const parsedShippingFreight = parseFloat(order.shippingFee || '0');
    const totalInvoiceCollectBalance = parseFloat(order.totalAmount || '0');

    return {
      subtotal: Math.round(baseSubtotal || 0),
      discount: Math.round(markdownDiscount || 0),
      shipping: Math.round(parsedShippingFreight || 0),
      grandTotal: Math.round(totalInvoiceCollectBalance || 0)
    };
  }, [order]);

  // Early loading fallback guards (Remains exactly identical below your fixed hook)
  if (loading && !order) return <View style={styles.center}><ActivityIndicator size="small" color="#000000" /></View>;
  if (!order) return <View style={styles.center}><Text style={styles.emptyText}>{t('orderNotFound') || "ORDER NOT FOUND"}</Text></View>;
  
  const visibleItems = itemsExpanded ? order.items : order.items?.slice(0, 3) || [];

  // Early loading fallback guards
  if (loading) return <View style={styles.center}><ActivityIndicator size="small" color="#000000" /></View>;
  if (!order) return <View style={styles.center}><Text style={styles.emptyText}>{t('orderNotFound') || "ORDER NOT FOUND"}</Text></View>;
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {!mapFullscreen ? (
        // 🎯 IDENTICAL TO CHECKOUT PAGE: Flat container wrapping isolated blocks
        <View style={styles.container}>
          
          {/* 1. STANDALONE FIXED MAP CONTAINER BOX (COMPLETELY SEPARATED FROM SCROLLVIEW) */}
          <View style={styles.mapContainer}>
            {MemoizedMapComponent}
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={[styles.backFloatBtn, isRTL ? { right: 20, left: undefined } : { left: 20, right: undefined }]}
              activeOpacity={0.7}
            >
              <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* 2. ISOLATED SCROLLING SHEET PANEL (NO SHARED SCROLL OVERLAPS CONTROLS) */}
          <ScrollView 
            style={styles.scrollForm} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent} 
          >
            {/* STEP PROCESS STEPPER CHECKPOINT STATUS LIST */}
            <View style={styles.section}>
              <View style={[styles.statusStepper, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={styles.stepContainer}>
                  <View style={[styles.stepCircle, { backgroundColor: '#000000' }]} />
                  <Text style={styles.stepText}>PLACED</Text>
                </View>
                <View style={[styles.stepLine, order.status !== 'pending' && { backgroundColor: '#000000' }]} />
                <View style={styles.stepContainer}>
                  <View style={[styles.stepCircle, (order.status === 'picked_up' || order.status === 'delivered' || order.status === 'confirmed') ? { backgroundColor: '#000000' } : { backgroundColor: '#EAEAEA' }]} />
                  <Text style={styles.stepText}>SHIPPED</Text>
                </View>
                <View style={[styles.stepLine, order.status === 'delivered' && { backgroundColor: '#000000' }]} />
                <View style={styles.stepContainer}>
                  <View style={[styles.stepCircle, order.status === 'delivered' ? { backgroundColor: '#000000' } : { backgroundColor: '#EAEAEA' }]} />
                  <Text style={styles.stepText}>DELIVERED</Text>
                </View>
              </View>
            </View>

            {/* CARGO INVENTORY ITEMS TRAY SLATS */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && { textAlign: 'right' }]}>
                {(t('items') || 'ITEMS').toUpperCase()} ({order.items?.length || 0})
              </Text>
              {visibleItems?.map((item: any, idx: number) => {
                const itemPrice = parseFloat(item.price || item.unitPrice || '0');
                const itemQty = Number(item.quantity) || 1;
                return (
                  <View key={`item-${item.id || idx}`} style={[styles.itemRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Image source={{ uri: item.productImage || item.imageUrl }} style={styles.thumb} />
                    <View style={[{ flex: 1 }, isRTL ? { marginRight: 15, alignItems: 'flex-end' } : { marginLeft: 15, alignItems: 'flex-start' }]}>
                      <Text style={styles.itemName} numberOfLines={1}>{(item.productName || item.name || '').toUpperCase()}</Text>
                      <Text style={styles.itemMeta}>Qty: {itemQty}  |  Size: {item.selectedSize || 'Standard'}</Text>
                      <Text style={styles.priceText}>AFN {Math.round(itemPrice * itemQty).toLocaleString()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* MONOCHROME DETAILED ACCOUNTING BILLING Recaps REVIEWS SHEET */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isRTL && { textAlign: 'right' }]}>
                {(t('financialRecap') || 'ORDER FINANCIAL RECAP').toUpperCase()}
              </Text>
              
              <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.billLabel}>Bag Subtotal</Text>
                <Text style={styles.billValue}>AFN {totalsDataRecapMatrix.subtotal.toLocaleString()}</Text>
              </View>

              {totalsDataRecapMatrix.discount > 0 && (
                <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.billLabel, { color: '#FF3B30' }]}>Promo Discount</Text>
                  <Text style={[styles.billValue, { color: '#FF3B30' }]}>- AFN {totalsDataRecapMatrix.discount.toLocaleString()}</Text>
                </View>
              )}

              <View style={[styles.billingRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.billLabel}>Logistics Shipping Freight</Text>
                <Text style={[styles.billValue, totalsDataRecapMatrix.shipping === 0 && { color: '#22C55E', fontWeight: '900' }]}>
                  {totalsDataRecapMatrix.shipping === 0 ? "FREE" : `AFN ${totalsDataRecapMatrix.shipping.toLocaleString()}`}
                </Text>
              </View>

              <View style={styles.dividerLine} />

              <View style={[styles.billingRow, { marginTop: 12 }, isRTL && { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.billLabel, { color: '#000000', fontWeight: '900' }]}>Total Payable Cash Collect</Text>
                <Text style={[styles.billValue, { fontSize: 16, color: '#000000', fontWeight: '900' }]}>AFN {totalsDataRecapMatrix.grandTotal.toLocaleString()}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        /* FULLSCREEN BREAKOUT OVERLAY INTERACTION MATRIX LAYER */
        <View style={styles.fullscreenOverlay}>
          {MemoizedMapComponent}
        </View>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  mapContainer: {
    height: 280,
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    position: 'relative'
  },
  backFloatBtn: {
    position: 'absolute',
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100
  },
    // 🎯 THE BALANCING DESIGNS FIX: Appended center and emptyText definitions cleanly!
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  emptyText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#888888',
    letterSpacing: 0.5
  },

  scrollForm: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40
  },
  section: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
    marginBottom: 16
  },
  statusStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4
  },
  stepContainer: {
    alignItems: 'center',
    gap: 6
  },
  stepCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  stepText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#EAEAEA',
    marginHorizontal: 6,
    marginTop: -14
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F9F9F9'
  },
  thumb: {
    width: 44,
    height: 58,
    backgroundColor: '#FAFAFA',
    borderWidth: 0.5,
    borderColor: '#EAEAEA',
    borderRadius: 0
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase'
  },
  itemMeta: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '600',
    marginTop: 2
  },
  priceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    marginTop: 4
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5
  },
  billLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500'
  },
  billValue: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700'
  },
  dividerLine: {
    height: 0.5,
    backgroundColor: '#EFEFEF',
    marginVertical: 10
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 999999,
    elevation: 999999
  }
});
