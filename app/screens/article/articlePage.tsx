import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

type ArticleProps = {
  title: string;
  type?: string;
  content: string;
  advice?: string;
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
        console.log('→ Decoded data:', decoded);
        const parsed = JSON.parse(decoded);
        console.log('→ Parsed advice:', parsed.advice);
        setArticle(parsed);
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
    <SafeAreaView className="flex-1 bg-white">
      {/* Back button */}
      <View className="px-6 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text className="text-3xl text-black">←</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold mb-1">{article.title}</Text>
        <Text className="text-gray-400 text-base mb-4">{article.type}</Text>

        {article.mainImage && (
          <Image
            source={{ uri: article.mainImage }}
            className="w-full h-60 rounded-xl mb-6"
            resizeMode="contain"
          />
        )}

        <Markdown style={{ body: { color: '#1f2937', fontSize: 16, lineHeight: 24 } }}>
          {article.content}
        </Markdown>

        <View style={{ height: 24 }} />
        
        {article.advice && (
          <View className="bg-gray-50 rounded-xl p-6 mb-8">
            <Text className="text-xl font-semibold mb-4 flex-row items-center">
              🛡️ Tips to Stay Safe
            </Text>
            <Markdown style={{ body: { color: '#374151', fontSize: 16, lineHeight: 24 } }}>
              {article.advice?.trim() || '*Look out for yourself and your loved ones!*'}
            </Markdown>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
