import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import { calculateTotals, formatCurrency, parseDecimal } from '../utils/calculations';
import { formatDisplayDate, toDBDate, todayDB } from '../utils/dateUtils';
import { CLOTH_NUMBERS } from '../constants';
import { parseISO } from 'date-fns';

interface FormState {
  clothNumber: string;
  customerName: string;
  sentBy: string;
  receivedDate: string;
  clothLength: string;
  clothCostPerUnit: string;
  coloringCostPerUnit: string;
  notes: string;
}

export default function AddClothEntryScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();
  const isEdit = route.name === 'EditEntry';
  const entryId: number | undefined = route.params?.entryId;

  const [form, setForm] = useState<FormState>({
    clothNumber: '0',
    customerName: '',
    sentBy: '',
    receivedDate: todayDB(),
    clothLength: '',
    clothCostPerUnit: '',
    coloringCostPerUnit: '',
    notes: '',
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showClothPicker, setShowClothPicker] = useState(false);

  // Derived calculations
  const clothLength = parseDecimal(form.clothLength);
  const clothCostPerUnit = parseDecimal(form.clothCostPerUnit);
  const coloringCostPerUnit = parseDecimal(form.coloringCostPerUnit);
  const { clothTotal, coloringTotal, totalCost } = calculateTotals(
    clothLength,
    clothCostPerUnit,
    coloringCostPerUnit
  );

  // Load existing entry if editing
  useEffect(() => {
    if (isEdit && entryId) {
      queries
        .getEntryById(entryId)
        .then((entry) => {
          if (entry) {
            setForm({
              clothNumber: entry.clothNumber,
              customerName: entry.customerName,
              sentBy: entry.sentBy,
              receivedDate: entry.receivedDate,
              clothLength: entry.clothLength.toString(),
              clothCostPerUnit: entry.clothCostPerUnit.toString(),
              coloringCostPerUnit: entry.coloringCostPerUnit.toString(),
              notes: entry.notes,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = async (text: string) => {
    updateField('customerName', text);
    if (text.length >= 1) {
      const results = await queries.searchCustomerNames(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const selectSuggestion = (name: string) => {
    updateField('customerName', name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      updateField('receivedDate', toDBDate(selectedDate));
    }
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) {
      Alert.alert('Required', 'Please enter the customer name.');
      return;
    }
    if (!form.clothLength.trim() || clothLength <= 0) {
      Alert.alert('Required', 'Please enter a valid cloth length.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && entryId) {
        // Load original to get createdAt
        const original = await queries.getEntryById(entryId);
        await queries.updateClothEntry({
          id: entryId,
          clothNumber: form.clothNumber,
          customerName: form.customerName.trim(),
          sentBy: form.sentBy.trim(),
          receivedDate: form.receivedDate,
          clothLength,
          clothCostPerUnit,
          coloringCostPerUnit,
          clothTotal,
          coloringTotal,
          totalCost,
          notes: form.notes.trim(),
          createdAt: original?.createdAt ?? '',
          updatedAt: '',
        });
      } else {
        await queries.addClothEntry({
          clothNumber: form.clothNumber,
          customerName: form.customerName.trim(),
          sentBy: form.sentBy.trim(),
          receivedDate: form.receivedDate,
          clothLength,
          clothCostPerUnit,
          coloringCostPerUnit,
          clothTotal,
          coloringTotal,
          totalCost,
          notes: form.notes.trim(),
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
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
        {/* ── Cloth Number ── */}
        <Text style={[s.label, { color: colors.text }]}>Cloth Number *</Text>
        <TouchableOpacity
          style={[s.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowClothPicker(true)}
        >
          <Text style={[s.pickerButtonText, { color: colors.text }]}>{form.clothNumber}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Cloth Number Modal Picker ── */}
        <Modal
          visible={showClothPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowClothPicker(false)}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.text }]}>Select Cloth Number</Text>
                <TouchableOpacity onPress={() => setShowClothPicker(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {CLOTH_NUMBERS.map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    s.pickerOption,
                    { borderBottomColor: colors.border },
                    form.clothNumber === num && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    updateField('clothNumber', num);
                    setShowClothPicker(false);
                  }}
                >
                  <Text style={[s.pickerOptionText, { color: colors.text }]}>
                    {num}
                  </Text>
                  {form.clothNumber === num && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ── Customer Name ── */}
        <Text style={[s.label, { color: colors.text }]}>Customer Name *</Text>
        <View>
          <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              value={form.customerName}
              onChangeText={handleCustomerChange}
              placeholder="Enter customer name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>
          {showSuggestions && (
            <View style={[s.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {suggestions.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[s.suggestionItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectSuggestion(name)}
                >
                  <Ionicons name="person-outline" size={15} color={colors.textMuted} />
                  <Text style={[s.suggestionText, { color: colors.text }]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Sent By ── */}
        <Text style={[s.label, { color: colors.text }]}>Sent By</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="bicycle-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            value={form.sentBy}
            onChangeText={(v) => updateField('sentBy', v)}
            placeholder="Delivery person name (optional)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
        </View>

        {/* ── Received Date ── */}
        <Text style={[s.label, { color: colors.text }]}>Received Date *</Text>
        <TouchableOpacity
          style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[s.dateText, { color: colors.text }]}>
            {formatDisplayDate(form.receivedDate)}
          </Text>
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* iOS Date Picker Modal */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal transparent animationType="slide" visible={showDatePicker}>
            <View style={s.modalOverlay}>
              <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
                <View style={s.modalHeader}>
                  <Text style={[s.modalTitle, { color: colors.text }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[s.doneBtn, { color: colors.primary }]}>Done</Text>
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

        {/* Android Date Picker (inline) */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={parseISO(form.receivedDate)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* ── Numbers Section ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Measurements & Rates</Text>

          <Text style={[s.label, { color: colors.text }]}>Cloth Length (meters) *</Text>
          <View style={[s.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="resize-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              value={form.clothLength}
              onChangeText={(v) => updateField('clothLength', v)}
              placeholder="e.g. 12.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={[s.unit, { color: colors.textMuted }]}>m</Text>
          </View>

          <Text style={[s.label, { color: colors.text }]}>Cloth Cost per Meter (₹)</Text>
          <View style={[s.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.rupeeIcon, { color: colors.textMuted }]}>₹</Text>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              value={form.clothCostPerUnit}
              onChangeText={(v) => updateField('clothCostPerUnit', v)}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={[s.label, { color: colors.text }]}>Coloring Cost per Meter (₹)</Text>
          <View style={[s.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.rupeeIcon, { color: colors.textMuted }]}>₹</Text>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              value={form.coloringCostPerUnit}
              onChangeText={(v) => updateField('coloringCostPerUnit', v)}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* ── Auto-Calculated Summary ── */}
        {clothLength > 0 && (
          <View style={[s.summaryCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={[s.summaryTitle, { color: colors.primary }]}>Calculated Summary</Text>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Cloth Amount</Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>{formatCurrency(clothTotal)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Coloring Amount</Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>{formatCurrency(coloringTotal)}</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: colors.primary + '30' }]} />
            <View style={s.summaryRow}>
              <Text style={[s.summaryTotalLabel, { color: colors.primary }]}>Grand Total</Text>
              <Text style={[s.summaryTotal, { color: colors.primary }]}>{formatCurrency(totalCost)}</Text>
            </View>
          </View>
        )}

        {/* ── Notes ── */}
        <Text style={[s.label, { color: colors.text }]}>Notes (optional)</Text>
        <View style={[s.notesRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[s.notesInput, { color: colors.text }]}
            value={form.notes}
            onChangeText={(v) => updateField('notes', v)}
            placeholder="Any additional notes..."
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
              <Text style={s.saveButtonText}>{isEdit ? 'Update Entry' : 'Save Entry'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 16 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    textInput: { flex: 1, fontSize: 15, padding: 0 },
    unit: { fontSize: 14, fontWeight: '600' },
    rupeeIcon: { fontSize: 16, fontWeight: '700' },
    dateText: { flex: 1, fontSize: 15 },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    pickerButtonText: { fontSize: 15, fontWeight: '600' },
    card: {
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 14,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    summaryCard: {
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginTop: 16,
    },
    summaryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '600' },
    summaryDivider: { height: 1, marginVertical: 8 },
    summaryTotalLabel: { fontSize: 16, fontWeight: '800' },
    summaryTotal: { fontSize: 18, fontWeight: '800' },
    notesRow: {
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 80,
    },
    notesInput: { fontSize: 15, padding: 0, minHeight: 60 },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 24,
      gap: 8,
    },
    saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
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
    doneBtn: { fontSize: 16, fontWeight: '700' },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerOptionText: { fontSize: 16 },
    // Suggestions
    suggestionsBox: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      maxHeight: 180,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    suggestionText: { fontSize: 15 },
  });
}
