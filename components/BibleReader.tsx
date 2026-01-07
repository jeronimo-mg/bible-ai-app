import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button, ActivityIndicator, Modal } from 'react-native';
import * as Speech from 'expo-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Initialize Gemini for commentary
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

export function BibleReader() {
    const [currentBookIndex, setCurrentBookIndex] = useState(0);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [view, setView] = useState<'books' | 'chapters' | 'text'>('books');
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Commentary State
    const [selectedVerse, setSelectedVerse] = useState<{ text: string, index: number } | null>(null);
    const [explanation, setExplanation] = useState('');
    const [loadingExplanation, setLoadingExplanation] = useState(false);

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

    const handleVersePress = async (verse: string, index: number) => {
        setSelectedVerse({ text: verse, index });
        setLoadingExplanation(true);
        setExplanation('');

        try {
            // Using the faster/lighter model for quick commentary
            const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" });
            const prompt = `Explique brevemente (máximo 2 frases) o seguinte versículo bíblico, focando na teologia ou contexto histórico de forma simples: "${verse}"`;

            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            setExplanation(text);
        } catch (error) {
            setExplanation("Não foi possível carregar o comentário. Verifique sua conexão.");
            console.error(error);
        } finally {
            setLoadingExplanation(false);
        }
    };

    const closeCommentary = () => {
        setSelectedVerse(null);
        setExplanation('');
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
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleVersePress(verse, index)}
                        className={`mb-2 rounded-lg p-2 ${selectedVerse?.index === index ? 'bg-blue-50 border border-blue-200' : ''}`}
                    >
                        <Text className="text-lg leading-8 text-slate-700">
                            <Text className="font-bold text-xs text-slate-400 mr-1">{index + 1} </Text>
                            {verse.replace(/^\d+\s*/, '')}
                        </Text>
                    </TouchableOpacity>
                ))}
                <View className="h-48" />
            </ScrollView>

            {/* Commentary Bottom Sheet / Modal */}
            {
                selectedVerse && (
                    <View className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 p-4 shadow-lg h-1/3">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="font-bold text-slate-500">Comentário IA (Gemma 3 1B)</Text>
                            <TouchableOpacity onPress={closeCommentary}>
                                <Text className="text-blue-600 font-bold">Fechar</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingExplanation ? (
                            <View className="flex-1 justify-center items-center">
                                <ActivityIndicator size="small" color="#2563eb" />
                                <Text className="text-slate-400 mt-2">Gerando explicação...</Text>
                            </View>
                        ) : (
                            <ScrollView>
                                <Text className="text-slate-800 text-base italic leading-6">
                                    "{explanation}"
                                </Text>
                            </ScrollView>
                        )}
                    </View>
                )
            }
        </View >
    );
}
