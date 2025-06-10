import Card from '@/components/card';
import { LoadingScreen } from '@/components/loading';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import useEducationArticles, { EducationArticle } from '../../../hooks/useEducationArticles';

export default function EducationPage() {  
  
  const { loading, error, articles }: {
    loading: boolean;
    error: string | null;
    articles: EducationArticle[];
  } = useEducationArticles(10);

  console.log('Fetched articles:', articles);

  const togglePage = () => {
    router.replace('/scams')
  };

  return (
    <View className='flex-1 bg-white pt-24 px-4'>
      <View className="items-center mb-6">
        <View className="flex-row bg-white rounded-full p-1 w-2/3 shadow">
          <TouchableOpacity
            className="flex-1 py-2 rounded-full items-center justify-center"
            onPress={togglePage}
          >
            <SimpleLineIcons name="home" size={24} color="gray" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-2 rounded-full bg-white items-center justify-center"
          >
            <SimpleLineIcons name="book-open" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-2xl font-bold text-gray-900 px-4 mb-4">Educational Articles</Text>

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView className="flex-1 px-4">
          {articles.length === 0 ? (
            <Text className="text-center text-gray-500 mt-4">
              No educational articles found.
            </Text>
          ) : (
            articles.map((article: EducationArticle, index: number) => {
              console.log('→ Advice from Supabase:', article.advice);
              return (
                <Card
                  key={index}
                  title={article.title}
                  type={article.type}
                  content={article.content}
                  mainImage={article.image_url ?? undefined}
                  advice={article.advice ?? undefined}
                />
              );
            })
          )}
        </ScrollView>
      )}

      <View className="py-8 items-center">
        <View className="w-14 h-14 bg-transparent rounded-full items-center justify-center shadow-lg" />
      </View>

    </View>
  );
}