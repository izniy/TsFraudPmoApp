import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingScreen({ message = "Loading..." }) {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="mb-2 text-lg">{message}</Text>
      <ActivityIndicator size="small" color="#888" />
    </View>
  );
}
