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
import { ClothEntry } from '../types';
import { formatCurrency } from '../utils/calculations';
import { formatDisplayDate } from '../utils/dateUtils';

interface ClothCardProps {
  entry: ClothEntry;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export default function ClothCard({
  entry,
  onPress,
  onEdit,
  onDelete,
  showActions = false,
}: ClothCardProps) {
  const { colors } = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      `Delete cloth entry for ${entry.customerName}?`,
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
      {/* Header Row */}
      <View style={styles.header}>
        <View style={[styles.clothBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.clothNumber, { color: colors.primary }]}>
            #{entry.clothNumber}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatDisplayDate(entry.receivedDate)}
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

      {/* Customer Row */}
      <View style={styles.row}>
        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.customerName, { color: colors.text }]}>{entry.customerName}</Text>
        {entry.sentBy ? (
          <Text style={[styles.sentBy, { color: colors.textSecondary }]}>
            {'  ·  via '}{entry.sentBy}
          </Text>
        ) : null}
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Length</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {entry.clothLength.toFixed(2)} m
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cloth</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(entry.clothTotal)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Coloring</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(entry.coloringTotal)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.success }]}>
            {formatCurrency(entry.totalCost)}
          </Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clothBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clothNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  sentBy: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '800',
  },
});
