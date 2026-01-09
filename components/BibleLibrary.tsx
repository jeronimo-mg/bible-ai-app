import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import bibleData from '../assets/bible_data.json';
import { useBibleContext } from '@/context/BibleContext';
import { useRouter } from 'expo-router';

interface BibleBook {
    name: string;
    chapters: string[][];
}

interface BibleData {
    books: BibleBook[];
}

const data = bibleData as BibleData;

export function BibleLibrary() {
    const { setCurrentBookIndex, setCurrentChapterIndex, markChapterOpened, setScrollPosition } = useBibleContext();
    const router = useRouter();

    // Internal state for Library navigation (Book List <-> Chapter List)
    const [view, setView] = useState<'books' | 'chapters'>('books');
    const [selectedBookIdx, setSelectedBookIdx] = useState(0);

    const handleBookSelect = (index: number) => {
        setSelectedBookIdx(index);
        setView('chapters');
    };

    const handleChapterSelect = (index: number) => {
        setCurrentBookIndex(selectedBookIdx);
        setCurrentChapterIndex(index);
        markChapterOpened(); // Flag that user has selected a chapter
        setScrollPosition(0); // Reset scroll when choosing a new chapter

        // Navigate to Study tab (assuming it will be mapped to 'study' route)
        router.push('/study');
    };

    if (view === 'books') {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
                <ScrollView className="flex-1 p-4">
                    <Text className="text-2xl font-bold mb-4 text-slate-800">Livros</Text>
                    {data.books.map((book, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleBookSelect(index)}
                            className="p-4 border-b border-gray-200"
                        >
                            <Text className="text-lg text-slate-700">{book.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <ScrollView className="flex-1 p-4">
                <View className="flex-row items-center mb-4">
                    <Button title="Voltar" onPress={() => setView('books')} />
                    <Text className="text-2xl font-bold ml-4 text-slate-800">{data.books[selectedBookIdx].name}</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                    {data.books[selectedBookIdx].chapters.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleChapterSelect(index)}
                            className="w-16 h-16 bg-blue-100 items-center justify-center rounded-lg m-1"
                        >
                            <Text className="text-lg font-semibold text-blue-800">{index + 1}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
