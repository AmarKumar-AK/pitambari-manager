import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface MenuItemProps {
  icon: string;
  label: string;
  sublabel: string;
  color: string;
  onPress: () => void;
}

function MenuItem({ icon, label, sublabel, color, onPress }: MenuItemProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={26} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>

        <MenuItem
          icon="receipt-outline"
          label="बिल बनाएं"
          sublabel="Create and export a customer bill as PDF"
          color={colors.secondary}
          onPress={() => navigation.navigate('Bill')}
        />

        <MenuItem
          icon="bar-chart-outline"
          label="Monthly Reports"
          sublabel="View revenue and entries by month"
          color={colors.info}
          onPress={() => navigation.navigate('Reports')}
        />

        <MenuItem
          icon="settings-outline"
          label="Settings"
          sublabel="Dark mode, backup & app information"
          color={colors.warning}
          onPress={() => navigation.navigate('Settings')}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 14,
  },
  menuIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  menuSublabel: { fontSize: 13, lineHeight: 18 },
});
