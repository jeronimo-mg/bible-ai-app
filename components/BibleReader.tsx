import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bibleData from '../assets/bible_data.json';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

    // Commentary/Chat State
    const [selectedVerse, setSelectedVerse] = useState<{ text: string, index: number } | null>(null);
    const [tempSelection, setTempSelection] = useState<{ text: string, fullReference: string } | null>(null);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(false);

    const [selectionTimer, setSelectionTimer] = useState<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const currentBook = data.books[currentBookIndex];
    const currentChapter = currentBook?.chapters[currentChapterIndex] || [];

    // Flatten chapter for Study Mode (TextInput)
    // Adding verse numbers to the text so selection includes them if user wants
    const fullChapterText = currentChapter.map((verse, index) => `${index + 1}. ${verse.replace(/^\d+\s*/, '')}`).join('\n');

    useEffect(() => {
        return () => {
            Speech.stop();
            if (selectionTimer) clearTimeout(selectionTimer);
        };
    }, []);

    const handleSelectionChange = (event: any) => {
        const { selection } = event.nativeEvent;
        const { start, end } = selection;

        // If cursor just moved without selection (start == end), we should clear the button
        if (Math.abs(end - start) < 2) {
            setTempSelection(null);
            return;
        }

        // Debounce: Wait for user to stop changing selection
        if (selectionTimer) clearTimeout(selectionTimer);

        const timer = setTimeout(() => {
            const selectedText = fullChapterText.substring(start, end).trim();

            // Calculate which verses were selected
            let currentLength = 0;
            let startVerse = -1;
            let endVerse = -1;

            // Reconstruct the verses to match fullChapterText Logic
            const versesWithNumbers = currentChapter.map((verse, index) => `${index + 1}. ${verse.replace(/^\d+\s*/, '')}`);

            for (let i = 0; i < versesWithNumbers.length; i++) {
                const verseLength = versesWithNumbers[i].length;
                // Check if selection start falls in this verse
                if (startVerse === -1 && start < currentLength + verseLength + (i === versesWithNumbers.length - 1 ? 0 : 1)) { // +1 for \n, 0 for last verse
                    startVerse = i + 1;
                }
                // Check if selection end falls in this verse
                if (end <= currentLength + verseLength + (i === versesWithNumbers.length - 1 ? 0 : 1)) {
                    endVerse = i + 1;
                    break;
                }
                currentLength += verseLength + 1; // +1 for \n used in join
            }

            const verseReference = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
            const fullReference = `${currentBook.name} ${currentChapterIndex + 1}:${verseReference}`;

            if (selectedText.length > 2) {
                // Instead of auto-triggering, store selection and show button
                setTempSelection({ text: selectedText, fullReference });
            } else {
                setTempSelection(null);
            }
        }, 1200);
        setSelectionTimer(timer);
    };

    const confirmSelection = () => {
        if (tempSelection) {
            triggerAIExplanation(tempSelection.text, "trecho selecionado", tempSelection.fullReference);
            setTempSelection(null); // Hide button after clicking
        }
    };

    const triggerAIExplanation = async (text: string, context: string, reference?: string) => {
        setIsChatExpanded(true); // Auto-expand
        setSelectedVerse({ text: reference ? `(${reference}) ${text}` : text, index: -1 });
        setLoadingChat(true);
        setChatMessages([]); // Reset chat
        setChatInput('');

        try {
            // 1. Initial Explanation using Fast Model (27B - Proven faster in benchmarks)
            const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

            let prompt = `
Contexto Bibliográfico: ${currentBook.name} Capítulo ${currentChapterIndex + 1}
Texto Completo do Capítulo:
"""
${fullChapterText}
"""

ALVO DA ANÁLISE:
Texto Selecionado: "${text}"
Localização Exata: ${reference || 'Desconhecida'}

Instrução Crítica: O texto selecionado ("${text}") pode aparecer múltiplas vezes neste capítulo.
Você DEVE explicar o significado dele APENAS no contexto do versículo ${reference}.
Ignore qualquer outra ocorrência dessa palavra em outros versículos.
Explique o que "${text}" significa EM ${reference}. Máximo 3 frases.`;

            const result = await model.generateContent(prompt);
            const initialResponse = await result.response.text();

            setChatMessages([
                { role: 'model', text: initialResponse }
            ]);
        } catch (error) {
            setChatMessages([{ role: 'model', text: "Erro ao carregar explicação inicial." }]);
            console.error(error);
        } finally {
            setLoadingChat(false);
        }
    };

    const sendGeneralMessage = async () => {
        if (!chatInput.trim()) return;

        setIsChatExpanded(true); // Auto-expand

        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoadingChat(true);

        try {
            const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

            // Context logic: Specific verse vs Full Chapter
            let contextPrompt = "";
            if (selectedVerse) {
                contextPrompt = `Contexto: O usuário está estudando o trecho: "${selectedVerse.text}".\nHistórico: ${JSON.stringify(chatMessages)}`;
            } else {
                // General questions use the first 5000 chars of the chapter as context
                contextPrompt = `Contexto: O usuário está lendo ${currentBook.name} Capítulo ${currentChapterIndex + 1}. O texto completo do capítulo é: "${fullChapterText.substring(0, 5000)}..." (truncado se muito longo).\nO usuário fez uma pergunta geral sobre o capítulo.`;
            }

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: contextPrompt }] },
                    { role: 'model', parts: [{ text: "Entendido. Estou pronto para ajudar com o estudo bíblico." }] }
                ]
            });

            const result = await chat.sendMessage(userMsg);
            const text = await result.response.text();

            setChatMessages(prev => [...prev, { role: 'model', text }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com o modelo." }]);
            console.error(error);
        } finally {
            setLoadingChat(false);
        }
    };

    const handleBookSelect = (index: number) => {
        setCurrentBookIndex(index);
        setView('chapters');
    };

    const handleChapterSelect = (index: number) => {
        setCurrentChapterIndex(index);
        setView('text');
        setChatMessages([]); // Clear chat on new chapter
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

    const closeCommentary = () => {
        setSelectedVerse(null);
        setTempSelection(null);
        setChatMessages([]);
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

    if (view === 'chapters') {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
                <ScrollView className="flex-1 p-4">
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
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200 h-[10%]">
                    <Button title="<" onPress={() => { stopSpeaking(); setView('chapters'); }} />

                    <Text className="text-lg font-bold text-slate-700">
                        {currentBook.name} {currentChapterIndex + 1}
                    </Text>

                    <TouchableOpacity
                        onPress={isSpeaking ? stopSpeaking : speakChapter}
                        className={`px-3 py-1 rounded-full ${isSpeaking ? 'bg-red-500' : 'bg-green-600'}`}
                    >
                        <Text className="text-white font-bold">{isSpeaking ? 'Parar' : 'Ouvir'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Split View Container */}
                <View className="flex-1 flex-col">

                    {/* Top: Bible Text (Fills all remaining space) */}
                    <View className="flex-1 border-b-4 border-slate-200 bg-white relative">
                        <Text className="text-sm text-gray-400 italic text-center py-2 absolute top-0 left-0 right-0 z-10 bg-white/90">
                            Selecione um trecho para explicar ou pergunte abaixo
                        </Text>
                        <TextInput
                            key={`${currentBookIndex}-${currentChapterIndex}`} // Force remount to reset scroll
                            multiline
                            scrollEnabled={true}
                            value={fullChapterText}
                            editable={true}
                            showSoftInputOnFocus={false}
                            onSelectionChange={handleSelectionChange}
                            className="flex-1 text-lg leading-8 text-slate-800 font-normal p-4 pt-10"
                            textAlignVertical="top"
                            style={{ outlineStyle: 'none' } as any}
                        />

                        {/* Floating Button for Selection */}
                        {tempSelection && !isChatExpanded && (
                            <TouchableOpacity
                                onPress={confirmSelection}
                                className="absolute bottom-4 right-4 bg-blue-600 px-6 py-3 rounded-full shadow-lg z-50 flex-row items-center"
                            >
                                <IconSymbol name="sparkles" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Explique este trecho</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Bottom: Persistent Chat (Collapsible) */}
                    <View className={`${isChatExpanded ? 'h-80' : 'h-auto'} bg-gray-50 flex-col transition-all duration-300`}>

                        {/* Chat Header / Controls (Only visible if expanded) */}
                        {isChatExpanded && (
                            <View className="flex-row justify-between items-center p-2 bg-white border-b border-gray-200">
                                <Text className="font-bold text-xs text-slate-500 uppercase tracking-widest pl-2 flex-1">
                                    {selectedVerse ? `Focando em Seleção` : `Chat: ${currentBook.name} ${currentChapterIndex + 1}`}
                                </Text>

                                <View className="flex-row gap-2">
                                    <TouchableOpacity onPress={() => setChatMessages([])} className="px-2 py-1 bg-red-100 rounded">
                                        <Text className="text-xs text-red-600 font-bold">Apagar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setIsChatExpanded(false)} className="px-2 py-1 bg-gray-200 rounded">
                                        <Text className="text-xs text-gray-600 font-bold">Ocultar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Messages Area (Hidden if collapsed) */}
                        {isChatExpanded && (
                            <ScrollView
                                className="flex-1 p-3"
                                ref={scrollViewRef}
                                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
                                {chatMessages.length === 0 && !loadingChat && (
                                    <Text className="text-center text-gray-400 mt-4 text-sm">
                                        Comece a conversa! Pergunte sobre o capítulo ou selecione um versículo.
                                    </Text>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <View key={idx} className={`mb-3 p-3 rounded-lg max-w-[90%] ${msg.role === 'user' ? 'bg-blue-100 self-end rounded-tr-none' : 'bg-white self-start border border-gray-200 rounded-tl-none'}`}>
                                        <Text className="text-slate-800 leading-5 text-sm">{msg.text}</Text>
                                    </View>
                                ))}
                                {loadingChat && (
                                    <View className="self-start p-3">
                                        <ActivityIndicator size="small" color="#2563eb" />
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        {/* Input Area (Always Visible) */}
                        <View className="p-3 bg-white border-t border-gray-200 flex-row gap-2">
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                onFocus={() => setIsChatExpanded(true)} // Expand on focus
                                placeholder={selectedVerse ? "Pergunte sobre a seleção..." : "Pergunte sobre o capítulo..."}
                                className="flex-1 bg-gray-100 rounded-full px-4 py-2 border border-gray-300 text-sm"
                            />
                            <TouchableOpacity
                                onPress={sendGeneralMessage}
                                className="bg-blue-600 rounded-full w-10 h-10 items-center justify-center shadow-sm"
                            >
                                <Text className="text-white font-bold text-lg">{'>'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
