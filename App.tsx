
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import type { ChatMessage, LoadingState } from './types';
import { generateMeditationImage, generateMeditationAudio, generateImagePrompt } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import ChatBubble from './components/ChatBubble';
import LoadingSpinner from './components/LoadingSpinner';
import { SendIcon, PlayIcon, PauseIcon, SparklesIcon } from './components/Icons';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<LoadingState>({ script: false, image: false, audio: false });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are a compassionate and creative guide for meditation. Generate a soothing, descriptive, and easy-to-follow meditation script based on the user\'s request. The script should be concise, around 150-200 words. Do not add any introductory or concluding remarks outside of the script itself.',
        },
      });
      setChat(newChat);
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } catch(e) {
      console.error("Initialization failed:", e);
      // Handle API key error gracefully in a real app
    }

    setMessages([{
        role: 'model',
        content: 'Welcome to Serene AI. How can I help you find your calm today? You can ask for a meditation on a topic like "stress relief" or "finding focus".'
    }]);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || !chat || Object.values(loading).some(v => v)) return;

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setLoading({ script: true, image: true, audio: true });
    setAudioBuffer(null);
    setIsPlaying(false);
    
    try {
      // 1. Generate Meditation Script
      const scriptResponse = await chat.sendMessage({ message: userInput });
      const scriptText = scriptResponse.text;
      const modelMessage: ChatMessage = { role: 'model', content: scriptText };
      setMessages(prev => [...prev, modelMessage]);
      setLoading(prev => ({ ...prev, script: false }));

      // 2. Generate Image and Audio in parallel
      const imagePromptPromise = generateImagePrompt(scriptText);
      const audioPromise = generateMeditationAudio(scriptText);

      const imagePrompt = await imagePromptPromise;
      if (imagePrompt) {
          const imageData = await generateMeditationImage(imagePrompt);
          if (imageData) {
              setImageUrl(`data:image/jpeg;base64,${imageData}`);
          }
      }
      setLoading(prev => ({ ...prev, image: false }));

      const audioData = await audioPromise;
      if (audioData && audioContextRef.current) {
        const decoded = decode(audioData);
        const buffer = await decodeAudioData(decoded, audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
      }
      setLoading(prev => ({ ...prev, audio: false }));
    } catch (error) {
      console.error('An error occurred:', error);
      const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
      setLoading({ script: false, image: false, audio: false });
    }
  }, [userInput, chat, loading]);

  const handlePlayPause = () => {
    if (!audioContextRef.current || !audioBuffer) return;

    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      audioSourceRef.current = source;
      setIsPlaying(true);
    }
  };

  const isGenerating = Object.values(loading).some(v => v);

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-gray-900 text-gray-200">
      <main className="flex-1 flex flex-col p-4 md:p-6 h-full relative">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center gap-2">
            <SparklesIcon />
            Serene AI
          </h1>
          <p className="text-gray-400">Your Personal Guided Meditation Generator</p>
        </header>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-800/50 rounded-lg space-y-4 scroll-smooth">
          {messages.map((msg, index) => (
            <ChatBubble key={index} message={msg} />
          ))}
          {isGenerating && <div className="flex justify-center"><LoadingSpinner /></div>}
        </div>

        <div className="flex items-center gap-2 mt-auto">
           <div className="relative flex-grow">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
              placeholder="e.g., a meditation to release anxiety..."
              className="w-full pl-4 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || !userInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
            >
              <SendIcon />
            </button>
           </div>
          {audioBuffer && (
            <button 
              onClick={handlePlayPause}
              className={`p-3 rounded-full text-white transition duration-200 ${isPlaying ? 'bg-purple-600 hover:bg-purple-500' : 'bg-green-600 hover:bg-green-500'}`}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
        </div>
      </main>

      <aside className="w-full md:w-1/3 lg:w-2/5 xl:w-1/2 bg-gray-900 flex items-center justify-center p-4 md:p-6">
        <div className="w-full h-64 md:h-full aspect-square relative bg-gray-800 rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
            {loading.image ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <LoadingSpinner />
                    <p>Generating serene visuals...</p>
                </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Generated meditation visual" className="w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-100" />
            ) : (
                <div className="text-center text-gray-500 p-4">
                    <SparklesIcon className="mx-auto h-12 w-12 mb-2" />
                    <p>Your calming visual will appear here.</p>
                </div>
            )}
        </div>
      </aside>
    </div>
  );
};

export default App;
