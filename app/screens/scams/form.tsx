import AntDesign from '@expo/vector-icons/AntDesign';
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useScamReporter } from '../../../hooks/scamReport';

interface ScamReportFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

interface Feedback {
  title: string;
  content: string;
  verified: number;
}

export default function ScamReportForm({ visible, onClose, onSubmitted }: ScamReportFormProps) {
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const { loading, error, processReport } = useScamReporter();

  useEffect(() => {
    if (!visible) {
      // Reset fields when modal closes
      setDescription('');
      setImageUri(null);
      setConfirmed(false);
      setFeedback(null);
      setShowFeedback(false);
    }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });


    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    console.log('Submitting report with description:', description);
    console.log('Image URI:', imageUri);

    if (!description.trim() || !confirmed) {
      alert('Please fill description and confirm the report');
      return;
    }

    try {
      const result = await processReport(description, imageUri);
      console.log('Report processed. Result:', result);
      console.log('Error state after processing:', error);
      
      if (!error) {
        // Reset form after successful submit
        setDescription('');
        setImageUri(null);
        setConfirmed(false);
        setFeedback(result);
        setShowFeedback(true);
      }
    } catch (err) {
      console.error('Error during handleSubmit:', err);
    }
  };

  const handleCloseFeedback = () => {
    onClose();
    if (onSubmitted) onSubmitted();
    setShowFeedback(false);
    console.log('Form reset and modal closed.');
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 bg-black/30 justify-center items-center">
          <View className="bg-white p-6 rounded-xl w-4/5 space-y-5">
            {showFeedback ? (
              <>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xl font-bold text-gray-900">Thank you for your report!</Text>
                  <TouchableOpacity onPress={handleCloseFeedback} className="p-1" hitSlop={10}>
                    <AntDesign name="close" size={16} color="black" />
                  </TouchableOpacity>
                </View>

                <Text className="text-md text-gray-500 mb-4">Here's a summary of your report:</Text>

                {feedback?.verified === 1 ? (
                  <Text className="font-bold text-red">🚨 LIKELY A SCAM</Text>
                ) : feedback?.verified === 2 ? (
                  <Text className="font-bold text-green">✅ LIKELY NOT A SCAM</Text>
                ) : (
                  <Text className="font-bold text-yellow">🚩 SOME RED FLAGS, COULD BE A SCAM</Text>
                )}

                <Text className="text-md mt-2">
                  {feedback?.content}
                </Text>
              </>
            ) : (
              <>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xl font-bold text-gray-900">Report a Scam</Text>
                  <TouchableOpacity onPress={onClose} className="p-1" hitSlop={10}>
                    <AntDesign name="close" size={16} color="black" />
                  </TouchableOpacity>
                </View>

                <Text className="text-md text-gray-500 mb-1">Let's protect our community</Text>

                {/* Description */}
                <View className="space-y-2 py-1">
                  <Text className="text-lg font-semibold py-1">Description</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-2 text-md"
                    placeholder="Describe the scam"
                    placeholderTextColor="#6B7280"
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    editable={!loading}
                  />
                </View>

                {/* Image Picker */}
                <View className="space-y-2 py-1">
                  <Text className="text-lg font-semibold py-1">Image (optional)</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-lg p-2 justify-between">
                    <Text className="text-md text-gray-500 flex-1">
                      {imageUri ? imageUri.split('/').pop() : 'Attach an image'}
                    </Text>
                    <TouchableOpacity
                      onPress={pickImage}
                      className="ml-2"
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <AntDesign name="plus" size={16} color="black" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirmation */}
                <View className="space-y-2 py-2">
                  <View className="flex-row items-center space-x-3 py-2">
                    <Checkbox
                      value={confirmed}
                      onValueChange={setConfirmed}
                      color={confirmed ? '#2563EB' : undefined}
                      disabled={loading}
                    />
                    <Text className="font-semibold pl-2">I confirm this is a real incident.</Text>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  className={`w-full items-center px-4 py-2 rounded-xl ${loading ? 'bg-gray-400' : 'bg-gray-900'}`}
                  disabled={loading}
                >
                  <Text className="text-white font-semibold">
                    {loading ? 'Processing Report...' : 'Submit Report'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
