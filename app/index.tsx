import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/scams');
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="mb-4 text-5xl font-bold">TsFraudPmo.</Text>
    </View>
  );
}
