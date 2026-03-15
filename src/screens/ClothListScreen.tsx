import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import ClothCard from '../components/ClothCard';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { ClothBatch } from '../types';
import { formatDisplayDate, toDBDate } from '../utils/dateUtils';
import { parseISO } from 'date-fns';
import { CUSTOMERS } from '../data/customers';

export default function ClothListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();

  const [entries, setEntries] = useState<ClothBatch[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      let data = await queries.getAllBatches(undefined, filterDate || undefined);
      if (search && search.trim()) {
        // Find customer names whose shortForm matches the search
        const matchingNames = CUSTOMERS.filter(c => c.shortForm.toLowerCase().includes(search.trim().toLowerCase())).map(c => c.name);
        data = data.filter(batch => matchingNames.includes(batch.customerName));
      }
      setEntries(data);
    } catch (err) {
      console.error('ClothList error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterDate]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleDelete = async (batchId: string) => {
    try {
      console.log('Deleting batchId:', batchId);
      await queries.deleteClothBatch(batchId);
      setEntries((prev) => prev.filter((b) => b.batchId !== batchId));
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Delete failed', error?.message || String(error));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterDate('');
  };

  const hasFilters = search.length > 0 || filterDate.length > 0;

  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>सर्व रिकॉर्ड</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddEntry', { mode: 'add' })}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search & Filter ── */}
      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={(v) => setSearch(v)}
            placeholder="ग्राहक के नाम से खोजें"
          />
        </View>
        <TouchableOpacity
          style={[
            s.filterBtn,
            { backgroundColor: filterDate ? colors.primary : colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowDateFilter(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={filterDate ? '#fff' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Active filters strip */}
      {hasFilters && (
        <View style={s.filterStrip}>
          {filterDate ? (
            <View style={[s.filterChip, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[s.filterChipText, { color: colors.primary }]}>
                {formatDisplayDate(filterDate)}
              </Text>
              <TouchableOpacity onPress={() => setFilterDate('')}>
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[s.clearText, { color: colors.error }]}>सभी हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats line */}
      {entries.length > 0 && (
        <View style={s.statsLine}>
          <Text style={[s.statsText, { color: colors.textMuted }]}>
            {entries.length} रिकॉर्ड
            {'  ·  '}
            {entries
              .flatMap((b) => b.entries)
              .reduce((sum, e) => sum + e.clothLength, 0)
              .toFixed(2)} चौका कुल
          </Text>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={entries.map(batch => ({
          ...batch,
          entries: [...batch.entries].sort((a, b) => a.clothNumber.localeCompare(b.clothNumber, undefined, { numeric: true }))
        }))}
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
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="layers-outline"
              title="कोई रिकॉर्ड नहीं"
              subtitle={
                hasFilters
                  ? 'खोज या फ़िल्टर बदलें'
                  : 'नया माल डालने के लिए + दबाएं'
              }
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── Date Filter Modal ── */}
      <Modal
        visible={showDateFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>तारीख से फ़िल्टर</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <TouchableOpacity
                style={[s.filterOptionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={s.filterOptionBtnText}>
                  {filterDate ? formatDisplayDate(filterDate) : 'तारीख चुनें'}
                </Text>
              </TouchableOpacity>

              {filterDate ? (
                <TouchableOpacity
                  style={[s.clearDateBtn, { borderColor: colors.error }]}
                  onPress={() => {
                    setFilterDate('');
                    setShowDateFilter(false);
                  }}
                >
                  <Text style={[s.clearDateBtnText, { color: colors.error }]}>तारीख फ़िल्टर हटाएं</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {showDatePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={filterDate ? parseISO(filterDate) : new Date()}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setFilterDate(toDBDate(date));
                    setShowDatePicker(false);
                    setShowDateFilter(false);
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={filterDate ? parseISO(filterDate) : new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) {
              setFilterDate(toDBDate(date));
              setShowDateFilter(false);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '800' },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 8,
    },
    filterBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    filterStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 6,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 4,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    clearText: { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
    statsLine: { paddingHorizontal: 16, marginBottom: 8 },
    statsText: { fontSize: 13 },
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E2E8F0',
    },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    filterOptionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
      marginTop: 12,
    },
    filterOptionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    clearDateBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      marginTop: 10,
    },
    clearDateBtnText: { fontWeight: '700', fontSize: 15 },
  });
}
