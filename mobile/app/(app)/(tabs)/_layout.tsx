import { Tabs } from 'expo-router';
import TabBar from '@/components/TabBar';
import { SearchProvider } from '@/lib/SearchContext';

export default function TabsLayout() {
  return (
    // SearchProvider spans the screens AND the tab bar: the island owns the
    // search input, the contracts screen consumes the query.
    <SearchProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="contracts" options={{ title: 'Contracts' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </SearchProvider>
  );
}
