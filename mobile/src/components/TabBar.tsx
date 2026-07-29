import { useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/colors';
import { useSearch } from '@/lib/SearchContext';
import {
  ISLAND_HEIGHT,
  ISLAND_H_MARGIN,
  ISLAND_RADIUS,
  FAB_SIZE,
  FAB_RISE,
  islandBottomOffset,
  contentClearance,
} from '@/lib/islandMetrics';
import ContryFace from '@/components/ContryFace';

// Minimal shape of React Navigation's BottomTabBarProps — the package isn't a
// direct dependency (expo-router bundles it), so we type what we use.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

// Icon pair (inactive/active) per tab route name.
const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  dashboard: ['grid-outline', 'grid'],
  contracts: ['document-text-outline', 'document-text'],
  calendar: ['calendar-outline', 'calendar'],
  settings: ['settings-outline', 'settings'],
};

// Lift that puts the FAB's top FAB_RISE above the pill when the row centers it.
const FAB_LIFT = FAB_RISE + (ISLAND_HEIGHT - FAB_SIZE) / 2;

// Bottom padding a scrollable tab screen needs to clear the floating island.
// The bar is absolutely positioned, so EVERY screen under the tabs layout
// must pad its scroll content by this or its last rows hide under the pill.
export function useTabBarClearance(): number {
  return contentClearance(useSafeAreaInsets().bottom);
}

// Floating island tab bar: a detached pill holding four tabs, the raised add
// FAB, and Contry's search field. Tapping search cross-fades the pill into a
// search field (state in SearchContext; the contracts screen consumes the query).
export default function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { query, setQuery, isOpen, close } = useSearch();
  const inputRef = useRef<TextInput>(null);
  const expansion = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();
  const bottomOffset = islandBottomOffset(insets.bottom);

  useEffect(() => {
    expansion.value = withTiming(isOpen ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
    if (isOpen) {
      // The row is always mounted, so focus is reliable one frame later.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, expansion]);

  // Ride up flush above the keyboard (and track interactive dismiss).
  const keyboardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - bottomOffset) }],
  }));

  const tabsRowStyle = useAnimatedStyle(() => ({
    opacity: 1 - expansion.value,
    transform: [{ translateY: 6 * expansion.value }],
  }));

  const searchRowStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    transform: [{ translateY: 6 * (1 - expansion.value) }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -FAB_LIFT }, { scale: 1 - expansion.value }],
  }));

  const renderTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return null;
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const focused = state.index === routeIndex;
    const [outline, filled] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
    const color = focused ? theme.brandText : theme.mutedForeground;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 }}
      >
        <Ionicons name={focused ? filled : outline} size={24} color={color} />
        <Text numberOfLines={1} style={{ color, fontSize: 11, fontWeight: focused ? '600' : '500' }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Animated.View
        style={[{ marginHorizontal: ISLAND_H_MARGIN, marginBottom: bottomOffset }, keyboardStyle]}
      >
        {/* No overflow:'hidden' here — it would clip the raised FAB and the
            Android elevation shadow. */}
        <View
          style={{
            height: ISLAND_HEIGHT,
            borderRadius: ISLAND_RADIUS,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <Animated.View
            pointerEvents={isOpen ? 'none' : 'auto'}
            style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, tabsRowStyle]}
          >
            <View style={{ flex: 1, flexDirection: 'row', height: '100%' }}>
              {renderTab(0)}
              {renderTab(1)}
            </View>
            {/* Fixed spacer keeps the flanking tabs clear of the FAB, which is
                absolutely centered below so it sits at the pill's true middle. */}
            <View style={{ width: FAB_SIZE + 4 }} />
            <View style={{ flex: 1, flexDirection: 'row', height: '100%' }}>
              {renderTab(2)}
              {renderTab(3)}
            </View>
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View style={fabStyle}>
                <Pressable
                  onPress={() => router.push('/add')}
                  accessibilityRole="button"
                  accessibilityLabel="Add contract"
                  style={({ pressed }) => ({
                    width: FAB_SIZE,
                    height: FAB_SIZE,
                    borderRadius: FAB_SIZE / 2,
                    // The add button is the app's primary action and the one
                    // place lime earns a full fill: dark ink on lime reads at
                    // 11.5:1, and it makes the FAB unmissable.
                    backgroundColor: theme.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: theme.brand,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="add" size={30} color={theme.brandForeground} />
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
          <Animated.View
            pointerEvents={isOpen ? 'auto' : 'none'}
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 18,
                gap: 10,
              },
              searchRowStyle,
            ]}
          >
            <ContryFace slot="search-active" size={24} fallbackIcon="search" color={theme.brandText} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="What should Contry find?"
              placeholderTextColor={theme.mutedForeground}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              style={{ flex: 1, fontSize: 16, color: theme.foreground, paddingVertical: 0 }}
            />
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close search"
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={theme.mutedForeground} />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
