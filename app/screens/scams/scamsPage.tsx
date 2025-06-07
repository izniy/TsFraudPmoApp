import Card from '@/components/card';
import { LoadingScreen } from '@/components/loading';
import AntDesign from '@expo/vector-icons/AntDesign';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ScamsPage() {
  const [loading, setLoading] = useState(true);
  const [popupVisible, setPopupVisible] = useState(false);

  const recentScams = [
    {
      title: "Fake Tech Support",
      type: "Phishing",
      content: "Scammers pretend to be from well-known companies and ask for remote access to your computer to steal info or money.",
      mainImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Romance Scams",
      type: "Social Engineering",
      content: "Fake online relationships to emotionally manipulate victims into sending money or personal information.",
      mainImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Investment Scams",
      type: "Fraud",
      content: "Promises of high returns with no risk, often pushing fake or worthless investments.",
      mainImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Phishing Emails",
      type: "Phishing",
      content: "Emails that look like they come from a trusted source, asking you to click links or provide login details.",
      mainImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Fake Delivery Notifications",
      type: "Scam",
      content: "Scam messages pretending to be from courier companies asking for payment or personal info.",
      mainImage: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=400&q=80",
    },
  ];

  // Placeholder to simulate fetching data
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const togglePage = () => {
    router.replace('/education')
  };

  return (
    <View className="flex-1 bg-white pt-24 px-4">
      <View className="items-center mb-6">
        <View className="flex-row bg-gray-100 rounded-full p-1 w-1/2 shadow">
          <TouchableOpacity
            className="flex-1 py-2 rounded-full bg-white shadow items-center justify-center"
          >
            <SimpleLineIcons name="home" size={24} color="black" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-2 rounded-full items-center justify-center"
            onPress={togglePage}
          >
            <SimpleLineIcons name="book-open" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-2xl font-bold text-gray-900 px-4 mb-4">Recent Scams</Text>

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView className="flex-1 px-4">
          {recentScams.map((scam, index) => (
            <Card
              key={index}
              title={scam.title}
              content={scam.content}
              type={scam.type}
              mainImage={scam.mainImage}
            />
          ))}
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
      <Modal
        transparent
        visible={popupVisible}
        animationType="fade"
        onRequestClose={() => setPopupVisible(false)}
      >
        <View className="flex-1 bg-black/30 justify-center items-center">
          <View className="bg-white p-6 rounded-xl w-4/5">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Report a Scam</Text>
            <Text className="text-gray-600 mb-6">WIP</Text>
            <TouchableOpacity
              onPress={() => setPopupVisible(false)}
              className="self-end px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
