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
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthBootstrap } from '@/bootstrap/AuthBootstrap';
import { LedgerBootstrap } from '@/bootstrap/LedgerBootstrap';
import { ReminderBootstrap } from '@/bootstrap/ReminderBootstrap';
import { SyncBootstrap } from '@/bootstrap/SyncBootstrap';
import { isOnboardingDone } from '@/infrastructure/storage/onboardingStorage';
import { colors, fonts } from '@/lib/format';
import { AppBootSplash } from '@/presentation/components/AppBootSplash';
import { AppDialog } from '@/presentation/components/AppDialog';
import { HomeScreenSkeleton } from '@/presentation/components/Skeleton';
import { RootStackParamList } from '@/presentation/navigation/types';
import { AllocateScreen } from '@/presentation/screens/AllocateScreen';
import { AuthScreen } from '@/presentation/screens/AuthScreen';
import { HistoryScreen } from '@/presentation/screens/HistoryScreen';
import { HomeScreen } from '@/presentation/screens/HomeScreen';
import { IncomeScreen } from '@/presentation/screens/IncomeScreen';
import { OnboardingScreen } from '@/presentation/screens/OnboardingScreen';
import { PocketDetailScreen } from '@/presentation/screens/PocketDetailScreen';
import { PocketFormScreen } from '@/presentation/screens/PocketFormScreen';
import { useAuthStore } from '@/store/authStore';
import { useSortuStore } from '@/store/sortuStore';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
      <View style={{ flex: 1 }}>
        <HomeScreenSkeleton />
        {syncMessage ? (
          <View style={syncBanner.wrap} pointerEvents="none">
            <Text style={syncBanner.text}>{syncMessage}</Text>
          </View>
        ) : null}
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

    const timer = setTimeout(() => {
      if (!cancelled) {
        setShowOnboarding(false);
        setOnboardingReady(true);
      }
    }, 3000);

    void isOnboardingDone().then((done) => {
      if (cancelled) return;
      clearTimeout(timer);
      setShowOnboarding(!done);
      setOnboardingReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoading, isAuthenticated, guestMode]);

  if (isLoading || ((isAuthenticated || guestMode) && !onboardingReady)) {
    return <AppBootSplash message="Menyiapkan akun…" />;
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
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return <AppBootSplash />;
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

const syncBanner = {
  wrap: {
    position: 'absolute' as const,
    left: 20,
    right: 20,
    bottom: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 21, 16, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  text: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center' as const,
  },
};
