import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { getWelcomeSeen } from '@/lib/onboarding';

// Entry router: first open goes to the welcome pitch, signed-out returners to
// sign-in, fresh accounts to onboarding, everyone else to the dashboard.
export default function Index() {
  const { status, needsOnboarding } = useAuth();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    getWelcomeSeen().then(setWelcomeSeen);
  }, []);

  if (status === 'loading' || welcomeSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'signedIn') {
    return <Redirect href={needsOnboarding ? '/onboarding' : '/dashboard'} />;
  }
  return <Redirect href={welcomeSeen ? '/signin' : '/welcome'} />;
}
