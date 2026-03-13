import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import { exportBackup } from '../utils/backup';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const queries = useClothQueries();
  const [exporting, setExporting] = useState(false);

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const allData = await queries.getAllData();
      await exportBackup(allData);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message ?? 'An error occurred during export.');
    } finally {
      setExporting(false);
    }
  };

  const s = createStyles(colors);

  const Row = ({
    icon,
    iconColor,
    label,
    sublabel,
    onPress,
    right,
  }: {
    icon: string;
    iconColor: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[s.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[s.rowIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={s.rowContent}>
        <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
        {sublabel ? <Text style={[s.rowSublabel, { color: colors.textMuted }]}>{sublabel}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="moon-outline"
            iconColor={colors.secondary}
            label="Dark Mode"
            sublabel={isDark ? 'Enabled' : 'Disabled'}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={isDark ? colors.primary : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* Data */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>DATA MANAGEMENT</Text>
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="cloud-upload-outline"
            iconColor={colors.success}
            label="Export Backup"
            sublabel="Save all entries as a JSON file"
            onPress={handleExportBackup}
            right={
              exporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )
            }
          />
        </View>

        {/* About */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ABOUT</Text>
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="information-circle-outline"
            iconColor={colors.info}
            label="Kapda Manager"
            sublabel="Version 1.0.0"
            right={<View />}
          />
          <Row
            icon="heart-outline"
            iconColor={colors.error}
            label="Made with ❤️ for cloth workers"
            right={<View />}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 12 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
      marginTop: 16,
    },
    section: {
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '600' },
    rowSublabel: { fontSize: 12, marginTop: 1 },
  });
}
