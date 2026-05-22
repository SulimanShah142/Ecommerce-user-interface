import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import UnifiedMap from '@/components/UnifiedMap';
import { useLanguage } from '@/Contexts/LanguageContext';

const { width } = Dimensions.get('window');
const API_URL = "http://192.168.1.3:8787";

export default function UserOrderDetails() {
  const { id } = useLocalSearchParams();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [itemsExpanded, setItemsExpanded] = useState(false);
  
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveDriverCoords, setLiveDriverCoords] = useState<[number, number] | null>(null);
  const webViewRef = React.useRef<any>(null);
  // 1. DUAL PARALLEL DATA INITIALIZER
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

        if (orderData?.driverLat && orderData?.driverLng) {
          setLiveDriverCoords([parseFloat(orderData.driverLat), parseFloat(orderData.driverLng)]);
        }
      } catch (err) {
        console.error("❌ User App tracking data load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCoreData();
  }, [id]);

  // 2. LIVE COURIER TRACKING HEARTBEAT LOOP
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (order?.status === 'picked_up' || order?.status === 'confirmed') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/orders/${id}/driver-location`);
          if (res.ok) {
            const data = await res.json();
            if (data?.lat && data?.lng) {
              setLiveDriverCoords([parseFloat(data.lat), parseFloat(data.lng)]);
            }
          }
        } catch (e) {
          console.log("⚠️ Driver location tracking snapshot fetch skipped:", e);
        }
      }, 12000); 
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

  // Early loading fallback guards
  if (loading) return <View style={styles.center}><ActivityIndicator size="small" color="#000000" /></View>;
  if (!order) return <View style={styles.center}><Text style={styles.emptyText}>{t('orderNotFound') || "ORDER NOT FOUND"}</Text></View>;
  const visibleItems = itemsExpanded ? order.items : order.items?.slice(0, 3) || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 1. TOP HEADER STATUS STEPPER ROW */}
      <View style={styles.whiteSection}>
        <View style={[styles.titleNavRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.inlineBackBtn} activeOpacity={0.7}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color="#000" />
          </TouchableOpacity>
          <Text style={styles.orderIdHeader}>{(t('orderDetails') || 'ORDER DETAILS').toUpperCase()}</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={[styles.orderIdSub, isRTL && { textAlign: 'right' }]}>
          {(t('orderId') || 'ORDER ID')}: {id?.toString().toUpperCase()}
        </Text>
        
        {/* Visual Stepper Node Bar Matrix */}
        <View style={[styles.statusStepper, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, { backgroundColor: '#000000' }]} />
            <Text style={styles.stepText}>{t('placed') || 'PLACED'}</Text>
          </View>
          <View style={[styles.stepLine, order.status !== 'pending' && { backgroundColor: '#000000' }]} />
          
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, (order.status === 'picked_up' || order.status === 'delivered' || order.status === 'confirmed') && { backgroundColor: '#000000' }]} />
            <Text style={styles.stepText}>{t('shipped') || 'SHIPPED'}</Text>
          </View>
          <View style={[styles.stepLine, order.status === 'delivered' && { backgroundColor: '#000000' }]} />
          
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, order.status === 'delivered' && { backgroundColor: '#000000' }]} />
            <Text style={styles.stepText}>{t('delivered') || 'DELIVERED'}</Text>
          </View>
        </View>
      </View>

      {/* 2. DYNAMIC LOGISTICS MAP WITH ACTIVE ZOOM CONTROLS */}
      <View style={styles.mapWrapper}>
        <Text style={[styles.mapLabelText, isRTL && { textAlign: 'right' }]}>
          {order.status === 'picked_up' ? (t('liveTracking') || 'LIVE TRACKING').toUpperCase() : (t('fleetMap') || 'FLEET MAP').toUpperCase()}
        </Text>
        <View style={styles.mapAbsoluteContainer}>
          <UnifiedMap 
            role="ADMIN" 
            destinationCoords={customerCoords}
            warehouseCoords={warehouseCoords}
            driverCoords={liveDriverCoords}
            orderStatus={order.status || "confirmed"}
            orderId={id as string}
          />
          
          {/* 🎯 FLOATING ZOOM CONTROLS INTERFACE */}
          <View style={[styles.zoomFloatingControls, isRTL ? { left: 12 } : { right: 12 }]}>
            <TouchableOpacity 
              style={styles.zoomPillBtn} 
              activeOpacity={0.8}
              onPress={() => webViewRef.current?.injectJavaScript('map.zoomIn();')}
            >
              <Ionicons name="add-outline" size={18} color="#000000" />
            </TouchableOpacity>
            <View style={styles.zoomDividerLine} />
            <TouchableOpacity 
              style={styles.zoomPillBtn} 
              activeOpacity={0.8}
              onPress={() => webViewRef.current?.injectJavaScript('map.zoomOut();')}
            >
              <Ionicons name="remove-outline" size={18} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. ITEMS LIST SECTION WITH EXPANDABLE ACCENTS */}
      <View style={styles.whiteSection}>
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {(t('items') || 'ITEMS').toUpperCase()} ({order.items?.length || 0})
        </Text>
        
        {visibleItems?.map((item: any, idx: number) => (
          <View key={`item-row-${item.id || idx}`} style={[styles.itemRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Image source={{ uri: item.productImage || item.imageUrl }} style={styles.thumb} />
            <View style={[styles.itemDetails, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
              <Text style={[styles.itemName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                {(item.productName || item.name || '').toUpperCase()}
              </Text>
              <Text style={[styles.itemMeta, isRTL && { textAlign: 'right' }]}>
                {item.selectedSize ? `Size: ${item.selectedSize}` : 'One Size'}  |  Qty: {item.quantity || 1}
              </Text>
              {/* 🎯 THE ACCURATE VAL FIX: Evaluates raw unit multiplied parameters safely to reject static fallback errors */}
              <Text style={[styles.price, isRTL && { textAlign: 'right' }]}>
                AFN {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}

        {/* 🎯 COLLAPSIBLE ACCORDION EXPAND TOGGLE BTN ANCHOR */}
        {order.items?.length > 3 && (
          <TouchableOpacity 
            style={[styles.expandToggleBtn, isRTL && { flexDirection: 'row-reverse' }]} 
            activeOpacity={0.7}
            onPress={() => setItemsExpanded(!itemsExpanded)}
          >
            <Text style={styles.expandToggleText}>
              {itemsExpanded ? 'SHOW LESS ITEMS' : `SHOW ALL ITEMS (${order.items.length})`}
            </Text>
            <Ionicons name={itemsExpanded ? "chevron-up" : "chevron-down"} size={14} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. BILLING SUMMARY STATEMENTS & ADDRESS */}
      <View style={styles.whiteSection}>
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {(t('orderSummary') || 'ORDER SUMMARY').toUpperCase()}
        </Text>
        
        <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.summaryLabel}>{t('subtotal') || 'Subtotal'}</Text>
          <Text style={styles.summaryValue}>
            AFN {(Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.shippingFee) || 0))).toLocaleString()}
          </Text>
        </View>
        
        <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.summaryLabel}>{t('shipping') || 'Shipping Fee'}</Text>
          <Text style={[styles.summaryValue, Number(order.shippingFee) === 0 && { color: '#22C55E', fontWeight: '900' }]}>
            {Number(order.shippingFee) === 0 ? 'FREE' : `AFN ${Number(order.shippingFee).toLocaleString()}`}
          </Text>
        </View>

        <View style={styles.dividerLine} />

        <View style={[styles.summaryRow, { marginBottom: 0 }, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.totalLabel}>{t('total') || 'Total Amount'}</Text>
          <Text style={styles.totalValue}>
            AFN {Number(order.totalAmount || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 5. DELIVERY DESTINATION INFO BLOCK */}
      <View style={[styles.whiteSection, { marginBottom: 40 }]}>
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {(t('deliveryAddress') || 'DELIVERY DESTINATION').toUpperCase()}
        </Text>
        <View style={[styles.addressBlockRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="location-outline" size={16} color="#000" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
          <Text style={[styles.addressText, isRTL && { textAlign: 'right' }]}>
            {order.address?.toUpperCase() || 'No address specified.'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}


export const styles = StyleSheet.create({
  // Global View Backdrops
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    minHeight: 300 
  },
  
  // Section Layout Boxes
  whiteSection: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#F5F5F5' 
  },
  titleNavRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: Platform.OS === 'ios' ? 55 : 44, 
    marginBottom: 12 
  },
  inlineBackBtn: { 
    padding: 2 
  },
  orderIdHeader: { 
    fontSize: 13, 
    fontWeight: '800', 
    letterSpacing: 2, 
    color: '#000000' 
  },
  orderIdSub: { 
    fontSize: 11, 
    color: '#888888', 
    fontWeight: '500', 
    letterSpacing: 0.5, 
    marginBottom: 18 
  },

  // Logistics Stepper Line Elements
  statusStepper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 4, 
    marginVertical: 6 
  },
  stepContainer: { 
    alignItems: 'center', 
    width: 60 
  },
  stepCircle: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#E0E0E0', 
    marginBottom: 6 
  },
  stepText: { 
    fontSize: 9, 
    fontWeight: '700', 
    color: '#222222', 
    letterSpacing: 0.5, 
    textTransform: 'uppercase' 
  },
  stepLine: { 
    flex: 1, 
    height: 2, 
    backgroundColor: '#EAEAEA', 
    marginTop: -14 
  },

  // Unified Map Framing Wrappers
  mapWrapper: { 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#F5F5F5' 
  },
  mapLabelText: { 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 1.5, 
    color: '#000000', 
    marginBottom: 12 
  },
  mapAbsoluteContainer: { 
    width: '100%', 
    height: 220, 
    position: 'relative', 
    borderRadius: 2, 
    overflow: 'hidden' 
  },

  // Floating Leaflet Zoom Controller Anchors
  zoomFloatingControls: { 
    position: 'absolute', 
    bottom: 16, 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#EAEAEA', 
    elevation: 4, 
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    borderRadius: 2,
    zIndex: 999 
  },
  zoomPillBtn: { 
    width: 34, 
    height: 34, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  zoomDividerLine: { 
    height: 1, 
    backgroundColor: '#EFEFEF', 
    width: '100%' 
  },

  // E-Commerce Line Item Rows
  sectionTitle: { 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 2, 
    color: '#000000', 
    marginBottom: 16 
  },
  itemRow: { 
    flexDirection: 'row', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#FAFAFA' 
  },
  thumb: { 
    width: 60, 
    height: 80, 
    backgroundColor: '#FAFAFA' 
  },
  itemDetails: { 
    flex: 1, 
    justifyContent: 'space-between' 
  },
  itemName: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#111111', 
    letterSpacing: 0.2 
  },
  itemMeta: { 
    fontSize: 10, 
    color: '#999999', 
    fontWeight: '600' 
  },
  price: { 
    fontSize: 13, 
    fontWeight: '900', 
    color: '#000000' 
  },

  // Expandable Accordion Selector Bars
  expandToggleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    marginTop: 14, 
    paddingVertical: 10, 
    backgroundColor: '#FAFAFA', 
    borderWidth: 0.5, 
    borderColor: '#EAEAEA',
    borderRadius: 2
  },
  expandToggleText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: '#666666', 
    letterSpacing: 0.5 
  },

  // Revenue Summary Ledger Sheets
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  summaryLabel: { 
    fontSize: 13, 
    color: '#666666', 
    fontWeight: '500' 
  },
  summaryValue: { 
    fontSize: 13, 
    color: '#000000', 
    fontWeight: '700' 
  },
  dividerLine: { 
    height: 1, 
    backgroundColor: '#F5F5F5', 
    marginVertical: 14 
  },
  totalLabel: { 
    fontSize: 12, 
    fontWeight: '900', 
    color: '#000000', 
    letterSpacing: 1 
  },
  totalValue: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#000000', 
    letterSpacing: -0.5 
  },

  // Final Delivery Address Blocks
  addressBlockRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginTop: 2 
  },
  addressText: { 
    fontSize: 12, 
    color: '#444444', 
    lineHeight: 18, 
    fontWeight: '600', 
    flex: 1 
  }
});
