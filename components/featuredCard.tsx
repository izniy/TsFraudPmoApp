import { useRouter } from 'expo-router';
import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';

type FeaturedCardProps = {
  title: string;
  type?: string;
  content: string;
  mainImage?: string;
  advice?: string;
};

export default function FeaturedCard({ title, type, content, mainImage, advice }: FeaturedCardProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth * 0.5;

  // Encode props to pass to article page
  const encodedParams = encodeURIComponent(
    JSON.stringify({ 
      title,
      type,
      content,
      mainImage,
      advice
    })
  );

  return (
    <TouchableOpacity
      onPress={() => router.push(`/article?data=${encodedParams}`)}
      activeOpacity={0.8}
      className="mr-4"
      style={{ width: cardWidth }}
    >
      <View className="bg-white rounded-xl overflow-hidden shadow shadow-gray-300">
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            className="w-full aspect-[4/3]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-[4/3] bg-indigo-100 items-center justify-center">
            <Text className="text-4xl">🛡️</Text>
          </View>
        )}
        
        <View className="p-4">
          <Text className="text-md font-bold text-gray-900 mb-1">{title}</Text>
          {type && (
            <Text className="text-xs font-medium text-gray-500 mb-2">
              {type}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};