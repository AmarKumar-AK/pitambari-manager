import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import { parseDecimal } from '../utils/calculations';
import { formatDisplayDate, toDBDate, todayDB } from '../utils/dateUtils';
import { CLOTH_NUMBERS } from '../constants';
import { CUSTOMERS } from '../data/customers';
import { parseISO } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClothRow {
  id: string;
  clothNumber: string;
  clothLength: string;
}

interface FormState {
  customerName: string;
  receivedDate: string;
  notes: string;
  billNumber: string;
}

let rowCounter = 0;
function newRow(): ClothRow {
  return { id: String(++rowCounter), clothNumber: '0', clothLength: '' };
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AddClothEntryScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();
  const isEdit = route.name === 'EditEntry';
  const batchId: string | undefined = route.params?.batchId;
  // Legacy support: entryId param still works for old-style single entries
  const entryId: number | undefined = route.params?.entryId;

  const [form, setForm] = useState<FormState>({
    customerName: '',
    receivedDate: todayDB(),
    notes: '',
    billNumber: '',
  });

  const [clothRows, setClothRows] = useState<ClothRow[]>([newRow()]);
  const [loading, setLoading] = useState(isEdit && !!(batchId || entryId));
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;

    const loadData = async () => {
      // Read params at effect-time (defensive against stale closure)
      const bid: string | undefined = route.params?.batchId;
      const eid: number | undefined = route.params?.entryId;

      try {
        if (bid) {
          const batchEntries = await queries.getBatchEntries(bid);
          if (batchEntries.length > 0) {
            const first = batchEntries[0];
            setForm({
              customerName: first.customerName,
              receivedDate: first.receivedDate,
              notes: first.notes,
              billNumber: first.billNumber ?? '',
            });
            setClothRows(
              batchEntries.map((e) => ({
                id: String(++rowCounter),
                clothNumber: e.clothNumber,
                clothLength: e.clothLength.toString(),
              }))
            );
          }
        } else if (eid) {
          const entry = await queries.getEntryById(eid);
          if (entry) {
            setForm({
              customerName: entry.customerName,
              receivedDate: entry.receivedDate,
              notes: entry.notes,
              billNumber: entry.billNumber ?? '',
            });
            setClothRows([
              { id: String(++rowCounter), clothNumber: entry.clothNumber, clothLength: entry.clothLength.toString() },
            ]);
          }
        }
      } catch (err) {
        console.error('EditEntry load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const updateField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateRow = (id: string, field: keyof Omit<ClothRow, 'id'>, value: string) =>
    setClothRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const addRow = () => setClothRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) => {
    if (clothRows.length === 1) return;
    setClothRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) updateField('receivedDate', toDBDate(selectedDate));
  };

  const totalLength = clothRows.reduce((s, r) => s + parseDecimal(r.clothLength), 0);
  const hasAnyLength = clothRows.some((r) => parseDecimal(r.clothLength) > 0);

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      Alert.alert('जरूरी है', 'कृपया ग्राहक का नाम दर्ज करें।');
      return;
    }
    const validRows = clothRows.filter((r) => parseDecimal(r.clothLength) > 0);
    if (validRows.length === 0) {
      Alert.alert('जरूरी है', 'कम से कम एक कपड़े की लंबाई दर्ज करें।');
      return;
    }

    // Find selected customer object
    const customer = CUSTOMERS.find((c) => c.name === form.customerName.trim());
    setSaving(true);
    try {
      if (isEdit && (batchId || entryId)) {
        // Delete existing batch entries and re-insert with updated data
        const existingBatchId = batchId || `_entry_${entryId}`;
        await queries.deleteClothBatch(existingBatchId);
        const newBatchId = `batch_${Date.now()}`;
        for (const row of validRows) {
          const len = parseDecimal(row.clothLength);
          // Get coloring cost from customer rates
          let coloringCostPerUnit = 0;
          if (customer && customer.rates[row.clothNumber]) {
            coloringCostPerUnit = customer.rates[row.clothNumber].coloringCostPerUnit;
          }
          // Calculate totals
          const { clothTotal, coloringTotal, totalCost } = require('../utils/calculations').calculateTotals(len, 0, coloringCostPerUnit);
          await queries.addClothEntry({
            clothNumber: row.clothNumber,
            customerName: form.customerName.trim(),
            sentBy: '',
            receivedDate: form.receivedDate,
            clothLength: len,
            clothCostPerUnit: 0,
            coloringCostPerUnit,
            clothTotal,
            coloringTotal,
            totalCost,
            notes: form.notes.trim(),
            batchId: newBatchId,
            billNumber: form.billNumber.trim(),
          });
        }
      } else {
        const newBatchId = `batch_${Date.now()}`;
        for (const row of validRows) {
          const len = parseDecimal(row.clothLength);
          // Get coloring cost from customer rates
          let coloringCostPerUnit = 0;
          if (customer && customer.rates[row.clothNumber]) {
            coloringCostPerUnit = customer.rates[row.clothNumber].coloringCostPerUnit;
          }
          // Calculate totals
          const { clothTotal, coloringTotal, totalCost } = require('../utils/calculations').calculateTotals(len, 0, coloringCostPerUnit);
          await queries.addClothEntry({
            clothNumber: row.clothNumber,
            customerName: form.customerName.trim(),
            sentBy: '',
            receivedDate: form.receivedDate,
            clothLength: len,
            clothCostPerUnit: 0,
            coloringCostPerUnit,
            clothTotal,
            coloringTotal,
            totalCost,
            notes: form.notes.trim(),
            batchId: newBatchId,
            billNumber: form.billNumber.trim(),
          });
        }
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('त्रुटि', 'एंट्री सेव नहीं हो सकी। दोबारा कोशिश करें।');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const s = createStyles(colors);

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Customer ── */}
        <Text style={[s.label, { color: colors.text }]}>ग्राहक *</Text>
        <TouchableOpacity
          style={[s.clothNumBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowCustomerPicker(true)}
        >
          {form.customerName ? (
            <View style={s.customerSelected}>
              <Text style={[s.customerSelectedName, { color: colors.text }]}>
                {CUSTOMERS.find((c) => c.name === form.customerName)?.shortForm}
              </Text>
              <Text style={[s.customerSelectedShort, { color: colors.textMuted }]}>{form.customerName}</Text>
            </View>
          ) : (
            <Text style={[s.clothNumBtnText, { color: colors.textMuted }]}>ग्राहक चुनें...</Text>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Received Date ── */}
        <Text style={[s.label, { color: colors.text }]}>प्राप्त तिथि *</Text>
        <TouchableOpacity
          style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[s.dateText, { color: colors.text }]}>{formatDisplayDate(form.receivedDate)}</Text>
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* iOS Date Picker */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal transparent animationType="slide" visible={showDatePicker}>
            <View style={s.modalOverlay}>
              <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.text }]}>तारीख चुनें</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[s.doneBtn, { color: colors.primary }]}>हो गया</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseISO(form.receivedDate)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  textColor={colors.text}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={parseISO(form.receivedDate)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}


        {/* ── Cloth Rows ── */}
        <View style={s.rowsHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            कपड़े{!isEdit ? ` (${clothRows.length})` : ''}
          </Text>
          {!isEdit && (
            <TouchableOpacity
              style={[s.addRowBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
              onPress={addRow}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[s.addRowBtnText, { color: colors.primary }]}>पंक्ति जोड़ें</Text>
            </TouchableOpacity>
          )}
        </View>

        {clothRows.map((row, index) => {
          return (
            <View
              key={row.id}
              style={[s.clothRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={s.clothRowHeader}>
                <View style={[s.rowIndexBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.rowIndexText}>{index + 1}</Text>
                </View>
                <Text style={[s.rowLabel, { color: colors.text }]}>कपड़ा {index + 1}</Text>
                {!isEdit && clothRows.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeRow(row.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>कपड़ा नम्बर</Text>
              <TouchableOpacity
                style={[s.clothNumBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setPickerRowId(row.id)}
              >
                <Text style={[s.clothNumBtnText, { color: colors.text }]}>{row.clothNumber}</Text>
                <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>लंबाई (चौका)</Text>
              <View style={[s.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="resize-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[s.textInput, { color: colors.text }]}
                  value={row.clothLength}
                  onChangeText={(v) => updateRow(row.id, 'clothLength', v)}
                  placeholder="जैसे 12.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={[s.unit, { color: colors.textMuted }]}>चौका</Text>
              </View>


            </View>
          );
        })}

        {/* Add row button (bottom) */}
        {!isEdit && (
          <TouchableOpacity
            style={[s.addRowBig, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={addRow}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[s.addRowBigText, { color: colors.primary }]}>और कपड़ा जोड़ें</Text>
          </TouchableOpacity>
        )}

        {/* ── Length Summary (multi-row) ── */}
        {hasAnyLength && clothRows.length > 1 && (
          <View style={[s.summaryCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>कुल लंबाई</Text>
              <Text style={[s.summaryValue, { color: colors.primary }]}>{totalLength.toFixed(2)} चौका</Text>
            </View>
            {clothRows.filter((r) => parseDecimal(r.clothLength) > 0).length > 1 && (
              <Text style={[s.summaryNote, { color: colors.textMuted }]}>
                {clothRows.filter((r) => parseDecimal(r.clothLength) > 0).length} कपड़े एक साथ सेव होंगे
              </Text>
            )}
          </View>
        )}

        {/* ── Bill Number ── */}
        <Text style={[s.label, { color: colors.text }]}>बिल नंबर (वैकल्पिक)</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="receipt-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            value={form.billNumber}
            onChangeText={(v) => updateField('billNumber', v)}
            placeholder="जैसे 101"
            placeholderTextColor={colors.textMuted}
            keyboardType="default"
          />
        </View>

        {/* ── Notes ── */}
        <Text style={[s.label, { color: colors.text }]}>नोट (वैकल्पिक)</Text>
        <View style={[s.notesRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[s.notesInput, { color: colors.text }]}
            value={form.notes}
            onChangeText={(v) => updateField('notes', v)}
            placeholder="कोई अतिरिक्त जानकारी..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[s.saveButton, { backgroundColor: saving ? colors.textMuted : colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={s.saveButtonText}>
                {isEdit
                  ? 'अपडेट करें'
                  : `सेव करें ${
                      clothRows.filter((r) => parseDecimal(r.clothLength) > 0).length > 1
                        ? `(${clothRows.filter((r) => parseDecimal(r.clothLength) > 0).length} कपड़े)`
                        : ''
                    }`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Customer Picker Modal ── */}
      <Modal
        visible={showCustomerPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>ग्राहक चुनें</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {CUSTOMERS.map((customer) => {
              const selected = form.customerName === customer.name;
              return (
                <TouchableOpacity
                  key={customer.name}
                  style={[
                    s.pickerOption,
                    { borderBottomColor: colors.border },
                    selected && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    updateField('customerName', customer.name);
                    setShowCustomerPicker(false);
                  }}
                >
                  <View>
                    <Text style={[s.pickerOptionText, { color: colors.text }]}>{customer.shortForm}</Text>
                    <Text style={[s.pickerOptionSub, { color: colors.textMuted }]}>{customer.name}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ── Cloth Number Picker Modal ── */}
      <Modal
        visible={pickerRowId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerRowId(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>कपड़ा नंबर चुनें</Text>
              <TouchableOpacity onPress={() => setPickerRowId(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {CLOTH_NUMBERS.map((num) => {
              const selected = pickerRowId
                ? clothRows.find((r) => r.id === pickerRowId)?.clothNumber === num
                : false;
              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    s.pickerOption,
                    { borderBottomColor: colors.border },
                    selected && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    if (pickerRowId) updateRow(pickerRowId, 'clothNumber', num);
                    setPickerRowId(null);
                  }}
                >
                  <Text style={[s.pickerOptionText, { color: colors.text }]}>
                    {num}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: any) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 16 },
    label: { fontSize: 17, fontWeight: '700', marginBottom: 8, marginTop: 16 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 8,
    },
    textInput: { flex: 1, fontSize: 17, padding: 0 },
    unit: { fontSize: 16, fontWeight: '600' },
    dateText: { flex: 1, fontSize: 17 },
    // Cloth rows section
    rowsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 19, fontWeight: '800' },
    addRowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    addRowBtnText: { fontSize: 15, fontWeight: '700' },
    clothRow: {
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: 10,
    },
    clothRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    rowIndexBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIndexText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    rowLabel: { flex: 1, fontSize: 17, fontWeight: '700' },
    fieldLabel: { fontSize: 15, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    clothNumBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    clothNumBtnText: { fontSize: 17, fontWeight: '700' },
    addRowBig: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      paddingVertical: 16,
      gap: 8,
      marginBottom: 4,
    },
    addRowBigText: { fontSize: 17, fontWeight: '600' },
    // Summary
    summaryCard: {
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginTop: 16,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 16 },
    summaryValue: { fontSize: 16, fontWeight: '600' },
    summaryNote: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    // Notes
    notesRow: {
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 80,
    },
    notesInput: { fontSize: 17, padding: 0, minHeight: 60 },
    // Save button
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 24,
      gap: 8,
    },
    saveButtonText: { color: '#fff', fontSize: 19, fontWeight: '700' },
    // Customer selector
    customerSelected: { flex: 1 },
    customerSelectedName: { fontSize: 18, fontWeight: '700' },
    customerSelectedShort: { fontSize: 14, marginTop: 2 },
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
    modalTitle: { fontSize: 19, fontWeight: '700' },
    doneBtn: { fontSize: 18, fontWeight: '700' },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerOptionText: { fontSize: 18 },
    pickerOptionSub: { fontSize: 14, marginTop: 2 },
  });
}
