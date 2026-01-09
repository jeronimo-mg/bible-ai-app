import { BibleLibrary } from '@/components/BibleLibrary';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <BibleLibrary />
    </View>
  );
}
