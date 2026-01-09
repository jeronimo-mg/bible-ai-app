import { BibleTextReader } from '@/components/BibleTextReader';
import { View } from 'react-native';

export default function StudyScreen() {
    return (
        <View className="flex-1 bg-white">
            <BibleTextReader />
        </View>
    );
}
