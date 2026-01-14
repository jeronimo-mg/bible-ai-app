import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Button, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bibleData from '../assets/bible_data.json';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBibleContext } from '@/context/BibleContext';
import { GeminiLiveClient } from '../utils/GeminiLiveClient';

interface BibleBook {
    name: string;
    chapters: string[][];
}

interface BibleData {
    books: BibleBook[];
}

const data = bibleData as BibleData;

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

export function BibleTextReader() {
    const { currentBookIndex, currentChapterIndex, scrollPosition, setScrollPosition } = useBibleContext();
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
    // Ref for the TextInput scroll view to restore position
    // Note: React Native TextInput scroll handling is tricky. We'll try to restore via contentOffset prop if creating a new one, 
    // or assuming the persistence of the component in the tab keeps it alive. context persistence is safer.

    const currentBook = data.books[currentBookIndex] || data.books[0];
    const currentChapter = currentBook?.chapters[currentChapterIndex] || [];

    const fullChapterText = currentChapter.map((verse, index) => `${index + 1}. ${verse.replace(/^\d+\s*/, '')}`).join('\n');

    // LIVE API Integration
    const liveClient = useRef<GeminiLiveClient | null>(null);

    const initLiveClient = () => {
        if (liveClient.current) return;

        setChatMessages(prev => [...prev, { role: 'model', text: "🔄 Iniciando conexão WebSocket..." }]);

        liveClient.current = new GeminiLiveClient(API_KEY, {
            onOpen: () => {
                console.log("Live WebSocket Connected");
                setChatMessages(prev => [...prev, { role: 'model', text: "✅ Conectado ao servidor!" }]);
            },
            onError: (e) => {
                console.error("Live WebSocket Error", e);
                setLoadingChat(false);
                setChatMessages(prev => [...prev, { role: 'model', text: `❌ Erro WebSocket: ${JSON.stringify(e)}` }]);
            },
            onClose: (e) => {
                console.log("WebSocket Closed", e);
                setChatMessages(prev => [...prev, { role: 'model', text: `🔌 Conexão Fechada (Code: ${e.code})` }]);
            },
            onMessage: (text, isFinal) => {
                if (text) {
                    setChatMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        const isLog = lastMsg?.text.startsWith('🔄') || lastMsg?.text.startsWith('✅') || lastMsg?.text.startsWith('🔌') || lastMsg?.text.startsWith('❌');

                        if (lastMsg && lastMsg.role === 'model' && !isLog) {
                            return [
                                ...prev.slice(0, prev.length - 1),
                                { ...lastMsg, text: lastMsg.text + text }
                            ];
                        } else {
                            return [...prev, { role: 'model', text }];
                        }
                    });
                }
                if (isFinal) setLoadingChat(false);
            }
        });
        liveClient.current.connect();
    };

    useEffect(() => {
        return () => {
            Speech.stop();
            if (selectionTimer) clearTimeout(selectionTimer);
            if (liveClient.current) liveClient.current.disconnect();
        };
    }, []);

    const handleSelectionChange = (event: any) => {
        const { selection } = event.nativeEvent;
        const { start, end } = selection;

        if (Math.abs(end - start) < 2) {
            setTempSelection(null);
            return;
        }

        if (selectionTimer) clearTimeout(selectionTimer);

        const timer = setTimeout(() => {
            const selectedText = fullChapterText.substring(start, end).trim();

            let currentLength = 0;
            let startVerse = -1;
            let endVerse = -1;

            const versesWithNumbers = currentChapter.map((verse, index) => `${index + 1}. ${verse.replace(/^\d+\s*/, '')}`);

            for (let i = 0; i < versesWithNumbers.length; i++) {
                const verseLength = versesWithNumbers[i].length;
                if (startVerse === -1 && start < currentLength + verseLength + (i === versesWithNumbers.length - 1 ? 0 : 1)) {
                    startVerse = i + 1;
                }
                if (end <= currentLength + verseLength + (i === versesWithNumbers.length - 1 ? 0 : 1)) {
                    endVerse = i + 1;
                    break;
                }
                currentLength += verseLength + 1;
            }

            const verseReference = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
            const fullReference = `${currentBook.name} ${currentChapterIndex + 1}:${verseReference}`;

            if (selectedText.length > 2) {
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
            setTempSelection(null);
        }
    };

    const triggerAIExplanation = async (text: string, context: string, reference?: string) => {
        setIsChatExpanded(true);
        setSelectedVerse({ text: reference ? `(${reference}) ${text}` : text, index: -1 });
        setLoadingChat(true);
        setChatMessages([]);
        setChatInput('');

        try {
            // Using Gemini 3 Flash Preview (validated via script)
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            let prompt = `
Contexto: ${currentBook.name} Capítulo ${currentChapterIndex + 1}
Texto Completo (referência):
"""
${fullChapterText}
"""

ALVO:
Texto: "${text}"
Ref: ${reference || 'Desconhecida'}

Instrução: Explique o que "${text}" significa EM ${reference}. Máximo 3 frases.`;

            const result = await model.generateContent(prompt);
            const initialResponse = await result.response.text();

            setChatMessages([
                { role: 'model', text: initialResponse }
            ]);
        } catch (error) {
            setChatMessages([{ role: 'model', text: "Erro ao carregar explicação." }]);
            console.error(error);
        } finally {
            setLoadingChat(false);
        }
    };

    const sendGeneralMessage = async () => {
        if (!chatInput.trim()) return;

        setIsChatExpanded(true);
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoadingChat(true);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            let contextPrompt = "";
            if (selectedVerse) {
                // Reuse existing chat history for context if possible, but standard API is stateless unless chat session is managed.
                // For simplicity/robustness here, we rebuild context or just start a chat.
                contextPrompt = `Contexto: Usuário estudando: "${selectedVerse.text}".\nHistórico Recente: ${JSON.stringify(chatMessages)}`;
            } else {
                contextPrompt = `Contexto: Usuário lendo ${currentBook.name} Capítulo ${currentChapterIndex + 1}. Texto: "${fullChapterText.substring(0, 5000)}..."\nPergunta geral.`;
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
            setChatMessages(prev => [...prev, { role: 'model', text: "Erro: Falha na conexão." }]);
        } finally {
            setLoadingChat(false);
        }
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

    // Keep scroll position in sync (simple approach, saving on scroll end might be better for perf)
    const handleScroll = (event: any) => {
        setScrollPosition(event.nativeEvent.contentOffset.y);
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200 h-[10%]">
                    {/* No Back button here, assuming Tabs navigation */}
                    <View className="w-8" />

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

                <View className="flex-1 flex-col">
                    <View className="flex-1 border-b-4 border-slate-200 bg-white relative">
                        <Text className="text-sm text-gray-400 italic text-center py-2 absolute top-0 left-0 right-0 z-10 bg-white/90">
                            Selecione um trecho para explicar ou pergunte abaixo
                        </Text>
                        <TextInput
                            key={`${currentBookIndex}-${currentChapterIndex}`}
                            multiline
                            scrollEnabled={true}
                            value={fullChapterText}
                            editable={true}
                            showSoftInputOnFocus={false}
                            onSelectionChange={handleSelectionChange}
                            className="flex-1 text-lg leading-8 text-slate-800 font-normal p-4 pt-10"
                            textAlignVertical="top"
                            style={{ outlineStyle: 'none' } as any}
                        // Initial scroll could be set via contentOffset if TextInput supported it robustly on all platforms
                        // For now we rely on the component mounting fresh for new chapters. 
                        // Restoring scroll for SAME chapter (resume) would need specific handling or a wrapping ScrollView 
                        // but TextInput with multiline=true has its own internal ScrollView.
                        />

                        {tempSelection && !isChatExpanded && (
                            <TouchableOpacity
                                onPress={confirmSelection}
                                className="absolute bottom-4 right-4 bg-blue-600 px-6 py-3 rounded-full shadow-lg z-50 flex-row items-center"
                            >
                                <IconSymbol name="sparkles" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Explique</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View className={`${isChatExpanded ? 'h-80' : 'h-auto'} bg-gray-50 flex-col transition-all duration-300`}>
                        {isChatExpanded && (
                            <View className="flex-row justify-between items-center p-2 bg-white border-b border-gray-200">
                                <Text className="font-bold text-xs text-slate-500 uppercase tracking-widest pl-2 flex-1">
                                    {selectedVerse ? `Seleção` : `Chat`}
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

                        {isChatExpanded && (
                            <ScrollView
                                className="flex-1 p-3"
                                ref={scrollViewRef}
                                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
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

                        <View className="p-3 bg-white border-t border-gray-200 flex-row gap-2">
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                onFocus={() => setIsChatExpanded(true)}
                                placeholder="Pergunte..."
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
