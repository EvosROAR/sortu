import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sortu-onboarding-v1';

export async function isOnboardingDone(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === '1';
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
