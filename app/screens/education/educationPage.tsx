import Card from '@/components/card';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function EducationPage() {
  const sampleEducation = [
    {
      title: "How to Spot Fake Tech Support",
      content: "Learn to recognize common signs of fake tech support scams, including unsolicited calls and requests for remote access.",
      mainImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Protecting Yourself From Romance Scams",
      content: "Understand how scammers build fake relationships and ways to safeguard your emotions and finances online.",
      mainImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Investment Safety Tips",
      content: "Tips to evaluate investments carefully, avoid high-risk promises, and recognize red flags in investment offers.",
      mainImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Avoiding Phishing Emails",
      content: "Learn how to identify phishing attempts in emails and protect your accounts by verifying sources before clicking links.",
      mainImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80",
    },
    {
      title: "Dealing with Fake Delivery Notifications",
      content: "Understand the common tactics scammers use in fake delivery notices and how to confirm real shipments safely.",
      mainImage: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const togglePage = () => {
    router.replace('/scams')
  };

  return (
    <View className='flex-1 bg-white pt-24 px-4'>
      <View className="items-center mb-6">
        <View className="flex-row bg-gray-200 rounded-full p-1 w-1/2">
          <TouchableOpacity
            className="flex-1 py-2 rounded-full items-center justify-center"
            onPress={togglePage}
          >
            <SimpleLineIcons name="home" size={24} color="black" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-2 rounded-full bg-white shadow items-center justify-center"
          >
            <SimpleLineIcons name="book-open" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Educational Articles</Text>

        {sampleEducation.map((article, index) => (
          <Card
            key={index}
            title={article.title}
            content={article.content}
            mainImage={article.mainImage}
          />
        ))}
      </ScrollView>
    </View>
  );
}