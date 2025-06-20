import Card from '@/components/card';
import FeaturedCard from '@/components/featuredCard';
import { LoadingScreen } from '@/components/loading';
import AntDesign from '@expo/vector-icons/AntDesign';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../utils/supabase';
import ScamReportForm from './form';

interface ScamReport {
  id: number;
  title: string;
  type: string;
  summary: string;
  image: string | null;
  timestamp: number;
  count: number;
}

export default function ScamsPage() {
  const [recentLoading, setRecentLoading] = useState(true);
  const [topLoading, setTopLoading] = useState(true);
  const [popupVisible, setPopupVisible] = useState(false);
  const [recentScams, setRecentScams] = useState<ScamReport[]>([]);
  const [topScams, setTopScams] = useState<ScamReport[]>([]);

  async function fetchRecentScams() {
    setRecentLoading(true);
    try {
      const { data, error } = await supabase
        .from('scamreports')
        .select('id, title, type, summary, image, timestamp, count')
        .gte('count', 3)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching scam reports:', error.message);
        return;
      }

      if (data) {
        setRecentScams(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching scam reports:', error);
    } finally {
      setRecentLoading(false);
    }
  }

  async function fetchTopScams() {
    setTopLoading(true);
    try {
      const { data, error } = await supabase
        .from('scamreports')
        .select('id, title, type, summary, image, timestamp, count')
        .gte('count', 3)
        .order('count', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching scam reports:', error.message);
        return;
      }

      if (data) {
        setTopScams(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching scam reports:', error);
    } finally {
      setTopLoading(false);
    }
  }

  useEffect(() => {
    fetchRecentScams();
    fetchTopScams();
  }, []);
  
  const togglePage = () => {
    router.replace('/education')
  };

  return (
    <View className="flex-1 bg-white pt-24 px-4">
      <View className="items-center mb-6 bg-white">
        <View className="flex-row bg-white rounded-full p-1 w-2/3 shadow">
          <TouchableOpacity
            className="flex-1 py-2 rounded-full bg-white items-center justify-center"
          >
            <SimpleLineIcons name="home" size={24} color="black" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-2 rounded-full items-center justify-center"
            onPress={togglePage}
          >
            <SimpleLineIcons name="book-open" size={24} color="gray" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Scams Section */}
      <View className="h-1/3 mb-4">
        <Text className="text-2xl font-bold text-gray-900 px-4 mb-4">Top Scams</Text>
        {topLoading ? (
          <LoadingScreen />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start" // Align to start of card
            disableIntervalMomentum={true} // Prevent swiping multiple cards at once
            overScrollMode="never" // Disable over-scroll effect
            className="px-4"
          >
            {topScams.map((scam) => (
              <FeaturedCard 
                key={scam.id}
                title={scam.title}
                content={scam.summary}
                type={scam.type}
                mainImage={scam.image ?? undefined}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <Text className="text-2xl font-bold text-gray-900 px-4 mb-4">Recent Scams</Text>

      {recentLoading ? (
        <LoadingScreen />
      ) : (
        <ScrollView className="flex-1 px-4">
          {recentScams.length === 0 ? (
            <Text className="text-center text-gray-500 mt-4">No scam reports found.</Text>
          ) : (
            recentScams.map((scam) => (
              <Card
                key={scam.id}
                title={scam.title}
                content={scam.summary}
                type={scam.type}
                mainImage={scam.image ?? undefined}
              />
            ))
          )}
        </ScrollView>
      )}

      <View className="py-8 items-center">
        <TouchableOpacity
          className="w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
          onPress={() => setPopupVisible(true)}
          activeOpacity={0.8}
        >
          <AntDesign name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <ScamReportForm
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        onSubmitted={() => {
          fetchRecentScams();
          fetchTopScams();
          setPopupVisible(false);
        }}
      />
    </View>
  );
}
