import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ClothBatch } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { CUSTOMERS } from '../data/customers';

interface ClothCardProps {
  batch: ClothBatch;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export default function ClothCard({
  batch,
  onPress,
  onEdit,
  onDelete,
  showActions = false,
}: ClothCardProps) {
  const { colors } = useTheme();

  const customer = CUSTOMERS.find((c) => c.name === batch.customerName);
  const shortForm = customer?.shortForm ?? batch.customerName;

  const totalLength = batch.entries.reduce((s, e) => s + e.clothLength, 0);
  const totalColoring = batch.entries.reduce((s, e) => s + e.coloringTotal, 0);

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      `Delete this batch for ${shortForm}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row: customer shortform + date + actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.shortForm, { color: colors.primary }]}>{shortForm}</Text>
          <Text style={[styles.fullName, { color: colors.textMuted }]}>{batch.customerName}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatDisplayDate(batch.receivedDate)}
          </Text>
          {showActions && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
                <Ionicons name="pencil-outline" size={16} color={colors.info} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Cloth items list */}
      <View style={[styles.itemsContainer, { borderTopColor: colors.border }]}>
        {batch.entries.map((entry) => (
          <View key={entry.id} style={styles.itemRow}>
            <View style={[styles.clothBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.clothNumber, { color: colors.primary }]}>#{entry.clothNumber}</Text>
            </View>
            <Text style={[styles.itemLength, { color: colors.text }]}>
              {entry.clothLength.toFixed(2)} चौका
            </Text>
          </View>
        ))}
      </View>

      {/* Footer: totals */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>कुल लंबाई</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>{totalLength.toFixed(2)} चौका</Text>
        </View>
        {totalColoring > 0 && (
          <>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.footerStat}>
              <Text style={[styles.footerLabel, { color: colors.textMuted }]}>रंगाई</Text>
              <Text style={[styles.footerValue, { color: colors.success }]}>₹{totalColoring.toFixed(2)}</Text>
            </View>
          </>
        )}
        {batch.notes ? (
          <>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={[styles.footerStat, { flex: 2 }]}>
              <Text style={[styles.footerLabel, { color: colors.textMuted }]}>टिप्पणी</Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={1}>{batch.notes}</Text>
            </View>
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexShrink: 1,
  },
  shortForm: {
    fontSize: 18,
    fontWeight: '800',
  },
  fullName: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  date: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
  },
  itemsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clothBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  clothNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemLength: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
