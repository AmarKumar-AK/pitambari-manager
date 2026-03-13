import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useClothQueries } from '../database/queries';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { Customer } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function CustomersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const queries = useClothQueries();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  const loadCustomers = async () => {
    try {
      const data = await queries.getAllCustomers();
      setCustomers(data);
      setFiltered(data);
    } catch (err) {
      console.error('CustomersScreen error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(customers);
    } else {
      const q = text.toLowerCase();
      setFiltered(customers.filter((c) => c.name.toLowerCase().includes(q)));
    }
  };

  const s = createStyles(colors);

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('CustomerLedger', { customerName: item.name })}
      activeOpacity={0.7}
    >
      <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[s.avatarText, { color: colors.primary }]}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={s.info}>
        <Text style={[s.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[s.meta, { color: colors.textMuted }]}>
          {item.totalEntries} entr{item.totalEntries === 1 ? 'y' : 'ies'}
          {'  ·  '}
          {item.totalLength.toFixed(1)} m
        </Text>
      </View>
      <View style={s.right}>
        <Text style={[s.amount, { color: colors.success }]}>{formatCurrency(item.totalAmount)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Customers</Text>
        <Text style={[s.count, { color: colors.textMuted }]}>
          {customers.length} total
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <SearchBar
          value={search}
          onChangeText={handleSearch}
          placeholder="Search customers..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        contentContainerStyle={s.listContent}
        renderItem={renderCustomer}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No customers yet"
            subtitle="Customers appear automatically when you add cloth entries"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '800' },
    count: { fontSize: 14 },
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 20, fontWeight: '800' },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
    meta: { fontSize: 13 },
    right: { alignItems: 'flex-end' },
    amount: { fontSize: 15, fontWeight: '800' },
  });
}
