import 'react-native-gesture-handler';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthBootstrap } from '@/bootstrap/AuthBootstrap';
import { LedgerBootstrap } from '@/bootstrap/LedgerBootstrap';
import { ReminderBootstrap } from '@/bootstrap/ReminderBootstrap';
import { SyncBootstrap } from '@/bootstrap/SyncBootstrap';
import { colors, fonts } from '@/lib/format';
import { AppDialog } from '@/presentation/components/AppDialog';
import { RootStackParamList } from '@/presentation/navigation/types';
import { AllocateScreen } from '@/presentation/screens/AllocateScreen';
import { AuthScreen } from '@/presentation/screens/AuthScreen';
import { OnboardingScreen } from '@/presentation/screens/OnboardingScreen';
import { HistoryScreen } from '@/presentation/screens/HistoryScreen';
import { HomeScreen } from '@/presentation/screens/HomeScreen';
import { IncomeScreen } from '@/presentation/screens/IncomeScreen';
import { PocketDetailScreen } from '@/presentation/screens/PocketDetailScreen';
import { PocketFormScreen } from '@/presentation/screens/PocketFormScreen';
import { useAuthStore } from '@/store/authStore';
import { useSortuStore } from '@/store/sortuStore';
import { isOnboardingDone } from '@/infrastructure/storage/onboardingStorage';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg, overflow: 'hidden' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PocketDetail" component={PocketDetailScreen} />
      <Stack.Screen name="PocketForm" component={PocketFormScreen} />
      <Stack.Screen name="Allocate" component={AllocateScreen} />
      <Stack.Screen name="Income" component={IncomeScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}

function SyncGate({ children }: { children: ReactNode }) {
  const isHydrated = useSortuStore((s) => s.isHydrated);
  const syncReady = useSortuStore((s) => s.syncReady);
  const syncMessage = useSortuStore((s) => s.syncMessage);

  if (!isHydrated || !syncReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
        <Text
          style={{
            marginTop: 16,
            color: colors.textMuted,
            fontFamily: fonts.bodyMedium,
            textAlign: 'center',
          }}
        >
          {syncMessage || 'Menyiapkan data…'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const guestMode = useAuthStore((s) => s.guestMode);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !guestMode) {
      setOnboardingReady(true);
      setShowOnboarding(false);
      return;
    }

    let cancelled = false;
    setOnboardingReady(false);
    void isOnboardingDone().then((done) => {
      if (cancelled) return;
      setShowOnboarding(!done);
      setOnboardingReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, guestMode]);

  if (isLoading || ((isAuthenticated || guestMode) && !onboardingReady)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!isAuthenticated && !guestMode) {
    return <AuthScreen />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <>
      <LedgerBootstrap />
      <SyncBootstrap />
      <ReminderBootstrap />
      <SyncGate>
        <MainStack />
      </SyncGate>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.bg }}>
      <SafeAreaProvider style={{ flex: 1, overflow: 'hidden' }}>
        <AuthBootstrap />
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
        <AppDialog />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
