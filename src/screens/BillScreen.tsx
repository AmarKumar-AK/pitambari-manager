import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import { BillData, ClothEntry } from '../types';
import { formatCurrency } from '../utils/calculations';
import { formatDisplayDate, toDBDate, todayDB } from '../utils/dateUtils';
import { generateAndSharePDF, printBill } from '../utils/pdfGenerator';
import { parseISO } from 'date-fns';

export default function BillScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();

  const prefilledCustomer: string = route.params?.customerName ?? '';
  const prefilledDate: string = route.params?.receivedDate ?? todayDB();

  const [customerName, setCustomerName] = useState(prefilledCustomer);
  const [receivedDate, setReceivedDate] = useState(prefilledDate);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [billEntries, setBillEntries] = useState<ClothEntry[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    queries.getAllCustomerNames().then(setCustomerNames);
  }, []);

  useEffect(() => {
    if (customerName) {
      queries.getUniqueDatesForCustomer(customerName).then(setUniqueDates);
    }
  }, [customerName]);

  const fetchBill = async () => {
    if (!customerName || !receivedDate) return;
    const data = await queries.getEntriesByCustomerAndDate(customerName, receivedDate);
    setBillEntries(data);
    setSearched(true);
  };

  const grandTotal = billEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalLength = billEntries.reduce((s, e) => s + e.clothLength, 0);

  const billData: BillData = {
    customerName,
    receivedDate,
    entries: billEntries,
    grandTotal,
    totalLength,
    billDate: todayDB(),
  };

  const handleGeneratePDF = async () => {
    if (billEntries.length === 0) {
      Alert.alert('No Entries', 'No cloth entries found for the selected customer and date.');
      return;
    }
    setGenerating(true);
    try {
      await generateAndSharePDF(billData);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to generate PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (billEntries.length === 0) {
      Alert.alert('No Entries', 'No cloth entries found for the selected customer and date.');
      return;
    }
    try {
      await printBill(billData);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to print.');
    }
  };

  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Customer */}
        <View style={[s.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.stepHeader}>
            <View style={[s.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={s.stepNum}>1</Text>
            </View>
            <Text style={[s.stepTitle, { color: colors.text }]}>Select Customer</Text>
          </View>
          <TouchableOpacity
            style={[s.selectorBtn, { backgroundColor: colors.surface, borderColor: customerName ? colors.primary : colors.border }]}
            onPress={() => setShowCustomerModal(true)}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={customerName ? colors.primary : colors.textMuted}
            />
            <Text style={[s.selectorText, { color: customerName ? colors.text : colors.textMuted }]}>
              {customerName || 'Choose a customer'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Step 2: Select Date */}
        <View style={[s.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.stepHeader}>
            <View style={[s.stepBadge, { backgroundColor: colors.secondary }]}>
              <Text style={s.stepNum}>2</Text>
            </View>
            <Text style={[s.stepTitle, { color: colors.text }]}>Select Date</Text>
          </View>

          {uniqueDates.length > 0 && customerName ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {uniqueDates.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    s.datePill,
                    {
                      backgroundColor: receivedDate === d ? colors.primary : colors.surface,
                      borderColor: receivedDate === d ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setReceivedDate(d)}
                >
                  <Text style={[s.datePillText, { color: receivedDate === d ? '#fff' : colors.text }]}>
                    {formatDisplayDate(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={[s.selectorBtn, { backgroundColor: colors.surface, borderColor: receivedDate ? colors.secondary : colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={receivedDate ? colors.secondary : colors.textMuted} />
            <Text style={[s.selectorText, { color: receivedDate ? colors.text : colors.textMuted }]}>
              {receivedDate ? formatDisplayDate(receivedDate) : 'Choose a date'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[s.searchBtn, { backgroundColor: colors.primary }]}
          onPress={fetchBill}
          disabled={!customerName || !receivedDate}
        >
          <Ionicons name="search-outline" size={20} color="#fff" />
          <Text style={s.searchBtnText}>Load Bill Entries</Text>
        </TouchableOpacity>

        {/* Bill Preview */}
        {searched && (
          <View style={[s.billCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.billHeader}>
              <Text style={[s.billTitle, { color: colors.primary }]}>🧵 Kapda Manager</Text>
              <Text style={[s.billSubtitle, { color: colors.textSecondary }]}>Cloth Coloring Bill</Text>
            </View>

            <View style={[s.billMeta, { borderColor: colors.border }]}>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>Customer</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]}>{customerName}</Text>
              </View>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>Date</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]}>{formatDisplayDate(receivedDate)}</Text>
              </View>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>Entries</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]}>{billEntries.length}</Text>
              </View>
            </View>

            {billEntries.length === 0 ? (
              <Text style={[s.noEntries, { color: colors.textMuted }]}>
                No cloth entries found for this customer on this date.
              </Text>
            ) : (
              <>
                {/* Table Header */}
                <View style={[s.tableRow, s.tableHeader, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[s.thCell, s.col1, { color: colors.primary }]}>#</Text>
                  <Text style={[s.thCell, s.col2, { color: colors.primary }]}>No.</Text>
                  <Text style={[s.thCell, s.col3, { color: colors.primary }]}>Length</Text>
                  <Text style={[s.thCell, s.col4, { color: colors.primary }]}>Cloth</Text>
                  <Text style={[s.thCell, s.col5, { color: colors.primary }]}>Color</Text>
                  <Text style={[s.thCell, s.col6, { color: colors.primary }]}>Total</Text>
                </View>

                {billEntries.map((entry, idx) => (
                  <View
                    key={entry.id}
                    style={[s.tableRow, { backgroundColor: idx % 2 === 0 ? colors.surface : colors.background, borderBottomColor: colors.border }]}
                  >
                    <Text style={[s.tdCell, s.col1, { color: colors.textSecondary }]}>{idx + 1}</Text>
                    <Text style={[s.tdCell, s.col2, { color: colors.text, fontWeight: '700' }]}>{entry.clothNumber}</Text>
                    <Text style={[s.tdCell, s.col3, { color: colors.text }]}>{entry.clothLength.toFixed(2)}m</Text>
                    <Text style={[s.tdCell, s.col4, { color: colors.text }]}>{formatCurrency(entry.clothTotal)}</Text>
                    <Text style={[s.tdCell, s.col5, { color: colors.text }]}>{formatCurrency(entry.coloringTotal)}</Text>
                    <Text style={[s.tdCell, s.col6, { color: colors.success, fontWeight: '700' }]}>{formatCurrency(entry.totalCost)}</Text>
                  </View>
                ))}

                {/* Total Row */}
                <View style={[s.tableRow, s.totalRow, { backgroundColor: colors.primary + '10', borderTopColor: colors.primary }]}>
                  <Text style={[s.totalCell, { color: colors.text, flex: 3 }]}>TOTAL</Text>
                  <Text style={[s.totalCell, s.col3, { color: colors.text }]}>{totalLength.toFixed(2)}m</Text>
                  <Text style={[s.totalCell, s.col4, { color: colors.text }]}></Text>
                  <Text style={[s.totalCell, s.col5, { color: colors.text }]}></Text>
                  <Text style={[s.totalCell, s.col6, { color: colors.primary, fontSize: 14 }]}>{formatCurrency(grandTotal)}</Text>
                </View>

                {/* Grand Total Banner */}
                <View style={[s.grandTotalBanner, { backgroundColor: colors.primary }]}>
                  <Text style={s.grandTotalLabel}>Grand Total Payable</Text>
                  <Text style={s.grandTotalAmount}>{formatCurrency(grandTotal)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {searched && billEntries.length > 0 && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.pdfBtn, { backgroundColor: colors.error }]}
              onPress={handleGeneratePDF}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={s.pdfBtnText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[s.printBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePrint}
              >
                <Ionicons name="print-outline" size={20} color={colors.text} />
                <Text style={[s.printBtnText, { color: colors.text }]}>Print</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide" onRequestClose={() => setShowCustomerModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customerNames}
              keyExtractor={(item) => item}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalOption, { borderBottomColor: colors.border, backgroundColor: customerName === item ? colors.primary + '15' : 'transparent' }]}
                  onPress={() => {
                    setCustomerName(item);
                    setShowCustomerModal(false);
                    setSearched(false);
                    setBillEntries([]);
                  }}
                >
                  <Ionicons name="person-outline" size={16} color={customerName === item ? colors.primary : colors.textMuted} />
                  <Text style={[s.modalOptionText, { color: colors.text }]}>{item}</Text>
                  {customerName === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[s.noEntries, { color: colors.textMuted }]}>No customers found.</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[s.doneBtn, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={receivedDate ? parseISO(receivedDate) : new Date()}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) setReceivedDate(toDBDate(date));
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={receivedDate ? parseISO(receivedDate) : new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setReceivedDate(toDBDate(date));
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    stepCard: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepNum: { color: '#fff', fontWeight: '800', fontSize: 14 },
    stepTitle: { fontSize: 16, fontWeight: '700' },
    selectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 10,
    },
    selectorText: { flex: 1, fontSize: 15 },
    datePill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      marginRight: 8,
    },
    datePillText: { fontSize: 13, fontWeight: '600' },
    searchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 14,
      gap: 8,
      marginBottom: 16,
    },
    searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    billCard: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
      marginBottom: 14,
    },
    billHeader: {
      alignItems: 'center',
      padding: 16,
    },
    billTitle: { fontSize: 20, fontWeight: '800' },
    billSubtitle: { fontSize: 13, marginTop: 2 },
    billMeta: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    billMetaItem: { flex: 1, alignItems: 'center', padding: 10 },
    billMetaLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    billMetaValue: { fontSize: 13, fontWeight: '700', marginTop: 3 },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tableHeader: { paddingVertical: 10 },
    thCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    tdCell: { fontSize: 11 },
    totalRow: { borderTopWidth: 2 },
    totalCell: { fontSize: 12, fontWeight: '800' },
    col1: { width: 22 },
    col2: { width: 36, textAlign: 'center' },
    col3: { flex: 1.2 },
    col4: { flex: 1.4 },
    col5: { flex: 1.4 },
    col6: { flex: 1.4, textAlign: 'right' },
    noEntries: { textAlign: 'center', padding: 24, fontSize: 14 },
    grandTotalBanner: {
      padding: 16,
      alignItems: 'center',
    },
    grandTotalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    grandTotalAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    pdfBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 14,
      gap: 8,
    },
    pdfBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    printBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 1.5,
      gap: 8,
    },
    printBtnText: { fontWeight: '700', fontSize: 15 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
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
    doneBtn: { fontSize: 16, fontWeight: '700' },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalOptionText: { flex: 1, fontSize: 16 },
  });
}
