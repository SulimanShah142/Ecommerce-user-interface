import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '../../Contexts/CartContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../Contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen() {
  const router = useRouter();
  const { state: cartState, dispatch } = useCart();
  const { t, isRTL } = useLanguage();

  const incrementQuantity = (productId: string) => {
    const item = cartState.items.find((item) => item.product.id === productId);
    if (item) {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: {
          id: productId,
          quantity: item.quantity + 1,
        },
      });
    }
  };

  const decrementQuantity = (productId: string) => {
    const item = cartState.items.find((item) => item.product.id === productId);
    if (item && item.quantity > 1) {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: {
          id: productId,
          quantity: item.quantity - 1,
        },
      });
    } else if (item && item.quantity === 1) {
      dispatch({ type: 'REMOVE_ITEM', payload: { id: productId } });
    }
  };

const calculateTotal = () => {
  return cartState.items.reduce((sum, item) => {
    return sum + (Number(item.product.basePrice || 0) * item.quantity);
  }, 0);
};

  const goToCheckout = async () => {
    if (cartState.items.length === 0) {
      Alert.alert(t('emptyCart'));
      return;
    }
   router.replace('/checkout');
    Alert.alert(t('checkoutNotImplemented'));
  };

  const renderCartItem = ({ item }: { item: any }) => (
  <View style={[styles.cartItem, isRTL && styles.rtlRow]}>
    {/* SHEIN-style selection circle */}
    <View style={styles.checkCircle}>
       <Ionicons name="checkmark-circle" size={20} color="#000" />
    </View>

    <Image 
      source={{ uri: item.product.imageUrl }} 
      style={styles.cartItemImage} 
      resizeMode="cover"
    />

    <View style={styles.cartItemInfo}>
      <View style={styles.itemHeader}>
        <Text style={[styles.cartItemName, isRTL && styles.rtlText]} numberOfLines={1}>
          {item.product.name}
        </Text>
        <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
          <Ionicons name="trash-outline" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.itemVariant}>
        Size: {item.selectedSize || 'Free'} | Color: {item.selectedColor || 'Default'}
      </Text>

      <View style={styles.priceQuantityRow}>
        <Text style={styles.cartItemPrice}>AFN {item.product.basePrice}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.qBtn} onPress={() => decrementQuantity(item.product.id)}>
            <Ionicons name="remove" size={16} color="#000" />
          </TouchableOpacity>
          <Text style={styles.qText}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qBtn} onPress={() => incrementQuantity(item.product.id)}>
            <Ionicons name="add" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isRTL && styles.rtlContainer]}>
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>{t('yourCart')}</Text>
        </View>

        {cartState.items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={[styles.emptyCartText, isRTL && styles.rtlText]}>{t('emptyCart')}</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => {
                try {
                  router.push('/');
                } catch (error) {
                  console.error('[Cart] Navigation error:', error);
                }
              }}
            >
              <Text style={styles.browseButtonText}>{t('browseProducts')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={cartState.items}
              keyExtractor={(item) => item.product.id}
              renderItem={renderCartItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />

            <View style={[styles.totalContainer, isRTL && styles.rtlRow]}>
              <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>{t('total')}</Text>
              <Text style={[styles.totalPrice, isRTL && styles.rtlText]}>AFN {calculateTotal().toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.checkoutButton} onPress={goToCheckout}>
              <Text style={styles.checkoutButtonText}>{t('proceedCheckout')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    paddingTop: 20, 
    paddingBottom: 15, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5' 
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  
  flatListContent: { paddingHorizontal: 15, paddingTop: 10 },
  cartItem: { 
    flexDirection: 'row', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8F8F8',
    alignItems: 'center'
  },
  checkCircle: { marginRight: 10 },
  cartItemImage: { 
    width: 80, 
    height: 110, // Fashion vertical ratio
    backgroundColor: '#F9F9F9' 
  },
  cartItemInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cartItemName: { fontSize: 13, fontWeight: '500', color: '#222', width: '80%' },
  itemVariant: { fontSize: 11, color: '#999', marginVertical: 6 },
  
  priceQuantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cartItemPrice: { fontSize: 15, fontWeight: '800', color: '#000' },
  
  quantityContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#EEE',
    height: 30
  },
  qBtn: { width: 30, alignItems: 'center', justifyContent: 'center' },
  qText: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10 },

  // Bottom Fixed Section
  totalContainer: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#F5F5F5',
    backgroundColor: '#FFF'
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalLabel: { fontSize: 14, color: '#666' },
  totalPrice: { fontSize: 18, fontWeight: '900', color: '#000' },
  
  checkoutButton: { 
    backgroundColor: '#000', 
    height: 55, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 10
  },
  checkoutButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 2 },

  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyCartText: { fontSize: 14, color: '#999', marginBottom: 20, textAlign: 'center' },
  browseButton: { borderWidth: 1, borderColor: '#000', paddingHorizontal: 30, paddingVertical: 12 },
  browseButtonText: { fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },

  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'center',
  },
  listContainer: {
    flex: 1,
  },
})