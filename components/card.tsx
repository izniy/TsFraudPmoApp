import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';

type CardProps = {
  title: string;
  type?: string;  // optional
  content: string;
  mainImage?: string;
};

export default function Card({ title, type, content, mainImage }: CardProps) {
  const router = useRouter();

  // Encode all props including content to pass to article page
  const encodedParams = encodeURIComponent(
    JSON.stringify({ title, type, content, mainImage })
  );

  return (
    <TouchableOpacity
      onPress={() => router.push(`/article?data=${encodedParams}`)}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-xl p-1 mb-4 shadow-sm shadow-gray-200 flex-row items-center">
        {mainImage && (
          <Image
            source={{ uri: mainImage }}
            className="w-20 h-20 rounded-lg mr-4"
            resizeMode="cover"
          />
        )}

        <View className="flex-1 justify-center pr-4">
          <Text className="text-md font-semibold text-gray-900 mb-1">{title}</Text>
          {type && <Text className="text-sm font-medium text-gray-500">{type}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}
