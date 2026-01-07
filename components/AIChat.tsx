import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
// NOTE: In production, use environment variables or a backend proxy.
// For MVP/Demo with user provided key, we use it directly.
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

interface Message {
    role: 'user' | 'model';
    text: string;
}

export function AIChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Use logic to include context if needed. 
            // For now, simple chat.
            // Using gemma-3-27b-it as requested (and verified available).
            const model = genAI.getGenerativeModel({
                model: "gemma-3-27b-it"
            });

            const systemPrompt = "Você é um assistente de estudos bíblicos focado e erudito. Suas respostas devem ser estritamente baseadas na Bíblia, teologia cristã e contexto histórico bíblico. \n\nREGRAS RÍGIDAS:\n1. NÃO mencione pessoas, atores, atletas ou celebridades modernas (ex: Mateus Carrieri, Mateus Ueta), a menos que o usuário ESPECIFICAMENTE pergunte por eles.\n2. Ao responder sobre nomes bíblicos (ex: Mateus), foque APENAS nas figuras bíblicas (O Apóstolo, etc).\n3. Mantenha um tom respeitoso e educativo.\n4. Se a pergunta for ambígua, assuma SEMPRE o contexto bíblico.";

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: "Entendido. Serei um assistente bíblico focado e não mencionarei figuras modernas irrelevantes." }] },
                    ...messages.map(m => ({
                        role: m.role,
                        parts: [{ text: m.text }]
                    }))
                ],
            });

            const result = await chat.sendMessage(input);
            const response = await result.response;
            const text = response.text();

            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (error: any) {
            console.error("Original Error Object:", error);
            console.error("Error Details:", error.message || JSON.stringify(error));
            if (error.response) {
                console.error("API Status:", error.response.status);
            }
            // Check if key is loaded (don't log the full key)
            console.log("API Key loaded?", !!API_KEY, "Length:", API_KEY?.length);

            setMessages(prev => [...prev, { role: 'model', text: `Erro: ${error.message || "Falha na conexão"}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xl font-bold mb-4 text-slate-800">Assistente Bíblico</Text>
            <ScrollView className="flex-1 mb-4">
                {messages.map((msg, index) => (
                    <View
                        key={index}
                        className={`p-3 rounded-lg mb-2 max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}
                    >
                        <Text className="text-slate-800">{msg.text}</Text>
                    </View>
                ))}
                {loading && <ActivityIndicator size="small" color="#0000ff" />}
            </ScrollView>
            <View className="flex-row items-center gap-2">
                <TextInput
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2"
                    placeholder="Pergunte sobre a Bíblia..."
                    value={input}
                    onChangeText={setInput}
                />
                <TouchableOpacity
                    onPress={sendMessage}
                    className="bg-blue-600 px-4 py-2 rounded-full"
                >
                    <Text className="text-white font-bold">Enviar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
