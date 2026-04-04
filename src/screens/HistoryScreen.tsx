import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

const { width: SCREEN_W } = Dimensions.get('window');

type HistoryEntry = {
  id: string;
  location: string;
  date: string;
  scanType: string;
  crop: string;
  image: any;
  statusColor: string;
};

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    location: 'Nashik, Maharashtra',
    date: '02 Apr 2026',
    scanType: 'Aerial Survey',
    crop: 'Wheat',
    image: require('../../assets/view_map.png'),
    statusColor: '#4CAF50',
  },
  {
    id: '2',
    location: 'Pune, Maharashtra',
    date: '30 Mar 2026',
    scanType: 'Crop Health Scan',
    crop: 'Tomato',
    image: require('../../assets/history.png'),
    statusColor: '#FF9800',
  },
  {
    id: '3',
    location: 'Solapur, Maharashtra',
    date: '25 Mar 2026',
    scanType: 'Soil Moisture Map',
    crop: 'Sugarcane',
    image: require('../../assets/req_drone.png'),
    statusColor: '#2196F3',
  },
  {
    id: '4',
    location: 'Aurangabad, Maharashtra',
    date: '18 Mar 2026',
    scanType: 'Pesticide Spray',
    crop: 'Cotton',
    image: require('../../assets/view_map.png'),
    statusColor: '#9C27B0',
  },
  {
    id: '5',
    location: 'Kolhapur, Maharashtra',
    date: '10 Mar 2026',
    scanType: 'Aerial Survey',
    crop: 'Rice',
    image: require('../../assets/history.png'),
    statusColor: '#4CAF50',
  },
];

function HistoryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
      >
        {/* Background image */}
        <Image source={entry.image} style={styles.cardBg} resizeMode="cover" />
        {/* Dark gradient overlay */}
        <View style={styles.cardOverlay} />

        {/* Status dot */}
        <View style={[styles.statusDot, { backgroundColor: entry.statusColor }]} />

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <View style={styles.cardTagRow}>
              <View style={[styles.tag, { borderColor: entry.statusColor }]}>
                <Text style={[styles.tagText, { color: entry.statusColor }]}>
                  {entry.scanType}
                </Text>
              </View>
            </View>
            <Text style={styles.cardLocation}>{entry.location}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="leaf-outline" size={13} color="#69F0AE" />
              <Text style={styles.cardMetaText}>{entry.crop}</Text>
              <Text style={styles.cardMetaDot}>·</Text>
              <Ionicons name="calendar-outline" size={13} color="#AAA" />
              <Text style={styles.cardMetaText}>{entry.date}</Text>
            </View>
          </View>

          {/* Circular arrow button */}
          <TouchableOpacity style={styles.arrowBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-forward-circle" size={38} color="rgba(160,160,160,0.85)" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Activity History</Text>
          <Text style={styles.headerSub}>{MOCK_HISTORY.length} operations recorded</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="filter-outline" size={22} color="#69F0AE" />
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Cards list */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_HISTORY.map((entry, index) => (
          <HistoryCard key={entry.id} entry={entry} index={index} />
        ))}

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F0C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#E8F5E9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: '#69F0AE',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  headerRight: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(105,240,174,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.2)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 14,
    gap: 14,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '130%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,12,8,0.72)',
  },
  statusDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: 5,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardTagRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardLocation: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardMetaText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '500',
  },
  cardMetaDot: {
    color: '#555',
    fontSize: 12,
  },
  arrowBtn: {
    marginLeft: 12,
    opacity: 0.9,
  },
});
