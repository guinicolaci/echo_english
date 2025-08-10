// src/app/page.tsx
'use client'

import React, { useState } from 'react';
import HistoryDialog from '@/components/HistoryDialog';
import VoiceRecorder from '@/components/VoiceRecorder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, RefreshCw } from 'lucide-react';
import { fetchPronunciationPhrase, fetchVocabularyWord, fetchRandomImage, analyzeGrammar, saveAnalysisToSupabase } from '@/lib/supabase';

const AnalysisResult = ({ result, onPlayAudio, onRetry, type, onNewImage }: any) => (
  <div className="text-left">
    {result.error ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="font-medium text-red-800">An error occurred</p>
        <p className="text-red-700 mt-1">{result.error}</p>
        <Button className="mt-4 w-full" onClick={onRetry}>Try Again</Button>
      </div>
    ) : type === 'image' ? (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="font-medium mb-2">You said:</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">{result.originalPhrase}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium mb-2">Image Description:</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{result.description}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Vocabulary Builder:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {result.vocabulary.map((item: any, index: number) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-semibold">{item.word}</p>
                <p className="text-sm">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
          <Button onClick={onNewImage}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Describe Another Image
          </Button>
        </div>
      </div>
    ) : (
      <>
        <div className="mb-4"><h3 className="font-medium mb-2">You said:</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-gray-700">{result.originalPhrase}</p></div></div>
        <div className="mb-4"><h3 className="font-medium mb-2">Improved version:</h3><div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-green-800 font-medium">{result.correctedPhrase}</p></div></div>
        <div className="mb-4"><h3 className="font-medium mb-2">Feedback:</h3><div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-gray-700">{result.feedback}</p></div></div>
        <div className="grid grid-cols-2 gap-4 mt-6"><Button variant="outline" onClick={onRetry}>Try Again</Button><Button onClick={() => onPlayAudio(result.correctedAudioBase64)}>Listen</Button></div>
      </>
    )}
  </div>
);

export default function Home() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [pronunciationPhrase, setPronunciationPhrase] = useState('');
  const [vocabularyWord, setVocabularyWord] = useState({ word: '', definition: '' });
  const [imageData, setImageData] = useState({ url: '', photographer: '', link: '' });

  const exercises = [
    { type: 'conversation', title: 'Conversation Practice', description: 'Practice speaking in realistic dialogues.', icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { type: 'pronunciation', title: 'Pronunciation Guide', description: 'Improve your accent with AI feedback on specific phrases.', icon: "M3 10v4M9 8v8M15 5v14M21 10v4" },
    { type: 'vocabulary', title: 'Vocabulary in Context', description: 'Learn new words by using them in your own sentences.', icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" },
    { type: 'image', title: 'Image Description', description: 'Describe what you see in an image to practice fluency.', icon: "m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0v0Z" },
  ];

  const handleCardClick = async (modalType: string) => {
    setActiveModal(modalType);
    setResult(null);
    setIsContentLoading(true);

    try {
      if (modalType === 'pronunciation') {
        setPronunciationPhrase('Loading a new phrase...');
        const phrase = await fetchPronunciationPhrase();
        setPronunciationPhrase(phrase);
      } else if (modalType === 'vocabulary') {
        setVocabularyWord({ word: 'Loading...', definition: '...' });
        const vocab = await fetchVocabularyWord();
        setVocabularyWord(vocab);
      } else if (modalType === 'image') {
        setImageData({ url: '', photographer: 'Loading...', link: '' });
        const imageInfo = await fetchRandomImage();
        setImageData(imageInfo);
      }
    } catch (error) {
      console.error(error);
      setResult({ error: `Failed to load exercise content. Please try again.` });
    } finally {
      setIsContentLoading(false);
    }
  };

  const handleNewImage = async () => {
    setResult(null);
    setIsContentLoading(true);
    
    try {
      setImageData({ url: '', photographer: 'Loading...', link: '' });
      const imageInfo = await fetchRandomImage();
      setImageData(imageInfo);
    } catch (error) {
      console.error(error);
      setResult({ error: `Failed to load new image. Please try again.` });
    } finally {
      setIsContentLoading(false);
    }
  };

  const handleAnalyze = async (audioBase64: string) => {
    setIsLoading(true);
    let targetData;
    let imageUrl;
    
    if (activeModal === 'pronunciation') targetData = pronunciationPhrase;
    if (activeModal === 'vocabulary') targetData = vocabularyWord.word;
    if (activeModal === 'image') imageUrl = imageData.url;

    try {
      const { data: analysis, error } = await analyzeGrammar(
        audioBase64, 
        activeModal!, 
        targetData, 
        imageUrl
      );

      if (error) {
        console.error('Error from analyzeGrammar:', error);
        setResult({ error: error });
        setIsLoading(false);
        return;
      }

      if (activeModal === 'image') {
        if (!analysis.description || !analysis.vocabulary) {
          throw new Error("Invalid response from AI");
        }
      }

      setResult(analysis);
      
      if (activeModal !== 'image') {
        await saveAnalysisToSupabase({
            original_phrase: analysis.originalPhrase,
            corrected_phrase: analysis.correctedPhrase,
            feedback: analysis.feedback,
            original_audio_base64: audioBase64,
            corrected_audio_base64: analysis.correctedAudioBase64,
            practice_type: activeModal as string,
        });
      }
    } catch (error: any) {
        console.error('Error in handleAnalyze:', error);
        setResult({ 
          error: "We encountered an issue processing your request. Please try again." 
        });
    } finally {
        setIsLoading(false);
    }
  };

  const playAudio = (base64: string) => { 
    const audio = new Audio(`data:audio/mp3;base64,${base64}`); 
    audio.play(); 
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <HistoryDialog open={showHistory} onOpenChange={setShowHistory} />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">Refine your English with Echo</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Your personal AI English teacher, available anytime. Choose an exercise to get started.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {exercises.map((exercise) => (
            <Dialog key={exercise.type} onOpenChange={(open) => { if (!open) setResult(null); }}>
              <DialogTrigger asChild onClick={() => handleCardClick(exercise.type)}>
                <Card className="h-full flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow duration-300 group">
                  <CardHeader className="flex flex-col items-center gap-4 w-full">
                    <div className="w-10 h-10 rounded-full bg-black flex-shrink-0 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                      <svg 
                        width={20} 
                        height={20} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="mx-auto" // Centraliza o SVG dentro do círculo
                      >
                        <path d={exercise.icon} />
                      </svg>
                    </div>
                    <CardTitle className="text-center">{exercise.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600">{exercise.description}</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-2xl text-center">{exercise.title}</DialogTitle></DialogHeader>
                <div className="py-4">
                  <div className="mb-6 text-center min-h-[120px] flex flex-col justify-center">
                    {isContentLoading ? (
                      <p className="text-gray-500">Loading exercise...</p>
                    ) : (
                      <>
                        {activeModal === 'pronunciation' && (<p>Repeat after me: <b className="text-blue-600">"{pronunciationPhrase}"</b></p>)}
                        {activeModal === 'vocabulary' && (<p>Use the word "<b className="text-blue-600">{vocabularyWord.word}</b>" in a sentence. <span className="text-gray-500">({vocabularyWord.definition})</span></p>)}
                        {activeModal === 'image' && (
                          <div className="space-y-4">
                            {imageData.url ? (
                              <>
                                <img src={imageData.url} alt="A random scene for English description practice" className="rounded-lg shadow-md" />
                                <p className="text-center font-semibold mt-4">Describe this image in detail.</p>
                                <p className="text-xs text-center text-gray-500 !mt-2">Photo by <a href={imageData.link} target="_blank" rel="noopener noreferrer" className="underline">{imageData.photographer}</a> on Unsplash</p>
                              </>
                            ) : (
                              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center animate-pulse">
                                <p className="text-gray-500">Loading image...</p>
                              </div>
                            )}
                          </div>
                        )}
                        {activeModal === 'conversation' && (<p>Let's have a conversation! Tell me about your day.</p>)}
                      </>
                    )}
                  </div>
                  {!isContentLoading && !result && (<VoiceRecorder onRecordingComplete={handleAnalyze} isLoading={isLoading}/>)}
                  {result && (
                    <AnalysisResult 
                      result={result} 
                      onPlayAudio={playAudio} 
                      onRetry={() => setResult(null)}
                      onNewImage={handleNewImage}
                      type={activeModal}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>

        <div className="text-center border-t pt-12">
            <h3 className="text-2xl font-light mb-6">Review Your Progress</h3>
            <div className="max-w-md mx-auto">
                <Card className="text-left !flex-row items-center p-4">
                    <CardHeader className="flex-grow p-2">
                        <CardTitle>Practice History</CardTitle>
                        <CardDescription>Review past sessions and track your improvement.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2">
                        <Button onClick={() => setShowHistory(true)}>
                            <History className="mr-2 h-4 w-4" /> Open
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}