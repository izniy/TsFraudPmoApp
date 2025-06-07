import { Stack } from "expo-router";
import '../global.css';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="scams" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
         }}
      />
      <Stack.Screen 
        name="education" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
         }}       
      />
      <Stack.Screen 
        name="article" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
         }}       
      />
    </Stack>
  );
}