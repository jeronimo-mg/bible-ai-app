import { BibleReader } from '@/components/BibleReader';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <BibleReader />
    </View>
  );
}
