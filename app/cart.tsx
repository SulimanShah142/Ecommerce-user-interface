import React, { useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../Contexts/CartContext';
import { useLanguage } from '../Contexts/LanguageContext';

export default function CartScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { state: cartState, removeFromCart, addToCart } = useCart();

  const incrementQuantity = (item: any) => {
    addToCart(item, 1, item.selectedSize, item.selectedColor);
  };

  const decrementQuantity = (item: any) => {
    if (item.quantity > 1) {
      addToCart(item, -1, item.selectedSize, item.selectedColor);
    } else {
      removeFromCart(item.id, item.selectedSize, item.selectedColor);
    }
  };

  // 🎯 FIXED TOTAL ENGINE: Calculates directly off item.price flat attributes instead of item.product nodes
    // Inside app/cart.tsx -> Core Variables Block
  const calculateTotal = useMemo(() => {
    if (!cartState.items || cartState.items.length === 0) return 0;
    
    return cartState.items.reduce((sum, item) => {
      // 🎯 THE RESILIENCE FIX: Safely parse string parameters into numbers to prevent NaN/0 errors
      const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : (Number(item.price) || 0);
      const quantity = Number(item.quantity) || 1;
      
      return sum + (unitPrice * quantity);
    }, 0);
  }, [cartState.items]);


  const goToCheckout = async () => {
    if (cartState.items.length === 0) {
      Alert.alert(t('emptyCart') || 'Your bag is empty.');
      return;
    }
    router.replace('/checkout');
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={[styles.cartItem, isRTL && styles.rtlRow]}>
      <View style={styles.checkCircle}>
         <Ionicons name="checkmark-circle" size={20} color="#000000" />
      </View>

      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.cartItemImage} 
        resizeMode="cover"
      />

      <View style={styles.cartItemInfo}>
        <View style={styles.itemHeader}>
          <Text style={[styles.cartItemName, isRTL && styles.rtlText]} numberOfLines={1}>
            {item.name?.toUpperCase()}
          </Text>
          <TouchableOpacity onPress={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}>
            <Ionicons name="trash-outline" size={18} color="#999999" />
          </TouchableOpacity>
        </View>

        <Text style={styles.itemVariant}>
          SIZE: {item.selectedSize || 'M'}  |  COLOR: {item.selectedColor || 'STANDARD'}
        </Text>

        <View style={styles.priceQuantityRow}>
          {/* 🎯 FIXED ROW DISPLAY PRICE */}
          <Text style={styles.cartItemPrice}>
            AFN {Math.round(Number(item.price || 0) * (item.quantity || 1)).toLocaleString()}
          </Text>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.qBtn} onPress={() => decrementQuantity(item)}>
              <Ionicons name="remove" size={14} color="#000" />
            </TouchableOpacity>
            <Text style={styles.qText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qBtn} onPress={() => incrementQuantity(item)}>
              <Ionicons name="add" size={14} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.container, isRTL && styles.rtlContainer]}>
        
        {/* HEADER */}
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>
            {(t('yourCart') || 'SHOPPING BAG').toUpperCase()}
          </Text>
        </View>

        {cartState.items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="bag-handle-outline" size={44} color="#CCCCCC" />
            <Text style={[styles.emptyCartText, styles.spacingTop, isRTL && styles.rtlText]}>
              {t('emptyCart') || 'YOUR BAG IS CURRENTLY EMPTY.'}
            </Text>
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/')}>
              <Text style={styles.browseButtonText}>CONTINUE SHOPPING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 🎯 FIXED WRAPPER LAYOUT: Keeps flatlist fluid and docks the summary button tray cleanly at the absolute bottom
          <View style={styles.mainCartBody}>
            <FlatList
              data={cartState.items}
              keyExtractor={(item, idx) => `bag-item-${item.id}-${item.selectedSize}-${idx}`}
              renderItem={renderCartItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />

            {/* STICKY ACCENT FOOTER GROUP */}
            <View style={styles.stickyFooterWrapper}>
             <View style={[styles.totalContainer, isRTL && { flexDirection: 'row-reverse' }]}>
  <Text style={styles.totalLabel}>ORDER TOTAL SUB</Text>
  
  {/* 🎯 THE CRITICAL FIX: Changed 'calculateTotal' to your exact hook definition name 'calculateTotal' */}
  <Text style={styles.totalPrice}>
    AFN {Math.round(calculateTotal).toLocaleString()}
  </Text>
</View>

              <TouchableOpacity style={styles.checkoutButton} onPress={goToCheckout}>
                <Text style={styles.checkoutButtonText}>PROCEED TO SECURE CHECKOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  rtlContainer: { direction: 'rtl' },
  header: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, color: '#000' },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  
  // Layout Body Flex Adjuster
  mainCartBody: { flex: 1, justifyContent: 'space-between' },
  flatListContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30 },
  
  cartItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#FAFAFA', paddingBottom: 15 },
  checkCircle: { marginRight: 12 },
  cartItemImage: { width: 65, height: 85, backgroundColor: '#FAFAFA' },
  cartItemInfo: { flex: 1, marginLeft: 14 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartItemName: { fontSize: 12, fontWeight: '800', color: '#111', flex: 1, marginRight: 10 },
  itemVariant: { fontSize: 9, fontWeight: '700', color: '#999999', marginTop: 4, letterSpacing: 0.2 },
  
  priceQuantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cartItemPrice: { fontSize: 13, fontWeight: '900', color: '#000' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EFEFEF' },
  qBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  qText: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, color: '#000' },
  
  // 🎯 FIXED: Docked sticky wrapper pushes accounting items cleanly against the absolute screen base edge
  stickyFooterWrapper: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 10 },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: '#FAFAFA', marginHorizontal: 20 },
  totalLabel: { fontSize: 10, fontWeight: '900', color: '#888', letterSpacing: 1 },
  totalPrice: { fontSize: 16, fontWeight: '900', color: '#000' },
  
  checkoutButton: { backgroundColor: '#000000', marginHorizontal: 20, marginTop: 10, marginBottom: Platform.OS === 'ios' ? 25 : 15, paddingVertical: 16, alignItems: 'center', borderRadius: 2 },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  spacingTop: { marginTop: 12 },
  emptyCartText: { fontSize: 11, fontWeight: '800', color: '#999', textAlign: 'center', letterSpacing: 0.5 },
  browseButton: { backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 14, marginTop: 20, borderRadius: 2 },
  browseButtonText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});
