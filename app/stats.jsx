import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../lib/voiceStyles';
import { getAllMarkers } from '../db/markers';
import { db } from '../db/schema';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMarkers: 0,
    totalScans: 0,
    diseasesFound: 0,
    healthyScans: 0,
    droneBookings: 0,
    acresProtected: 0,
    savingsEstimate: 0,
    diseaseBreakdown: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Local markers (drone-detected disease spots)
      const markers = await getAllMarkers();

      // Local manual scans
      const scansResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM manual_scans;');
      const totalScans = scansResult?.count || 0;

      // Disease breakdown from markers
      const diseaseCount = {};
      markers.forEach(m => {
        if (m.disease && m.disease !== 'Healthy') {
          diseaseCount[m.disease] = (diseaseCount[m.disease] || 0) + 1;
        }
      });
      const diseaseBreakdown = Object.entries(diseaseCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Try to fetch booking stats from backend
      let droneBookings = 0;
      let acresProtected = 0;
      try {
        const res = await fetch(`${API_URL}/drone/stats`);
        if (res.ok) {
          const d = await res.json();
          droneBookings = parseInt(d.total) || 0;
        }
        const bRes = await fetch(`${API_URL}/drone/bookings`);
        if (bRes.ok) {
          const bData = await bRes.json();
          acresProtected = (bData.bookings || []).reduce((sum, b) => sum + (b.area_acres || 1), 0);
        }
      } catch {}

      const diseasesFound = markers.filter(m => m.disease && m.disease !== 'Healthy').length;

      // Savings estimate: avg ₹800/acre saved by early detection
      const savingsEstimate = Math.max(acresProtected, 1) * 800 * Math.max(diseasesFound, 1) / Math.max(diseasesFound, 3);

      setStats({
        totalMarkers: markers.length,
        totalScans,
        diseasesFound,
        healthyScans: markers.filter(m => m.disease === 'Healthy').length,
        droneBookings,
        acresProtected: Math.max(acresProtected, 1),
        savingsEstimate: Math.round(savingsEstimate),
        diseaseBreakdown,
      });
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← वापस</Text>
        </TouchableOpacity>
        <Text style={styles.title}>प्रभाव रिपोर्ट</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero stat */}
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>₹{stats.savingsEstimate.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroLabel}>अनुमानित बचत</Text>
          <Text style={styles.heroSub}>शुरुआती पहचान से</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          <StatCard
            value={stats.acresProtected}
            unit="एकड़"
            label="सुरक्षित क्षेत्र"
            color="#00C896"
          />
          <StatCard
            value={stats.diseasesFound}
            unit=""
            label="बीमारियाँ पकड़ीं"
            color="#FF4D4D"
          />
          <StatCard
            value={stats.droneBookings}
            unit=""
            label="ड्रोन स्कैन"
            color="#4A90E2"
          />
          <StatCard
            value={stats.totalScans}
            unit=""
            label="कैमरा स्कैन"
            color="#FFA500"
          />
        </View>

        {/* Disease breakdown */}
        {stats.diseaseBreakdown.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>बीमारी विवरण</Text>
            {stats.diseaseBreakdown.map((d, i) => (
              <View key={d.name} style={styles.breakdownRow}>
                <View style={styles.breakdownBar}>
                  <View
                    style={[
                      styles.breakdownFill,
                      {
                        width: `${Math.min(100, (d.count / (stats.diseaseBreakdown[0]?.count || 1)) * 100)}%`,
                        backgroundColor: ['#FF4D4D', '#FFA500', '#E8A020', '#4A90E2', '#FF6B6B', '#FFD700', '#9B59B6'][i % 7],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownName}>{d.name}</Text>
                <Text style={styles.breakdownCount}>{d.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Total markers */}
        <View style={styles.footerStat}>
          <Text style={styles.footerStatText}>
            कुल {stats.totalMarkers} मार्कर cached • {stats.healthyScans} स्वस्थ
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, unit, label, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>
        {value}{unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  title: {
    ...FONTS.hindiHero,
    fontSize: 22,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.orbTeal + '33',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.orbTeal,
  },
  heroLabel: {
    ...FONTS.hindiBody,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  heroSub: {
    ...FONTS.hindiSmall,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statUnit: {
    fontSize: 16,
    fontWeight: '400',
  },
  statLabel: {
    ...FONTS.hindiSmall,
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakdownTitle: {
    ...FONTS.hindiBody,
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    width: 100,
  },
  breakdownCount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  footerStat: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerStatText: {
    ...FONTS.hindiSmall,
  },
});
