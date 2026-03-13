import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import StatsCard from '../components/StatsCard';
import ClothCard from '../components/ClothCard';
import { DashboardStats, ClothBatch } from '../types';
import { formatCurrency } from '../utils/calculations';
import { formatDisplayDate, todayDB } from '../utils/dateUtils';

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();

  const [stats, setStats] = useState<DashboardStats>({
    totalLengthToday: 0,
    totalEntriesToday: 0,
    totalLength: 0,
    totalEarnings: 0,
    totalEntries: 0,
  });
  const [recentEntries, setRecentEntries] = useState<ClothBatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [dashStats, recent] = await Promise.all([
        queries.getDashboardStats(),
        queries.getRecentBatches(5),
      ]);
      setStats(dashStats);
      setRecentEntries(recent);
    } catch (err) {
      console.error('Dashboard error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.appName, { color: colors.primary }]}>🧵 Kapda Manager</Text>
            <Text style={[s.subDate, { color: colors.textMuted }]}>
              {formatDisplayDate(todayDB())}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.headerAddBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddEntry', { mode: 'add' })}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsGrid}>
          <StatsCard
            title="Today's Entries"
            value={stats.totalEntriesToday.toString()}
            subtitle="records"
            icon="today-outline"
            color={colors.primary}
            style={s.halfCard}
          />
          <StatsCard
            title="Today's Length"
            value={`${stats.totalLengthToday.toFixed(1)} m`}
            subtitle="meters"
            icon="resize-outline"
            color={colors.secondary}
            style={s.halfCard}
          />
          <StatsCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            subtitle="all time"
            icon="cash-outline"
            color={colors.success}
            style={s.fullCard}
          />
          <StatsCard
            title="Total Records"
            value={stats.totalEntries.toString()}
            subtitle="entries"
            icon="document-text-outline"
            color={colors.warning}
            style={s.halfCard}
          />
          <StatsCard
            title="Total Cloth"
            value={`${stats.totalLength.toFixed(1)} m`}
            subtitle="all time"
            icon="trending-up-outline"
            color={colors.info}
            style={s.halfCard}
          />
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddEntry', { mode: 'add' })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={s.actionBtnText}>Add Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('Bill')}
          >
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={s.actionBtnText}>Generate Bill</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Entries ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RecordsTab')}>
              <Text style={[s.seeAll, { color: colors.primary }]}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recentEntries.length === 0 ? (
            <View style={[s.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="layers-outline" size={36} color={colors.textMuted} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No entries yet</Text>
              <Text style={[s.emptyHint, { color: colors.textMuted }]}>
                Tap "Add Entry" to record your first cloth entry
              </Text>
            </View>
          ) : (
            recentEntries.map((batch) => (
              <ClothCard
                key={batch.batchId}
                batch={batch}
                onPress={() => navigation.navigate('EditEntry', { batchId: batch.batchId })}
                onEdit={() => navigation.navigate('EditEntry', { batchId: batch.batchId })}
                showActions
              />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    appName: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    subDate: { fontSize: 13, marginTop: 2 },
    headerAddBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    halfCard: { width: '47.5%' },
    fullCard: { width: '100%' },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    section: { marginBottom: 8 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: '800' },
    seeAll: { fontSize: 13, fontWeight: '600' },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 32,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    emptyText: { fontSize: 15, fontWeight: '600' },
    emptyHint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  });
}
