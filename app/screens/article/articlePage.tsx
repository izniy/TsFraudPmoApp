import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

type ArticleProps = {
  title: string;
  type: string;
  content: string;
  mainImage?: string;
};

export default function ArticlePage() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleProps | null>(null);

  useEffect(() => {
    if (data) {
      try {
        const decoded = decodeURIComponent(data);
        setArticle(JSON.parse(decoded));
      } catch (e) {
        console.error('Failed to parse article data', e);
      }
    }
  }, [data]);

  if (!article) {
    return (
      <View className="flex-1 justify-center items-center bg-white pt-24">
        <Text className="text-gray-500">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-6 pt-24">
      {/* Back button */}
      <Pressable onPress={() => router.back()} className="mb-8">
        <Text className="text-4xl text-black">←</Text>
      </Pressable>

      <Text className="text-3xl font-bold mb-2">{article.title}</Text>
      <Text className="text-gray-400 text-lg mb-4">{article.type}</Text>

      {article.mainImage && (
        <Image
          source={{ uri: article.mainImage }}
          className="w-full h-56 rounded-lg mb-6"
          resizeMode="cover"
        />
      )}

      <Text className="text-gray-800 text-base leading-8">{article.content}</Text>
    </ScrollView>
  );
}
