import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ViewMap'>;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Dark Mode Map Style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

export default function ViewMapScreen({ navigation }: Props) {
  const [location, setLocation] = useState<any>(null);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [isCompassExpanded, setIsCompassExpanded] = useState(false);
  const [mapMode, setMapMode] = useState('north-up');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<any>(null);

  const target = {
    latitude: 19.076,
    longitude: 72.8777,
  };

  // 📍 LOCATION & HEADING
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (loc) => setLocation(loc.coords)
      );

      Location.watchHeadingAsync((h) => {
        const newHeading = h.trueHeading;
        setSmoothHeading((prev) => {
          let diff = newHeading - prev;
          while (diff < -180) diff += 360;
          while (diff > 180) diff -= 360;
          return prev + diff * 0.15;
        });
      });
    })();
  }, []);

  // 🧭 ANGLE, DISTANCE, DIRECTION
  const getAngle = () => {
    if (!location) return 0;
    const lat1 = (location.latitude * Math.PI) / 180;
    const lat2 = (target.latitude * Math.PI) / 180;
    const dLon = ((target.longitude - location.longitude) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    const normalized = (bearing + 360) % 360;
    const angle = (normalized - smoothHeading + 360) % 360;
    return angle > 180 ? angle - 360 : angle;
  };

  const getDistance = () => {
    if (!location) return 0;
    const R = 6371e3;
    const φ1 = (location.latitude * Math.PI) / 180;
    const φ2 = (target.latitude * Math.PI) / 180;
    const Δφ = ((target.latitude - location.latitude) * Math.PI) / 180;
    const Δλ = ((target.longitude - location.longitude) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getDirection = () => {
    const angle = getAngle();
    if (angle > 20) return 'Turn Right';
    if (angle < -20) return 'Turn Left';
    return 'Go Straight';
  };

  // 🗣️ Speak instructions
  const speakInstructions = () => {
    if (!location) {
      Speech.speak('Location not available yet');
      return;
    }
    const distance = getDistance();
    const direction = getDirection();
    const message = `In ${distance} metres, ${direction.toLowerCase()}`;
    Speech.speak(message);
  };

  const toggleCompassExpanded = () => {
    setIsCompassExpanded((prev) => !prev);
  };

  // 🗺️ Toggle map mode
  const toggleMapMode = () => {
    const newMode = mapMode === 'north-up' ? 'heading-up' : 'north-up';
    setMapMode(newMode);
    if (mapRef.current && location) {
      const targetHeading = newMode === 'north-up' ? 0 : smoothHeading;
      mapRef.current.animateCamera(
        { heading: targetHeading, center: location, zoom: 18 },
        { duration: 500 }
      );
    }
  };

  // 🧭 Follow heading
  useEffect(() => {
    if (mapMode === 'heading-up' && mapRef.current && location) {
      mapRef.current.animateCamera(
        { heading: smoothHeading, center: location },
        { duration: 100 }
      );
    }
  }, [smoothHeading, mapMode, location]);

  // 🔙 BACK
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isCompassExpanded) {
          setIsCompassExpanded(false);
          return true;
        }
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [isCompassExpanded])
  );

  // 🎬 FADE ON MOUNT
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const getArrowRotation = () => {
    if (!location) return 0;
    const mapHeading = mapMode === 'north-up' ? 0 : smoothHeading;
    return smoothHeading - mapHeading;
  };

  // ===================== MAP SCREEN =====================
  return (
    <Animated.View style={[styles.mapScreen, { opacity: fadeAnim }]}>
      {!isCompassExpanded ? (
        <>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>{getDistance()} m</Text>
            </View>
          </View>

          <View style={styles.croppedMapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              customMapStyle={darkMapStyle}
              showsUserLocation={false}
              initialRegion={{
                latitude: location?.latitude || 19.076,
                longitude: location?.longitude || 72.8777,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              {location && (
                <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
                  <View
                    style={[
                      styles.googleMarkerContainer,
                      {
                        transform: [
                          { rotate: `${getArrowRotation()}deg` },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.googleMarkerArrow} />
                    <View style={styles.googleMarkerDot} />
                  </View>
                </Marker>
              )}
              <Marker coordinate={target}>
                <Ionicons name="location" size={36} color="#EA4335" />
              </Marker>
            </MapView>
          </View>

          <View style={styles.bottomBar}>
            <Text style={styles.direction}>{getDirection()}</Text>
            <View style={styles.rightControls}>
              <TouchableOpacity
                onPress={toggleMapMode}
                style={styles.recenterButton}
              >
                <Ionicons
                  name={mapMode === 'north-up' ? 'navigate' : 'compass'}
                  size={24}
                  color="#4285F4"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCompassExpanded}>
                <View style={styles.compassRing}>
                  <Text style={styles.n}>N</Text>
                  <Text style={styles.s}>S</Text>
                  <Text style={styles.e}>E</Text>
                  <Text style={styles.w}>W</Text>
                  <View
                    style={[
                      styles.arrowContainer,
                      { transform: [{ rotate: `${smoothHeading}deg` }] },
                    ]}
                  >
                    <View style={styles.arrowNorth} />
                    <View style={styles.arrowSouth} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.expandedContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.expandedBackButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.largeCompassWrapper}>
            <View style={styles.largeCompassRing}>
              <Text style={styles.largeN}>N</Text>
              <Text style={styles.largeS}>S</Text>
              <Text style={styles.largeE}>E</Text>
              <Text style={styles.largeW}>W</Text>
              <View
                style={[
                  styles.largeArrowContainer,
                  { transform: [{ rotate: `${smoothHeading}deg` }] },
                ]}
              >
                <View style={styles.largeArrowNorth} />
                <View style={styles.largeArrowSouth} />
              </View>
            </View>
          </View>

          <View style={styles.expandedInfo}>
            <Text style={styles.expandedDistance}>{getDistance()} m</Text>
            <Text style={styles.expandedDirection}>{getDirection()}</Text>
          </View>

          <TouchableOpacity
            style={styles.speakerButton}
            onPress={speakInstructions}
          >
            <Ionicons name="volume-high" size={36} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapThumbnail}
            onPress={toggleCompassExpanded}
          >
            <MapView
              style={styles.thumbnailMap}
              customMapStyle={darkMapStyle}
              showsUserLocation={false}
              initialRegion={{
                latitude: location?.latitude || 19.076,
                longitude: location?.longitude || 72.8777,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              {location && (
                <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
                  <View
                    style={[
                      styles.googleMarkerContainer,
                      {
                        transform: [
                          { rotate: `${getArrowRotation()}deg` },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.googleMarkerArrow} />
                    <View style={styles.googleMarkerDot} />
                  </View>
                </Marker>
              )}
              <Marker coordinate={target}>
                <Ionicons name="location" size={24} color="#EA4335" />
              </Marker>
            </MapView>
            <TouchableOpacity
              style={styles.thumbnailRecenter}
              onPress={toggleMapMode}
            >
              <Ionicons
                name={mapMode === 'north-up' ? 'navigate' : 'compass'}
                size={20}
                color="#4285F4"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mapScreen: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  distancePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  distanceText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  croppedMapContainer: {
    height: SCREEN_HEIGHT * 0.75,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
  },
  direction: {
    color: '#FFF',
    fontSize: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    fontWeight: '600',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recenterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  compassRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  n: { position: 'absolute', top: 4, color: '#EA4335', fontSize: 10, fontWeight: 'bold' },
  s: { position: 'absolute', bottom: 4, color: '#AAA', fontSize: 10 },
  e: { position: 'absolute', right: 4, color: '#AAA', fontSize: 10 },
  w: { position: 'absolute', left: 4, color: '#AAA', fontSize: 10 },
  arrowContainer: {
    width: 35,
    height: 35,
    alignItems: 'center',
  },
  arrowNorth: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EA4335',
  },
  arrowSouth: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#AAA',
  },
  googleMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkerArrow: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(66, 133, 244, 0.4)',
  },
  googleMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  // ----- EXPANDED COMPASS -----
  expandedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  expandedBackButton: {
    position: 'absolute',
    top: 10,
    left: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    zIndex: 10,
  },
  largeCompassWrapper: {
    marginBottom: 30,
  },
  largeCompassRing: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  largeN: { position: 'absolute', top: 15, color: '#EA4335', fontSize: 26, fontWeight: 'bold' },
  largeS: { position: 'absolute', bottom: 15, color: '#888', fontSize: 26, fontWeight: 'bold' },
  largeE: { position: 'absolute', right: 15, color: '#888', fontSize: 26, fontWeight: 'bold' },
  largeW: { position: 'absolute', left: 15, color: '#888', fontSize: 26, fontWeight: 'bold' },
  largeArrowContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
  },
  largeArrowNorth: {
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 80,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EA4335',
  },
  largeArrowSouth: {
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderTopWidth: 80,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#666',
  },
  expandedInfo: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  expandedDistance: {
    color: '#FFF',
    fontSize: 52,
    fontWeight: 'bold',
  },
  expandedDirection: {
    color: '#AAA',
    fontSize: 24,
    marginTop: 5,
    fontWeight: '600',
  },
  speakerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
    marginBottom: 30,
  },
  mapThumbnail: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 140,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
  },
  thumbnailMap: {
    flex: 1,
  },
  thumbnailRecenter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
});
