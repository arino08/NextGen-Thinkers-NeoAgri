import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RequestService'>;
  route: RouteProp<RootStackParamList, 'RequestService'>;
};

type DataRowProps = {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
};

function DataRow({ icon, label, value, color = '#69F0AE' }: DataRowProps) {
  return (
    <View style={styles.dataRow}>
      <View style={[styles.dataIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.dataText}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function RequestServiceScreen({ navigation, route }: Props) {
  const { farmData } = route.params;

  const jsonOutput = JSON.stringify(farmData, null, 2);

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
          <Text style={styles.headerTitle}>Service Request</Text>
          <Text style={styles.headerSub}>Review before booking</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Ready to Submit</Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farm Details</Text>
          <DataRow icon="person-outline" label="Farmer Name" value={farmData.name || '—'} color="#69F0AE" />
          <View style={styles.rowDivider} />
          <DataRow icon="resize-outline" label="Farm Size" value={`${farmData.farmSize || '—'} acres`} color="#4285F4" />
          <View style={styles.rowDivider} />
          <DataRow icon="leaf-outline" label="Crop Type" value={farmData.cropType || '—'} color="#FF9800" />
          <View style={styles.rowDivider} />
          <DataRow icon="location-outline" label="Location" value={farmData.location || '—'} color="#EA4335" />
          <View style={styles.rowDivider} />
          <DataRow icon="time-outline" label="Submitted At" value={farmData.timestamp ? new Date(farmData.timestamp).toLocaleString() : '—'} color="#AAA" />
        </View>

        {/* JSON card */}
        <View style={styles.jsonCard}>
          <View style={styles.jsonHeader}>
            <Ionicons name="code-slash-outline" size={16} color="#69F0AE" />
            <Text style={styles.jsonHeaderText}>Structured Payload</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.jsonText}>{jsonOutput}</Text>
          </ScrollView>
        </View>

        {/* Action buttons */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
          <Ionicons name="paper-plane-outline" size={20} color="#0B0F0C" />
          <Text style={styles.primaryBtnText}>Submit Request</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={20} color="#69F0AE" />
          <Text style={styles.secondaryBtnText}>Export / Share</Text>
        </TouchableOpacity>

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
  },
  headerSub: {
    color: '#69F0AE',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(105,240,174,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.2)',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#69F0AE',
    shadowColor: '#69F0AE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    color: '#69F0AE',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  dataIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataText: {
    flex: 1,
  },
  dataLabel: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dataValue: {
    color: '#F0F0F0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  jsonCard: {
    backgroundColor: '#0D1A0F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.15)',
  },
  jsonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  jsonHeaderText: {
    color: '#69F0AE',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  jsonText: {
    color: '#A5D6A7',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#69F0AE',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#69F0AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#0B0F0C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(105,240,174,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(105,240,174,0.2)',
  },
  secondaryBtnText: {
    color: '#69F0AE',
    fontSize: 15,
    fontWeight: '700',
  },
});
