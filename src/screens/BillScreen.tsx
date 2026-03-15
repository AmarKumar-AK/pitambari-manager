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
import { CUSTOMERS } from '../data/customers';

export default function BillScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();

  const prefilledCustomer: string = route.params?.customerName ?? '';
  const prefilledDate: string = route.params?.receivedDate ?? todayDB();

  const [customerName, setCustomerName] = useState(prefilledCustomer);
  const [startDate, setStartDate] = useState(prefilledDate);
  const [endDate, setEndDate] = useState(prefilledDate);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [billEntries, setBillEntries] = useState<ClothEntry[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
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
    if (!customerName || !startDate || !endDate) return;
    if (endDate < startDate) {
              Alert.alert('अमान्य तारीख', 'अंत तारीख शुरुआत तारीख से पहले नहीं हो सकती।');
      return;
    }
    const data = await queries.getEntriesByCustomerAndDateRange(customerName, startDate, endDate);
    data.sort((a, b) => a.clothNumber.localeCompare(b.clothNumber, undefined, { numeric: true }));
    const distinctDates = [...new Set(data.map(e => e.receivedDate))].sort();
    console.log('Bill entries loaded:', data.length, 'entries,', distinctDates.length, 'distinct dates:', distinctDates);
    setBillEntries(data);
    setSearched(true);
  };

  const grandTotal = billEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalLength = billEntries.reduce((s, e) => s + e.clothLength, 0);
  const totalColoring = billEntries.reduce((s, e) => s + e.coloringTotal, 0);

  // Always sort billEntries before generating bill
  const sortedBillEntries = [...billEntries].sort((a, b) => a.clothNumber.localeCompare(b.clothNumber, undefined, { numeric: true }));

  // Group entries by date for per-date sections
  const billByDate = (() => {
    const dateMap = new Map<string, ClothEntry[]>();
    for (const e of billEntries) {
      if (!dateMap.has(e.receivedDate)) dateMap.set(e.receivedDate, []);
      dateMap.get(e.receivedDate)!.push(e);
    }
    return [...dateMap.keys()].sort().map(date => ({
      date,
      entries: [...dateMap.get(date)!].sort((a, b) => a.clothNumber.localeCompare(b.clothNumber, undefined, { numeric: true })),
    }));
  })();

  const dateLabel = startDate === endDate
    ? formatDisplayDate(startDate)
    : `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  const billData: BillData = {
    customerName,
    receivedDate: startDate,
    dateLabel,
    entries: sortedBillEntries,
    grandTotal,
    totalLength,
    billDate: todayDB(),
  };

  const handleGeneratePDF = async () => {
    if (billEntries.length === 0) {
      Alert.alert('कोई एंट्री नहीं', 'चुने गए ग्राहक और तारीख के लिए कोई कपड़ा नहीं मिला।');
      return;
    }
    setGenerating(true);
    try {
      await generateAndSharePDF(billData);
    } catch (err: any) {
      Alert.alert('त्रुटि', err?.message ?? 'PDF बनाने में विफल।');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (billEntries.length === 0) {
      Alert.alert('कोई एंट्री नहीं', 'चुने गए ग्राहक और तारीख के लिए कोई कपड़ा नहीं मिला।');
      return;
    }
    try {
      await printBill(billData);
    } catch (err: any) {
      Alert.alert('त्रुटि', err?.message ?? 'प्रिंट विफल।');
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
            <Text style={[s.stepTitle, { color: colors.text }]}>ग्राहक चुने</Text>
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
              {customerName
                ? (() => {
                    const c = CUSTOMERS.find((x) => x.name === customerName);
                    return c ? `${c.shortForm}  —  ${c.name}` : customerName;
                  })()
                : 'ग्राहक चुनें'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Step 2: Select Date Range */}
        <View style={[s.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.stepHeader}>
            <View style={[s.stepBadge, { backgroundColor: colors.secondary }]}>
              <Text style={s.stepNum}>2</Text>
            </View>
            <Text style={[s.stepTitle, { color: colors.text }]}>दिनांक सीमा चुनें</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.selectorBtn, { flex: 1, borderColor: startDate ? colors.secondary : colors.border }]}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={startDate ? colors.secondary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }]}>शुरुआत</Text>
                <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text }]}>{formatDisplayDate(startDate)}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.selectorBtn, { flex: 1, borderColor: endDate ? colors.secondary : colors.border }]}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={endDate ? colors.secondary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }]}>अंत</Text>
                <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text }]}>{formatDisplayDate(endDate)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[s.searchBtn, { backgroundColor: colors.primary }]}
          onPress={fetchBill}
          disabled={!customerName || !startDate || !endDate}
        >
          <Ionicons name="search-outline" size={20} color="#fff" />
          <Text style={s.searchBtnText}>हिसाब निकालो</Text>
        </TouchableOpacity>

        {/* Bill Preview */}
        {searched && (
          <View style={[s.billCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.billHeader}>
              <Text style={[s.billTitle, { color: colors.primary }]}>🧵 गुड्डू पप्पु रंगाई</Text>
              <Text style={[s.billSubtitle, { color: colors.textSecondary }]}>पितांबरी रंगाई बिल</Text>
            </View>

            <View style={[s.billMeta, { borderColor: colors.border }]}>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>ग्राहक</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]}>{customerName}</Text>
              </View>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>तारीख सीमा</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]} numberOfLines={2}>{dateLabel}</Text>
              </View>
              <View style={s.billMetaItem}>
                <Text style={[s.billMetaLabel, { color: colors.textMuted }]}>एंट्री</Text>
                <Text style={[s.billMetaValue, { color: colors.text }]}>{billEntries.length}</Text>
              </View>
            </View>

            {billEntries.length === 0 ? (
              <Text style={[s.noEntries, { color: colors.textMuted }]}>
                इस ग्राहक के लिए चुनी गई तारीखों में कोई कपड़ा नहीं मिला।
              </Text>
            ) : (
              <>
                {billByDate.map(({ date, entries: dateEntries }, sectionIdx) => {
                  const dateLength = dateEntries.reduce((sum, e) => sum + e.clothLength, 0);
                  const dateColoring = dateEntries.reduce((sum, e) => sum + e.coloringTotal, 0);
                  return (
                    <View key={date} style={sectionIdx > 0 ? { marginTop: 12 } : {}}>
                      {/* Date section header */}
                      <View style={[s.dateSectionHeader, { backgroundColor: colors.secondary }]}>
                        <Ionicons name="calendar-outline" size={14} color="#fff" />
                        <Text style={[s.dateSectionTitle, { color: '#fff' }]}>{formatDisplayDate(date)}</Text>
                        <Text style={[s.dateSectionCount, { color: 'rgba(255,255,255,0.75)' }]}>{dateEntries.length} कपड़े</Text>
                      </View>
                      {/* Table Header */}
                      <View style={[s.tableRow, s.tableHeader, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[s.thCell, s.col1, { color: colors.primary }]}>#</Text>
                        <Text style={[s.thCell, s.col2, { color: colors.primary }]}>No.</Text>
                        <Text style={[s.thCell, s.col3, { color: colors.primary }]}>लंबाई</Text>
                        <Text style={[s.thCell, s.col4, { color: colors.primary }]}>रेट</Text>
                        <Text style={[s.thCell, s.col5, { color: colors.primary }]}>रंगाई</Text>
                        <Text style={[s.thCell, s.col6, { color: colors.primary }]}>कुल</Text>
                      </View>
                      {dateEntries.map((entry, idx) => (
                        <View
                          key={entry.id}
                          style={[s.tableRow, { backgroundColor: idx % 2 === 0 ? colors.surface : colors.background, borderBottomColor: colors.border }]}
                        >
                          <Text style={[s.tdCell, s.col1, { color: colors.textSecondary }]}>{idx + 1}</Text>
                          <Text style={[s.tdCell, s.col2, { color: colors.text, fontWeight: '700' }]}>{entry.clothNumber}</Text>
                          <Text style={[s.tdCell, s.col3, { color: colors.text }]}>{entry.clothLength.toFixed(2)}चौका</Text>
                          <Text style={[s.tdCell, s.col4, { color: colors.text }]}>{formatCurrency(entry.coloringCostPerUnit)}</Text>
                          <Text style={[s.tdCell, s.col5, { color: colors.text }]}>{formatCurrency(entry.coloringTotal)}</Text>
                          <Text style={[s.tdCell, s.col6, { color: colors.success, fontWeight: '700' }]}>{formatCurrency(entry.coloringTotal)}</Text>
                        </View>
                      ))}
                      {/* Date Subtotal */}
                      <View style={[s.tableRow, s.totalRow, { backgroundColor: colors.secondary + '10', borderTopColor: colors.secondary }]}>
                        <Text style={[s.totalCell, { color: colors.text, flex: 3 }]}>उपकुल</Text>
                        <Text style={[s.totalCell, s.col3, { color: colors.text }]}>{dateLength.toFixed(2)}चौका</Text>
                        <Text style={[s.totalCell, s.col4, { color: colors.text }]}></Text>
                        <Text style={[s.totalCell, s.col5, { color: colors.text }]}>{formatCurrency(dateColoring)}</Text>
                        <Text style={[s.totalCell, s.col6, { color: colors.secondary, fontSize: 13 }]}>{formatCurrency(dateColoring)}</Text>
                      </View>
                    </View>
                  );
                })}
                {/* Grand Total Banner */}
                <View style={[s.grandTotalBanner, { backgroundColor: colors.primary }]}>
                  <Text style={s.grandTotalLabel}>कुल देय राशि</Text>
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
                  <Text style={s.pdfBtnText}>PDF शेयर करें</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[s.printBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePrint}
              >
                <Ionicons name="print-outline" size={20} color={colors.text} />
                <Text style={[s.printBtnText, { color: colors.text }]}>प्रिंट</Text>
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
              <Text style={[s.modalTitle, { color: colors.text }]}>ग्राहक चुनें</Text>
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
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalOptionText, { color: colors.text }]}>
                      {CUSTOMERS.find((c) => c.name === item)?.shortForm ?? item}
                    </Text>
                    <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 1 }]}>{item}</Text>
                  </View>
                  {customerName === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[s.noEntries, { color: colors.textMuted }]}>कोई ग्राहक नहीं मिला।</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Start Date Picker */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal transparent animationType="slide" visible={showStartPicker} onRequestClose={() => setShowStartPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.text }]}>शुरुआत तारीख</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={[s.doneBtn, { color: colors.primary }]}>हो गया</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseISO(startDate)}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) { setStartDate(toDBDate(date)); setSearched(false); setBillEntries([]); }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={parseISO(startDate)}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) { setStartDate(toDBDate(date)); setSearched(false); setBillEntries([]); }
          }}
        />
      )}

      {/* End Date Picker */}
      {Platform.OS === 'ios' && showEndPicker && (
        <Modal transparent animationType="slide" visible={showEndPicker} onRequestClose={() => setShowEndPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.text }]}>अंत तारीख</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={[s.doneBtn, { color: colors.primary }]}>हो गया</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseISO(endDate)}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) { setEndDate(toDBDate(date)); setSearched(false); setBillEntries([]); }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={parseISO(endDate)}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) { setEndDate(toDBDate(date)); setSearched(false); setBillEntries([]); }
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
    dateSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dateSectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
    dateSectionCount: { fontSize: 11, fontWeight: '600' },
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
