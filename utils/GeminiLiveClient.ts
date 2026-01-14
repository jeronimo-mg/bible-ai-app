export type LiveClientEvents = {
    onOpen?: () => void;
    onClose?: (event: WebSocketCloseEvent) => void;
    onError?: (error: WebSocketErrorEvent) => void;
    onMessage?: (text: string, isFinal: boolean) => void;
    onAudioData?: (base64Data: string) => void;
};

export class GeminiLiveClient {
    private ws: WebSocket | null = null;
    private url: string;
    private callbacks: LiveClientEvents = {};
    private isConnected = false;
    private apiKey: string;

    constructor(apiKey: string, callbacks: LiveClientEvents) {
        this.apiKey = apiKey;
        // Use v1beta as per user's working script
        this.url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        this.callbacks = callbacks;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("WebSocket Connected");
            this.isConnected = true;
            this.sendSetup();
            if (this.callbacks.onOpen) this.callbacks.onOpen();
        };

        this.ws.onclose = (e) => {
            console.log("WebSocket Closed", e.code, e.reason);
            this.isConnected = false;
            if (this.callbacks.onClose) this.callbacks.onClose(e);
        };

        this.ws.onerror = (e) => {
            console.error("WebSocket Error", e);
            if (this.callbacks.onError) this.callbacks.onError(e);
        };

        this.ws.onmessage = (e) => {
            this.handleMessage(e.data);
        };
    }

    private sendSetup() {
        const setupMessage = {
            setup: {
                model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                generation_config: {
                    // Script uses AUDIO but also handles text. 
                    // To avoid "Cannot extract voices" error, we MUST include AUDIO or speech config.
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: "Zephyr"
                            }
                        }
                    }
                }
            }
        };
        console.log("Sending Setup:", JSON.stringify(setupMessage));
        this.sendJson(setupMessage);
    }

    sendText(text: string) {
        if (!this.isConnected) {
            console.warn("WebSocket not connected. Trying to connect...");
            this.connect();
            return;
        }

        const msg = {
            client_content: {
                turns: [
                    {
                        role: "user",
                        parts: [{ text: text }]
                    }
                ],
                turn_complete: true
            }
        };
        this.sendJson(msg);
    }

    private sendJson(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private handleMessage(data: string | ArrayBuffer) {
        if (data instanceof Blob) {
            return;
        }

        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);

                // Handle Server Content
                if (parsed.serverContent) {
                    const parts = parsed.serverContent.modelTurn?.parts;
                    if (parts && parts.length > 0) {
                        // Check for Text
                        if (parts[0].text) {
                            if (this.callbacks.onMessage) {
                                this.callbacks.onMessage(parts[0].text, parsed.serverContent.turnComplete || false);
                            }
                        }
                        // Check for Inline Data (Audio)
                        if (parts[0].inlineData) {
                            console.log("Received Audio Data chunk");
                            if (this.callbacks.onAudioData) {
                                this.callbacks.onAudioData(parts[0].inlineData.data);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error parsing WS message", err);
            }
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
