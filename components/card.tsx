import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';

type CardProps = {
  title: string;
  type?: string;  // optional
  content: string;
  mainImage?: string;
  advice?:string;
};

export default function Card({ title, type, content, mainImage, advice }: CardProps) {
  const router = useRouter();

  // Log advice before encoding
  console.log('→ Advice passed to Card:', advice);

  // Encode all props including content to pass to article page
  const encodedParams = encodeURIComponent(
    JSON.stringify({ title, type, content, mainImage, advice })
  );

  return (
    <TouchableOpacity
      onPress={() => router.push(`/article?data=${encodedParams}`)}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-xl p-1 mb-4 shadow shadow-gray-200 flex-row items-center">
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            className="w-20 h-20 rounded-lg mr-4"
            resizeMode="cover"
          />
        ) : (
          <View className="w-20 h-20 rounded-lg mr-4 bg-indigo-100 items-center justify-center">
            <Text className="text-2xl">🛡️</Text>
          </View>
        )}

        <View className="flex-1 justify-center pr-4">
          <Text className="text-md font-semibold text-gray-900 mb-1">{title}</Text>
          {type && <Text className="text-sm font-medium text-gray-500">{type}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}
