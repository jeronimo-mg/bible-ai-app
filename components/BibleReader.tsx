import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button } from 'react-native';
import * as Speech from 'expo-speech';
import bibleData from '../assets/bible_data.json';

// Basic types based on our JSON structure
interface BibleBook {
    name: string;
    chapters: string[][];
}

interface BibleData {
    books: BibleBook[];
}

const data = bibleData as BibleData;

export function BibleReader() {
    const [currentBookIndex, setCurrentBookIndex] = useState(0);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [view, setView] = useState<'books' | 'chapters' | 'text'>('books');
    const [isSpeaking, setIsSpeaking] = useState(false);

    const currentBook = data.books[currentBookIndex];
    const currentChapter = currentBook?.chapters[currentChapterIndex] || [];

    useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

    const handleBookSelect = (index: number) => {
        setCurrentBookIndex(index);
        setView('chapters');
    };

    const handleChapterSelect = (index: number) => {
        setCurrentChapterIndex(index);
        setView('text');
    };

    const speakChapter = () => {
        const textToSpeak = currentChapter.join('. ');
        Speech.speak(textToSpeak, {
            language: 'pt-BR',
            onDone: () => setIsSpeaking(false),
            onStopped: () => setIsSpeaking(false),
        });
        setIsSpeaking(true);
    };

    const stopSpeaking = () => {
        Speech.stop();
        setIsSpeaking(false);
    };

    if (view === 'books') {
        return (
            <ScrollView className="flex-1 bg-white p-4">
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
        );
    }

    if (view === 'chapters') {
        return (
            <ScrollView className="flex-1 bg-white p-4">
                <View className="flex-row items-center mb-4">
                    <Button title="Voltar" onPress={() => setView('books')} />
                    <Text className="text-2xl font-bold ml-4 text-slate-800">{currentBook.name}</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                    {currentBook.chapters.map((_, index) => (
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
        );
    }

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Button title="<" onPress={() => { stopSpeaking(); setView('chapters'); }} />
                <Text className="text-xl font-bold text-slate-800">{currentBook.name} {currentChapterIndex + 1}</Text>
                <TouchableOpacity
                    onPress={isSpeaking ? stopSpeaking : speakChapter}
                    className={`px-3 py-1 rounded-full ${isSpeaking ? 'bg-red-500' : 'bg-green-600'}`}
                >
                    <Text className="text-white font-bold">{isSpeaking ? 'Parar' : 'Ouvir'}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-4 pb-10">
                {currentChapter.map((verse, index) => (
                    <Text key={index} className="text-lg leading-8 text-slate-700 mb-2">
                        <Text className="font-bold text-xs text-slate-400 mr-1">{index + 1} </Text>
                        {verse.replace(/^\d+\s*/, '')}
                    </Text>
                ))}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
