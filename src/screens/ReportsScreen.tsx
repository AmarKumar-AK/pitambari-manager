import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import EmptyState from '../components/EmptyState';
import { MonthlyReport } from '../types';
import { formatCurrency } from '../utils/calculations';
import { formatMonthYear } from '../utils/dateUtils';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const queries = useClothQueries();
  const [reports, setReports] = useState<MonthlyReport[]>([]);

  useFocusEffect(
    useCallback(() => {
      queries.getMonthlyReports().then(setReports).catch(console.error);
    }, [])
  );

  const totalRevenue = reports.reduce((s, r) => s + r.totalAmount, 0);
  const totalMeters = reports.reduce((s, r) => s + r.totalLength, 0);
  const totalEntries = reports.reduce((s, r) => s + r.totalEntries, 0);

  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Summary Banner */}
      <View style={[s.banner, { backgroundColor: colors.primary }]}>
        <Text style={s.bannerTitle}>सर्वकालीन सारांश</Text>
        <View style={s.bannerStats}>
          <View style={s.bannerStat}>
            <Text style={s.bannerStatValue}>{reports.length}</Text>
            <Text style={s.bannerStatLabel}>महीने</Text>
          </View>
          <View style={s.bannerStatDiv} />
          <View style={s.bannerStat}>
            <Text style={s.bannerStatValue}>{totalEntries}</Text>
            <Text style={s.bannerStatLabel}>एंट्री</Text>
          </View>
          <View style={s.bannerStatDiv} />
          <View style={s.bannerStat}>
            <Text style={s.bannerStatValue}>{totalMeters.toFixed(0)} चौका</Text>
            <Text style={s.bannerStatLabel}>कपड़ा</Text>
          </View>
          <View style={s.bannerStatDiv} />
          <View style={s.bannerStat}>
            <Text style={s.bannerStatValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={s.bannerStatLabel}>आमदनी</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.month}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <View style={[s.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.reportHeader}>
              <Text style={[s.reportMonth, { color: colors.text }]}>{formatMonthYear(item.month)}</Text>
              <View style={[s.custBadge, { backgroundColor: colors.info + '20' }]}>
                <Text style={[s.custBadgeText, { color: colors.info }]}>
                  {item.customerCount} ग्राहक
                </Text>
              </View>
            </View>

            <View style={[s.reportGrid, { borderTopColor: colors.border }]}>
              <View style={s.reportStat}>
                <Text style={[s.reportStatValue, { color: colors.text }]}>{item.totalEntries}</Text>
                <Text style={[s.reportStatLabel, { color: colors.textMuted }]}>एंट्री</Text>
              </View>
              <View style={[s.reportStatDiv, { backgroundColor: colors.border }]} />
              <View style={s.reportStat}>
                <Text style={[s.reportStatValue, { color: colors.text }]}>{item.totalLength.toFixed(2)} चौका</Text>
                <Text style={[s.reportStatLabel, { color: colors.textMuted }]}>लंबाई</Text>
              </View>
              <View style={[s.reportStatDiv, { backgroundColor: colors.border }]} />
              <View style={s.reportStat}>
                <Text style={[s.reportStatValue, { color: colors.success }]}>{formatCurrency(item.totalAmount)}</Text>
                <Text style={[s.reportStatLabel, { color: colors.textMuted }]}>आमदनी</Text>
              </View>
            </View>

            {/* Mini progress bar relative to max month */}
            {totalRevenue > 0 && (
              <View style={[s.progressBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.round((item.totalAmount / Math.max(...reports.map((r) => r.totalAmount))) * 100)}%`,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bar-chart-outline"
            title="अभी कोई रिपोर्ट नहीं"
            subtitle="एंट्री डालने के बाद मासिक रिपोर्ट दिखेगी"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    banner: {
      padding: 20,
      paddingBottom: 24,
    },
    bannerTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    bannerStats: { flexDirection: 'row', alignItems: 'center' },
    bannerStat: { flex: 1, alignItems: 'center' },
    bannerStatValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
    bannerStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
    bannerStatDiv: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
    reportCard: {
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    reportMonth: { fontSize: 16, fontWeight: '800' },
    custBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    custBadgeText: { fontSize: 12, fontWeight: '600' },
    reportGrid: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12,
      marginBottom: 10,
    },
    reportStat: { flex: 1, alignItems: 'center' },
    reportStatValue: { fontSize: 14, fontWeight: '700' },
    reportStatLabel: { fontSize: 11, marginTop: 3 },
    reportStatDiv: { width: 1, marginHorizontal: 8, height: 36 },
    progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
  });
}
