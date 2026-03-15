import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import ClothCard from '../components/ClothCard';
import EmptyState from '../components/EmptyState';
import { ClothBatch } from '../types';
import { formatCurrency } from '../utils/calculations';
import { formatDisplayDate } from '../utils/dateUtils';

export default function CustomerLedgerScreen({ navigation, route }: any) {
  const { customerName } = route.params as { customerName: string };
  const { colors } = useTheme();
  const queries = useClothQueries();

  const [entries, setEntries] = useState<ClothBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const allClothEntries = entries.flatMap((b) => b.entries);
  const totalLength = allClothEntries.reduce((s, e) => s + e.clothLength, 0);
  const totalColoring = allClothEntries.reduce((s, e) => s + e.coloringTotal, 0);
  const grandTotal = allClothEntries.reduce((s, e) => s + e.totalCost, 0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await queries.getBatchesByCustomer(customerName);
        setEntries(data);
      } catch (err) {
        console.error('CustomerLedger error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerName]);

  const handleDelete = async (batchId: string) => {
    try {
      console.log('Deleting batchId:', batchId);
      await queries.deleteClothBatch(batchId);
      setEntries((prev) => prev.filter((entry) => entry.batchId !== batchId));
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Delete failed', error?.message || String(error));
    }
  };

  const s = createStyles(colors);

  const ListHeader = () => (
    <>
      {/* Summary card */}
      <View style={[s.summaryCard, { backgroundColor: colors.primary }]}>
        <Text style={s.summaryName}>{customerName}</Text>
        <Text style={s.summarySubtitle}>{entries.length} रिकॉर्ड</Text>

          <View style={s.summaryStats}>
          <View style={s.summaryStat}>
            <Text style={s.summaryStatValue}>{totalLength.toFixed(2)} चौका</Text>
            <Text style={s.summaryStatLabel}>कुल लंबाई</Text>
          </View>
          <View style={s.summaryStatDivider} />
          <View style={s.summaryStat}>
            <Text style={s.summaryStatValue}>{formatCurrency(totalColoring)}</Text>
            <Text style={s.summaryStatLabel}>रंगाई</Text>
          </View>
        </View>

        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>कुल देय राशि</Text>
          <Text style={s.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.actionsRow}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={() => navigation.navigate('Bill', { customerName })}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={s.actionBtnText}>बिल बनाएं</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddEntry', { mode: 'add' })}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.actionBtnText}>नया माल</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.sectionTitle, { color: colors.text }]}>सभी एंट्री</Text>
    </>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.batchId}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <ClothCard
            batch={item}
            onPress={() => navigation.navigate('EditEntry', { batchId: item.batchId })}
            onEdit={() => navigation.navigate('EditEntry', { batchId: item.batchId })}
            onDelete={() => handleDelete(item.batchId)}
            showActions
          />
        )}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="layers-outline" title="कोई एंट्री नहीं" />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    summaryCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 14,
      marginTop: 8,
    },
    summaryName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
    summarySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 18 },
    summaryStats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      padding: 12,
    },
    summaryStat: { flex: 1, alignItems: 'center' },
    summaryStatValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
    summaryStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
    summaryStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    grandTotalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    grandTotalValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 6,
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  });
}
