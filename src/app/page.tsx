'use client' // Marks this as a Client Component in Next.js 13+

import React, { useState } from 'react';
// Component imports
import HistoryDialog from '@/components/HistoryDialog';
import VoiceRecorder from '@/components/VoiceRecorder';
// UI component imports from Shadcn
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// Icon imports from Lucide
import { History, RefreshCw } from 'lucide-react';
// Utility functions for Supabase operations
import { 
  fetchPronunciationPhrase, 
  fetchVocabularyWord, 
  fetchRandomImage, 
  analyzeGrammar, 
  saveAnalysisToSupabase 
} from '@/lib/supabase';

/**
 * AnalysisResult Component
 * Displays the results of speech analysis in different formats based on exercise type
 * 
 * @param result - Analysis data from AI
 * @param onPlayAudio - Callback to play corrected audio
 * @param onRetry - Callback to retry recording
 * @param type - Exercise type (image, pronunciation, etc)
 * @param onNewImage - Special callback for image exercises
 */
const AnalysisResult = ({ result, onPlayAudio, onRetry, type, onNewImage }: any) => (
  <div className="text-left">
    {result.error ? (
      // Error display UI
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="font-medium text-red-800">An error occurred</p>
        <p className="text-red-700 mt-1">{result.error}</p>
        <Button className="mt-4 w-full" onClick={onRetry}>Try Again</Button>
      </div>
    ) : type === 'image' ? (
      // Image description exercise results
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
      // Grammar/pronunciation exercise results
      <>
        <div className="mb-4"><h3 className="font-medium mb-2">You said:</h3><div className="bg-gray-50 rounded-lg p-4"><p className="text-gray-700">{result.originalPhrase}</p></div></div>
        <div className="mb-4"><h3 className="font-medium mb-2">Improved version:</h3><div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-green-800 font-medium">{result.correctedPhrase}</p></div></div>
        <div className="mb-4"><h3 className="font-medium mb-2">Feedback:</h3><div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-gray-700">{result.feedback}</p></div></div>
        <div className="grid grid-cols-2 gap-4 mt-6"><Button variant="outline" onClick={onRetry}>Try Again</Button><Button onClick={() => onPlayAudio(result.correctedAudioBase64)}>Listen</Button></div>
      </>
    )}
  </div>
);

/**
 * Main Page Component
 * The home screen of the application showing exercise options
 */
export default function Home() {
  // State management
  const [activeModal, setActiveModal] = useState<string | null>(null);  // Currently active exercise type
  const [isLoading, setIsLoading] = useState(false);                   // Loading state during analysis
  const [isContentLoading, setIsContentLoading] = useState(false);     // Loading state for exercise content
  const [result, setResult] = useState<any>(null);                     // Analysis results
  const [showHistory, setShowHistory] = useState(false);               // Controls history dialog visibility
  
  // Exercise-specific states
  const [pronunciationPhrase, setPronunciationPhrase] = useState('');       // Current pronunciation phrase
  const [vocabularyWord, setVocabularyWord] = useState({ word: '', definition: '' });  // Current vocabulary word
  const [imageData, setImageData] = useState({ url: '', photographer: '', link: '' });  // Current image data

  // Exercise configuration data
  const exercises = [
    { 
      type: 'conversation', 
      title: 'Conversation Practice', 
      description: 'Practice speaking in realistic dialogues.', 
      icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" 
    },
    { 
      type: 'pronunciation', 
      title: 'Pronunciation Guide', 
      description: 'Improve your accent with AI feedback on specific phrases.', 
      icon: "M3 10v4M9 8v8M15 5v14M21 10v4" 
    },
    { 
      type: 'vocabulary', 
      title: 'Vocabulary in Context', 
      description: 'Learn new words by using them in your own sentences.', 
      icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" 
    },
    { 
      type: 'image', 
      title: 'Image Description', 
      description: 'Describe what you see in an image to practice fluency.', 
      icon: "m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0v0Z" 
    },
  ];

  /**
   * Handles card click to open an exercise modal
   * @param modalType - The type of exercise selected
   */
  const handleCardClick = async (modalType: string) => {
    setActiveModal(modalType);
    setResult(null);
    setIsContentLoading(true);

    try {
      // Fetch exercise-specific content
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

  /** Fetches a new image for image description exercises */
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

  /**
   * Handles audio analysis after recording
   * @param audioBase64 - Recorded audio in base64 format
   */
  const handleAnalyze = async (audioBase64: string) => {
    setIsLoading(true);
    let targetData;
    let imageUrl;
    
    // Set context data based on exercise type
    if (activeModal === 'pronunciation') targetData = pronunciationPhrase;
    if (activeModal === 'vocabulary') targetData = vocabularyWord.word;
    if (activeModal === 'image') imageUrl = imageData.url;

    try {
      // Send audio to OpenAI for analysis
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

      // Validate image analysis response
      if (activeModal === 'image') {
        if (!analysis.description || !analysis.vocabulary) {
          throw new Error("Invalid response from AI");
        }
      }

      setResult(analysis);
      
      // Save non-image results to Supabase
      await saveAnalysisToSupabase({
        original_phrase: analysis.originalPhrase,
        corrected_phrase: activeModal === 'image' ? analysis.description : analysis.correctedPhrase,
        feedback: activeModal === 'image' ? "Image description exercise" : analysis.feedback,
        original_audio_base64: audioBase64,
        corrected_audio_base64: activeModal === 'image' ? "" : analysis.correctedAudioBase64,
        practice_type: activeModal as string,
      });

    } catch (error: any) {
      console.error('Error in handleAnalyze:', error);
      setResult({ 
        error: "We encountered an issue processing your request. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** Plays audio from base64 encoded string */
  const playAudio = (base64: string) => { 
    const audio = new Audio(`data:audio/mp3;base64,${base64}`); 
    audio.play(); 
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* History Dialog Component */}
      <HistoryDialog open={showHistory} onOpenChange={setShowHistory} />
      
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl mb-4">Refine your English with Echo</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your personal AI English teacher, available anytime. Choose an exercise to get started.
          </p>
        </div>
        
        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {exercises.map((exercise) => (
            <Dialog 
              key={exercise.type} 
              onOpenChange={(open) => { if (!open) setResult(null); }}
            >
              <DialogTrigger asChild onClick={() => handleCardClick(exercise.type)}>
                {/* Exercise Card */}
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
                        className="mx-auto"
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
              
              {/* Exercise Modal */}
              <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">{exercise.title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-6 text-center min-h-[120px] flex flex-col justify-center">
                    {isContentLoading ? (
                      <p className="text-gray-500">Loading exercise...</p>
                    ) : (
                      <>
                        {/* Exercise-specific content */}
                        {activeModal === 'pronunciation' && (
                          <div className="mb-4 text-center">
                            <p>Repeat after me: <b className="text-blue-600">"{pronunciationPhrase}"</b></p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2"
                              onClick={async () => {
                                setIsContentLoading(true);
                                try {
                                  const phrase = await fetchPronunciationPhrase();
                                  setPronunciationPhrase(phrase);
                                } catch (error) {
                                  console.error(error);
                                } finally {
                                  setIsContentLoading(false);
                                }
                              }}
                              disabled={isContentLoading}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              New Phrase
                            </Button>
                          </div>
                        )}
                        {activeModal === 'vocabulary' && (
                          <p>Use the word "<b className="text-blue-600">{vocabularyWord.word}</b>" in a sentence. 
                          <span className="text-gray-500">({vocabularyWord.definition})</span></p>
                        )}
                        {activeModal === 'image' && (
                          <div className="space-y-4">
                            {imageData.url ? (
                              <>
                                <img 
                                  src={imageData.url} 
                                  alt="A random scene for English description practice" 
                                  className="rounded-lg shadow-md" 
                                />
                                <p className="text-center font-semibold mt-4">Describe this image in detail.</p>
                                <p className="text-xs text-center text-gray-500 !mt-2">
                                  Photo by <a href={imageData.link} target="_blank" rel="noopener noreferrer" className="underline">
                                    {imageData.photographer}
                                  </a> on Unsplash
                                </p>
                              </>
                            ) : (
                              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center animate-pulse">
                                <p className="text-gray-500">Loading image...</p>
                              </div>
                            )}
                          </div>
                        )}
                        {activeModal === 'conversation' && (
                          <p>Let's have a conversation! Tell me about your day.</p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Voice Recorder or Results Display */}
                  {!isContentLoading && !result && (
                    <VoiceRecorder 
                      onRecordingComplete={handleAnalyze} 
                      isLoading={isLoading}
                    />
                  )}
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

        {/* History Section */}
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