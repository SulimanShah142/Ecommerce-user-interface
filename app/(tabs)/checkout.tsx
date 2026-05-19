import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, StyleSheet, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { authClient } from '@/lib/auth-client';
import { useCart } from '@/Contexts/CartContext';
import UnifiedMap from '@/components/UnifiedMap';
import { Ionicons } from '@expo/vector-icons';

const API_URL = "http://192.168.1.4:8787";

export default function CheckoutScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { state, dispatch } = useCart(); 
  const cartItems = state?.items || []; 

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [coords, setCoords] = useState<[number, number]>([34.5553, 69.2075]);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  // 1. Fetch Settings
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Settings fetch failed", err));
  }, []);

  const handleMapLocationSelect = useCallback((c: [number, number]) => {
    setCoords(c);
  }, []);

  // 2. GPS Capture
  const handleGPSCapture = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert("Permission Denied", "GPS access is required for delivery.");
    }
    setLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords([location.coords.latitude, location.coords.longitude]);
    } catch (e) {
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Totals Logic
  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => 
      sum + (Number(item.product.usdPrice || 0) * item.quantity), 0
    );
  }, [cartItems]);

  const totals = useMemo(() => {
    const rate = parseFloat(settings?.usdToAfnRate || '65');
    const subtotalAfn = totalAmount * rate;
    return { subtotal: subtotalAfn, final: subtotalAfn };
  }, [totalAmount, settings]);

  // 4. Map UI Logic (Corrected to use state variables)
    // 4. Map UI Logic (Configured for Live OSRM Route Tracing)
  const MemoizedMap = useMemo(() => {
    if (!settings) return <ActivityIndicator size="small" color="#000" />;

    // 1. Resolve Admin Warehouse values using alternate schema keys cleanly
    const rawLat = settings?.warehouseLat || settings?.warehouse_lat;
    const rawLng = settings?.warehouseLng || settings?.warehouse_lng;

    const wLat = parseFloat(rawLat);
    const wLng = parseFloat(rawLng);

    // 2. Strict validation boundary configuration block
    const warehouse: [number, number] = (!isNaN(wLat) && !isNaN(wLng))
      ? [wLat, wLng]
      : [34.5330, 69.1660]; // Premium default fallback to Kabul store center coordinates

    // 3. User selected checkout pin coordinates matching array indices
    const destination: [number, number] = [coords[0], coords[1]];

    return (
      <UnifiedMap 
        role="DELIVER" // 🎯 THE TRICK: Use DELIVER role here so the map allows tracing the active path
        destinationCoords={destination} // User current shipping pin marker
        warehouseCoords={warehouse}     // Store source coordinates
        onLocationSelect={handleMapLocationSelect} 
      />
    );
  }, [coords, settings, handleMapLocationSelect]);


  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address) {
      return Alert.alert("Required", "Please fill all details.");
    }
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
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.usdPrice.toString(),
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null
          })),
        }),
      });

      if (response.ok) {
        dispatch({ type: 'CLEAR_CART' });
        Alert.alert("Success", "Order placed! 🛍️");
        router.replace('/orders');
      } else {
        Alert.alert("Error", "Could not place order.");
      }
    } catch (e) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>CHECKOUT</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>SHIPPING ADDRESS</Text>
          <TouchableOpacity onPress={handleGPSCapture} style={styles.gpsBtn}>
             <Ionicons name="navigate-circle" size={16} color="#000" />
             <Text style={styles.gpsBtnText}>LIVE GPS</Text>
          </TouchableOpacity>
        </View>
        
        {/* Corrected Map usage */}
        <View style={styles.mapContainer}>
          {MemoizedMap}
        </View>

        <TextInput 
          placeholder="Name" 
          style={styles.input} 
          value={form.name} 
          onChangeText={(v) => setForm({...form, name: v})} 
        />
        <TextInput 
          placeholder="Phone" 
          style={styles.input} 
          keyboardType="phone-pad"
          value={form.phone} 
          onChangeText={(v) => setForm({...form, phone: v})} 
        />
        <TextInput 
          placeholder="Street Address" 
          style={styles.input} 
          value={form.address} 
          onChangeText={(v) => setForm({...form, address: v})} 
        />
      </View>

      <TouchableOpacity 
        style={styles.orderBtn} 
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.orderBtnText}>PLACE ORDER (AFN {totals.final.toLocaleString()})</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 60, 
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: '#000' },
  
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'flex-end' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#000', letterSpacing: 1 },
  
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: '#000' },
  gpsBtnText: { fontSize: 10, color: '#000', fontWeight: '800' },
  
  mapContainer: { 
    height: 180, 
    width: '100%',
    backgroundColor: '#F9F9F9',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },

  form: { gap: 0 }, // We use borderBottom instead of gaps for a cleaner look
  input: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE', 
    paddingVertical: 15, 
    fontSize: 13, 
    fontWeight: '500',
    color: '#000'
  },

  summarySection: { padding: 16, backgroundColor: '#FAFAFA', marginTop: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 12, color: '#666' },
  summaryPrice: { fontSize: 12, fontWeight: '600', color: '#000' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  
  totalLabel: { fontSize: 14, fontWeight: '900', color: '#000' },
  totalPrice: { fontSize: 18, fontWeight: '900', color: '#000' },

  orderBtn: { 
    backgroundColor: '#000', 
    marginHorizontal: 16, 
    padding: 18, 
    alignItems: 'center', 
    marginTop: 30,
    // Sharp edges like SHEIN
  },
  orderBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 }
});
