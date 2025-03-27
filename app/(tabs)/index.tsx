// app/(tabs)/index.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function TabsHomeScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to the Authenticated Home!</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}
