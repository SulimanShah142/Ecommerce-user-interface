import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../Contexts/LanguageContext';
import { authClient } from '@/lib/auth-client';
import { loadMyOrdersLocal, saveMyOrders, isOnline } from '../lib/offline';

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

      const online = await isOnline().catch(() => false);
      if (online) {
        const response = await fetch(`${API_URL}/api/orders/my-orders?userId=${session.user.id}`);
        const freshOrders = await response.json();
        
        if (response.ok && Array.isArray(freshOrders)) {
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
    if (session?.user?.id) {
      fetchOrders();
    }
  }, [session?.user?.id]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { color: '#FF9500', bg: '#FFF9E6' };
      case 'confirmed': return { color: '#000000', bg: '#F5F5F5' };
      case 'delivered': return { color: '#34C759', bg: '#EAFCEF' };
      case 'rejected': return { color: '#FF3B30', bg: '#FFEBEA' };
      default: return { color: '#8E8E93', bg: '#FAFAFA' };
    }
  };

  const dataToShow = expanded ? orders : orders.slice(0, 4);

  const renderOrder = ({ item }: { item: any }) => {
    const config = getStatusStyle(item.status);
    return (
      <TouchableOpacity 
        activeOpacity={0.75}
        onPress={() => router.push(`orders/${item.id}`)} 
        style={styles.orderCard}
      >
        <View style={styles.orderInfo}>
          {/* Header row supporting mirror text transformations safely */}
          <View style={[styles.orderHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.orderId}>ORDER № {item.id ? item.id.slice(0, 8).toUpperCase() : 'N/A'}</Text>
            <View style={[styles.badgeContainer, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusText, { color: config.color }]}>
                {(item.status || 'PENDING').toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.orderDate, isRTL && { textAlign: 'right' }]}>
            Placed on {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
          </Text>
          
          <View style={[styles.orderFooter, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.orderAmount, isRTL && { flexDirection: 'row-reverse' }]}>
              Total: <Text style={styles.priceAmount}>AFN {Number(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</Text>
            </Text>
            
            <View style={[styles.detailLink, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.detailText}>{t('viewDetails') || 'VIEW DETAILS'}</Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={12} color="#000" style={isRTL ? { marginRight: 0, marginLeft: 4 } : { marginLeft: 4 }} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="small" color="#000000" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.header, isRTL && styles.rtlText]}>{t('myOrders')?.toUpperCase() || 'MY ORDERS'}</Text>
      
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#000" />
        }
        ListFooterComponent={() => (
          orders.length > 4 ? (
            <TouchableOpacity 
              style={[styles.expandBtn, isRTL && { flexDirection: 'row-reverse' }]} 
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.expandText}>
                {expanded ? "SHOW LESS" : `SHOW MORE (${orders.length - 4} ITEMS)`}
              </Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#666" />
            </TouchableOpacity>
          ) : <View style={{ height: 40 }} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No active orders found yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  header: { 
    fontSize: 13, 
    fontWeight: '800', 
    marginTop: 64, 
    marginBottom: 16, 
    color: '#000000', 
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2.5
  },
  list: { 
    paddingHorizontal: 16 
  },
  orderCard: { 
    paddingVertical: 18, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  orderInfo: { 
    flex: 1 
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  orderId: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#000000',
    letterSpacing: 0.5 
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2
  },
  statusText: { 
    fontSize: 9, 
    fontWeight: '800',
    letterSpacing: 0.8
  },
  orderDate: { 
    fontSize: 11, 
    color: '#888888', 
    marginBottom: 14,
    fontWeight: '400'
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderAmount: { 
    fontSize: 11, 
    color: '#444444',
    fontWeight: '500'
  },
  priceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000'
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 1
  },
  detailText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  expandBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 18, 
    marginTop: 8 
  },
  expandText: { 
    fontWeight: '700', 
    fontSize: 11, 
    letterSpacing: 1, 
    color: '#505050' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 120,
    gap: 12
  },
  emptyText: { 
    color: '#888888', 
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  rtlText: { 
    textAlign: 'right',
    paddingRight: 16
  }
});
