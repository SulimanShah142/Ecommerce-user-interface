import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';
import { loadMyOrdersLocal, saveMyOrders, isOnline } from '../../lib/offline';

const API_URL = "http://192.168.1.3:8787";

export default function MyOrdersScreen() {
  const { data: session } = authClient.useSession();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    if (!session?.user?.id) return;

    try {
      const local = await loadMyOrdersLocal(session.user.id);
      setOrders(local || []);

      const online = await isOnline();
      if (online) {
        const response = await fetch(`${API_URL}/api/orders/my-orders?userId=${session.user.id}`);
        const freshOrders = await response.json();
        
        if (response.ok) {
          await saveMyOrders(freshOrders);
          setOrders(freshOrders);
        }
      }
    } catch (error) {
      console.error("Order sync failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [session?.user?.id]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { color: '#FF9500' };
      case 'confirmed': return { color: '#34C759' };
      case 'delivered': return { color: '#0A1128' };
      case 'rejected': return { color: '#FF3B30' };
      default: return { color: '#8E8E93' };
    }
  };

  // 1. Logic to determine what to show
  const dataToShow = expanded ? orders : orders.slice(0, 4);

  const renderOrder = ({ item }: { item: any }) => {
    const style = getStatusStyle(item.status);
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push(`/orders/${item.id}`)}
        style={[styles.orderCard, isRTL && styles.rtlRow]}
      >
        <View style={styles.orderInfo}>
          <View style={styles.orderHeaderRow}>
            <Text style={styles.orderId}>Order № {item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.statusText, { color: style.color }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.orderDate}>
            Placed on {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <View style={styles.orderFooter}>
            <Text style={styles.orderAmount}>
              Total: <Text style={styles.priceAmount}>AFN {Number(item.totalAmount).toFixed(0)}</Text>
            </Text>
            <View style={styles.detailLink}>
              <Text style={styles.detailText}>View Details</Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color="#000" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0A1128" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.header, isRTL && styles.rtlText]}>{t('myOrders') || 'My Orders'}</Text>
      
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
        }
        // 2. Add the Toggle Button as a List Footer
        ListFooterComponent={() => (
          orders.length > 4 ? (
            <TouchableOpacity 
              style={styles.expandBtn} 
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={styles.expandText}>
                {expanded ? "SHOW LESS" : `SHOW MORE (${orders.length - 4} MORE)`}
              </Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#666" />
            </TouchableOpacity>
          ) : null
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No orders found yet.</Text>
          </View>
        }
      />
    </View>
  );
}



const styles = StyleSheet.create({
   expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20, marginTop: 10 },
  expandText: { fontWeight: '900', fontSize: 13, letterSpacing: 1, color: '#666' },
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    fontSize: 18, 
    fontWeight: '800', 
    marginTop: 60, 
    marginBottom: 20, 
    color: '#000', 
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  list: { 
    paddingHorizontal: 16 
  },
  orderCard: { 
    paddingVertical: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2', // Minimal divider instead of full border
  },
  orderInfo: { 
    flex: 1 
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  orderId: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#000',
    letterSpacing: 0.5 
  },
  orderDate: { 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 12 
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  orderAmount: { 
    fontSize: 12, 
    color: '#666' 
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000'
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginRight: 4
  },
  center: { 
    flex: 1, 
    justifyContent: 'center',
    backgroundColor: '#fff' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 100,
    paddingHorizontal: 40
  },
  emptyText: { 
    color: '#000', 
    marginTop: 15, 
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center'
  },
  rtlRow: { 
    flexDirection: 'row-reverse' 
  },
  rtlText: { 
    textAlign: 'right' 
  }
});

