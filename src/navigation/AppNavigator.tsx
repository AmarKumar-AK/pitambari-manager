import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';

import DashboardScreen from '../screens/DashboardScreen';
import ClothListScreen from '../screens/ClothListScreen';
import CustomersScreen from '../screens/CustomersScreen';
import MoreScreen from '../screens/MoreScreen';
import AddClothEntryScreen from '../screens/AddClothEntryScreen';
import CustomerLedgerScreen from '../screens/CustomerLedgerScreen';
import BillScreen from '../screens/BillScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Root = createStackNavigator<RootStackParamList>();

function BottomTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            HomeTab: ['home', 'home-outline'],
            RecordsTab: ['list', 'list-outline'],
            AddTab: ['add-circle', 'add-circle-outline'],
            CustomersTab: ['people', 'people-outline'],
            MoreTab: ['menu', 'menu-outline'],
          };
          const [activeIcon, inactiveIcon] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? activeIcon : inactiveIcon) as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="RecordsTab" component={ClothListScreen} options={{ title: 'Records' }} />

      <Tab.Screen
        name="AddTab"
        component={DummyScreen}
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.addIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddEntry', { mode: 'add' });
          },
        })}
      />

      <Tab.Screen name="CustomersTab" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Tab.Screen name="MoreTab" component={MoreScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

// Placeholder – never actually rendered
function DummyScreen() {
  return <View />;
}

export default function AppNavigator() {
  const { colors } = useTheme();

  const headerOptions = {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.white,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
  };

  return (
    <Root.Navigator>
      <Root.Screen name="Main" component={BottomTabs} options={{ headerShown: false }} />

      <Root.Screen
        name="AddEntry"
        component={AddClothEntryScreen}
        options={{
          title: 'Add Cloth Entry',
          presentation: 'modal',
          ...headerOptions,
        }}
      />

      <Root.Screen
        name="EditEntry"
        component={AddClothEntryScreen}
        options={{
          title: 'Edit Cloth Entry',
          presentation: 'modal',
          ...headerOptions,
        }}
      />

      <Root.Screen
        name="CustomerLedger"
        component={CustomerLedgerScreen}
        options={{ title: 'Customer Ledger', ...headerOptions }}
      />

      <Root.Screen
        name="Bill"
        component={BillScreen}
        options={{ title: 'Generate Bill', ...headerOptions }}
      />

      <Root.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Monthly Reports', ...headerOptions }}
      />

      <Root.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', ...headerOptions }}
      />
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
