import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Modal, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface UnifiedMapProps {
  role: 'USER' | 'DELIVER' | 'ADMIN';
  userCoords?: [number, number] | null;
  destinationCoords?: [number, number] | null;
  warehouseCoords?: [number, number] | null;
  driverCoords?: [number, number] | null; // Added driverCoords
  onLocationSelect?: (coords: [number, number]) => void;
}

const DEFAULT_KABUL: [number, number] = [34.5553, 69.2075];

export default function UnifiedMap({
  role,
  userCoords,
  destinationCoords,
  warehouseCoords,
  driverCoords, // Destructure here
  onLocationSelect,
}: UnifiedMapProps) {
  const [loading, setLoading] = useState(true);
  const [isFullMap, setIsFullMap] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const runJS = (code: string) => {
    webViewRef.current?.injectJavaScript(code);
  };

  // Live Driver Tracking: Move the marker without reloading the HTML
  useEffect(() => {
    if (driverCoords && !loading) {
      const moveJS = `
        if (typeof updateDriverPos === 'function') {
          updateDriverPos(${driverCoords[0]}, ${driverCoords[1]});
        }
      `;
      runJS(moveJS);
    }
  }, [driverCoords, loading]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (onLocationSelect && data.lat && data.lng) {
        onLocationSelect([data.lat, data.lng]);
      }
    } catch (e) {
      console.warn("Map message error:", e);
    }
  };

  const centerLat = destinationCoords?.[0] || userCoords?.[0] || DEFAULT_KABUL[0];
  const centerLng = destinationCoords?.[1] || userCoords?.[1] || DEFAULT_KABUL[1];

  const mapHtml = useMemo(() => {
    const whLat = warehouseCoords?.[0] || 0;
    const whLng = warehouseCoords?.[1] || 0;
    const destLat = destinationCoords?.[0] || 0;
    const destLng = destinationCoords?.[1] || 0;
    const drvLat = driverCoords?.[0] || 0;
    const drvLng = driverCoords?.[1] || 0;

    const hasWarehouse = !!(warehouseCoords && warehouseCoords[0]);
    const hasDest = !!(destinationCoords && destinationCoords[0]);
    const hasDriver = !!(driverCoords && driverCoords[0]);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
          .icon-label { font-size: 26px; text-align: center; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], 14);
          
          L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(map);

          function createEmojiIcon(emoji) {
            return L.divIcon({
              html: '<div class="icon-label">' + emoji + '</div>',
              className: 'custom-div-icon',
              iconSize: [35, 35],
              iconAnchor: [17, 35]
            });
          }

          // 1. Warehouse & Destination Markers
          if (${hasWarehouse}) L.marker([${whLat}, ${whLng}], { icon: createEmojiIcon('🏢') }).addTo(map);
          var destMarker = null;
          if (${hasDest}) destMarker = L.marker([${destLat}, ${destLng}], { icon: createEmojiIcon('📍') }).addTo(map);

          // 2. LIVE DRIVER MARKER
          var driverMarker = null;
          if (${hasDriver}) {
            driverMarker = L.marker([${drvLat}, ${drvLng}], { icon: createEmojiIcon('🛵') }).addTo(map);
          }

          // Global function to update driver position
          window.updateDriverPos = function(lat, lng) {
            var newPos = [lat, lng];
            if (!driverMarker) {
              driverMarker = L.marker(newPos, { icon: createEmojiIcon('🛵') }).addTo(map);
            } else {
              driverMarker.setLatLng(newPos);
            }
          };

          // 3. User Selection Interaction
          if ('${role}' === 'USER' && !${hasDest}) {
            map.on('click', function(e) {
              var lat = e.latlng.lat;
              var lng = e.latlng.lng;
              if (destMarker) map.removeLayer(destMarker);
              destMarker = L.marker([lat, lng], { icon: createEmojiIcon('📍') }).addTo(map);
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
            });
          }

          // 4. Routing logic
          if (${hasWarehouse} && ${hasDest}) {
            fetch('https://project-osrm.org{whLng},${whLat};${destLng},${destLat}?overview=full&geometries=geojson')
              .then(r => r.json())
              .then(data => {
                if (data.routes && data.routes[0]) {
                  L.geoJSON(data.routes[0].geometry, { style: { color: '#000', weight: 5, opacity: 0.6 } }).addTo(map);
                  map.fitBounds(L.latLngBounds([[${whLat}, ${whLng}], [${destLat}, ${destLng}]]), { padding: [50, 50] });
                }
              });
          }

          setTimeout(() => map.invalidateSize(), 500);
        </script>
      </body>
      </html>
    `;
  }, [role, warehouseCoords, destinationCoords]); // Removed driverCoords from here to prevent full map reloads

  const MapContent = () => (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.map}
      />
      
      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => runJS("map.zoomIn();")}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => runJS("map.zoomOut();")}>
          <Ionicons name="remove" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.expandBtn} onPress={() => setIsFullMap(!isFullMap)}>
        <Ionicons name={isFullMap ? "contract" : "expand"} size={20} color="#000" />
      </TouchableOpacity>
      
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
    </View>
  );

  return (
    <View style={isFullMap ? styles.fullscreenWrapper : styles.outerWrapper}>
      {!isFullMap ? <MapContent /> : (
        <Modal visible={isFullMap} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsFullMap(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <MapContent />
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: { height: 250, borderRadius: 2, overflow: 'hidden', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee' },
  fullscreenWrapper: { flex: 1 },
  map: { flex: 1 },
  expandBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: '#fff', padding: 10, elevation: 5, zIndex: 10 },
  zoomControls: { position: 'absolute', left: 15, top: '30%', backgroundColor: '#fff', elevation: 5, zIndex: 10 },
  zoomBtn: { padding: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 100 },
  closeBtn: { backgroundColor: '#000', padding: 10, borderRadius: 25 },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
});
