import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import UnifiedMap from '@/components/UnifiedMap';

const API_URL = "http://192.168.1.3:8787";

export default function UserOrderDetails() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 1. FIXED: Convert driverCoords to a live reactive State Hook
  const [liveDriverCoords, setLiveDriverCoords] = useState<[number, number] | null>(null);

  // 2. Fetch Initial Order Data
  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/orders/${id}`)
      .then(res => res.json())
      .then(data => { 
        setOrder(data); 
        // Pre-fill initial courier position if already saved in DB record
        if (data?.driverLat && data?.driverLng) {
          setLiveDriverCoords([parseFloat(data.driverLat), parseFloat(data.driverLng)]);
        }
        setLoading(false); 
      })
      .catch((err) => {
        console.error("Order fetch error:", err);
        setLoading(false);
      });
  }, [id]);

  // 3. Live Driver Tracking (Polls when picked up or confirmed)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (order?.status === 'picked_up' || order?.status === 'confirmed') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/orders/${id}/driver-location`);
          if (res.ok) {
            const data = await res.json();
            if (data?.lat && data?.lng) {
              // Updates live state directly, forcing map layer marker translation
              setLiveDriverCoords([parseFloat(data.lat), parseFloat(data.lng)]);
            }
          }
        } catch (e) {
          console.log("Tracking location snapshot fetch error:", e);
        }
      }, 12000); // Optimized 12-second heartbeat loop
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order?.status, id]);

  // 4. Early structural render guards
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;
  if (!order) return <View style={styles.center}><Text style={styles.addressText}>Order details missing</Text></View>;

  // Prepare map coordinates safely
  const customerCoords: [number, number] = [
    parseFloat(order.latitude) || 34.5553, 
    parseFloat(order.longitude) || 69.2075
  ];
  
  const warehouseCoords: [number, number] = order.warehouseLat 
    ? [parseFloat(order.warehouseLat), parseFloat(order.warehouseLng)] 
    : [34.5330, 69.1660]; // Default fallback Kabul center shop coordinates

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. TOP HEADER / STATUS TRACKER */}
      <View style={styles.whiteSection}>
        <Text style={styles.orderIdHeader}>ORDER DETAILS</Text>
        <Text style={styles.orderIdSub}>Order ID: {id?.toString().toUpperCase()}</Text>
        
        {/* Visual Status Step (Minimalist) */}
        <View style={styles.statusStepper}>
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, { backgroundColor: '#000' }]} />
            <Text style={styles.stepText}>Placed</Text>
          </View>
          <View style={[styles.stepLine, order.status !== 'pending' && { backgroundColor: '#000' }]} />
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, (order.status === 'picked_up' || order.status === 'delivered' || order.status === 'confirmed') && { backgroundColor: '#000' }]} />
            <Text style={styles.stepText}>Shipped</Text>
          </View>
          <View style={[styles.stepLine, order.status === 'delivered' && { backgroundColor: '#000' }]} />
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, order.status === 'delivered' && { backgroundColor: '#000' }]} />
            <Text style={styles.stepText}>Delivered</Text>
          </View>
        </View>
      </View>

      {/* 2. MAP (Integrated with thin borders and real-time state hooks) */}
      {(order.status === 'picked_up' || order.status === 'confirmed') && (
        <View style={styles.mapWrapper}>
          <Text style={styles.mapLabelText}>LIVE TRACKING</Text>
          <View style={styles.mapContainer}>
            <UnifiedMap 
              role="USER"
              destinationCoords={customerCoords}
              warehouseCoords={warehouseCoords}
              driverCoords={liveDriverCoords} // Re-renders dynamically when state vector shifts        
            />
          </View>
        </View>
      )}

      {/* 3. ITEMS LIST */}
      <View style={styles.whiteSection}>
        <Text style={styles.sectionTitle}>ITEMS ({order.items?.length || 0})</Text>
        {order.items?.map((item: any) => (
          <View key={`item-${item.id}`} style={styles.itemRow}>
            <Image source={{ uri: item.productImage || item.imageUrl }} style={styles.thumb} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={1}>{(item.productName || item.name || '').toUpperCase()}</Text>
              <Text style={styles.itemMeta}>
                {item.selectedSize ? `Size: ${item.selectedSize}` : 'One Size'} | Qty: {item.quantity}
              </Text>
              <Text style={styles.price}>AFN {(Number(item.price) || 0).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 4. SUMMARY & ADDRESS */}
      <View style={styles.whiteSection}>
        <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>AFN {Math.round(order.totalAmount || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>FREE</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 10 }]}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text style={styles.totalValue}>AFN {Math.round(order.totalAmount || 0).toLocaleString()}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>
        <Text style={styles.addressText}>{order.address?.toUpperCase()}</Text>
      </View>
      
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ... styles remain identical, keeping your layout DNA pristine
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2' },
  whiteSection: { backgroundColor: '#FFF', padding: 20, marginBottom: 10 },
  orderIdHeader: { fontSize: 14, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  orderIdSub: { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  statusStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  stepContainer: { alignItems: 'center', width: 60 },
  stepCircle: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD' },
  stepLine: { width: 50, height: 1, backgroundColor: '#DDD', marginBottom: 15 },
  stepText: { fontSize: 10, color: '#666', marginTop: 8, fontWeight: '600' },
  mapWrapper: { backgroundColor: '#FFF', padding: 20, marginBottom: 10 },
  mapLabelText: { fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  mapContainer: { height: 240, borderWidth: 1, borderColor: '#F0F0F0' },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1.5, marginBottom: 15 },
  itemRow: { flexDirection: 'row', marginBottom: 20 },
  thumb: { width: 70, height: 95, backgroundColor: '#F9F9F9' },
  itemDetails: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  itemName: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.5 },
  itemMeta: { fontSize: 10, color: '#999', fontWeight: '600' },
  price: { fontSize: 13, fontWeight: '900', color: '#000' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: '#666' },
  summaryValue: { fontSize: 12, color: '#000', fontWeight: '600' },
  totalLabel: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1 },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#000' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  addressText: { fontSize: 12, color: '#555', lineHeight: 18, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }
});
