'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, StopCircle, Loader2, Wand2, Volume2, History } from 'lucide-react';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';

interface IAResult {
  originalPhrase: string;
  correctedPhrase: string;
  feedback: string;
  correctedAudioBase64: string;
}

interface PracticeSession {
  user_id: number;
  created_at: string;
  original_phrase: string;
  feedback: string;
  corrected_phrase: string;
}

export default function EnglishTutorPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<IAResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [topic, setTopic] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load history from database
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('user_id, created_at, original_phrase, feedback, corrected_phrase')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("History Error", {
        description: "Failed to load practice history.",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Toggle history view
  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  // Save session to database
  const saveSessionToDB = async (sessionData: any) => {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert([
          {
            original_phrase: sessionData.originalPhrase,
            corrected_phrase: sessionData.correctedPhrase,
            feedback: sessionData.feedback,
            original_audio_url: sessionData.originalAudioUrl,
            corrected_audio_url: sessionData.correctedAudioUrl
          }
        ]);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error("Database Error", {
        description: "Failed to save your practice session to database",
      });
      return null;
    }
  };

  // Upload audio to storage
  const uploadAudioToStorage = async (audioBlob: Blob, fileName: string) => {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('audio-recordings')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(data.path);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error("Storage Error", {
        description: `Failed to upload audio: ${error.message}`,
      });
      return null;
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setIsLoading(true);
          setResult(null);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          const originalAudioUrl = await uploadAudioToStorage(audioBlob, 'original-recording.webm');
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];

            if (!base64Audio) {
              toast.error("Error", { description: "Failed to convert audio." });
              setIsLoading(false);
              return;
            }

            try {
              const { data, error } = await supabase.functions.invoke('english-tutor', {
                body: { audioBase64: base64Audio },
              });

              if (error) {
                console.error('Function error:', error);
                let errorMessage = error.message;
                try {
                  const errorData = JSON.parse(errorMessage);
                  if (errorData.error) errorMessage = errorData.error;
                } catch (e) {}
                toast.error("Analysis Error", { 
                  description: errorMessage || "Failed to get AI response."
                });
              } else {
                setResult(data);
                
                const correctedAudioBlob = base64ToBlob(data.correctedAudioBase64, 'audio/mpeg');
                const correctedAudioUrl = await uploadAudioToStorage(correctedAudioBlob, 'corrected-audio.mp3');
                
                await saveSessionToDB({
                  originalPhrase: data.originalPhrase,
                  correctedPhrase: data.correctedPhrase,
                  feedback: data.feedback,
                  originalAudioUrl: originalAudioUrl,
                  correctedAudioUrl: correctedAudioUrl
                });
              }
            } catch (error) {
              console.error('Invocation error:', error);
              toast.error("API Error", { 
                description: error.message || "Error calling function." 
              });
            } finally {
              setIsLoading(false);
            }
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast("Recording...", { description: "Speak now. Click again to stop." });
      } catch (error) {
        console.error("Microphone error:", error);
        toast.error("Microphone Error", {
          description: "Failed to access microphone.",
        });
      }
    }
  };
  
  // Convert base64 to Blob
  const base64ToBlob = (base64: string, contentType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
  };
  
  const handleGetSuggestions = async () => {
    setIsSuggesting(true);
    setSuggestions(["Generating diverse phrases..."]);
    
    try {
      const { data, error } = await supabase.functions.invoke('english-tutor', {
        body: { getSuggestion: true, topic },
      });

      if (error || !data || !data.suggestions) {
        toast.error("Error", { description: "Failed to get suggestions." });
        setSuggestions([]);
      } else {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      toast.error("Error", { description: "Failed to get suggestions." });
    } finally {
      setIsSuggesting(false);
    }
  }

  const playCorrectedAudio = () => {
    if (result?.correctedAudioBase64) {
      const audioSrc = `data:audio/mpeg;base64,${result.correctedAudioBase64}`;
      const audio = new Audio(audioSrc);
      audio.play();
    }
  }

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-12 md:p-24 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            EchoEnglish AI
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Practice your speaking and get instant corrections
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your Practice Session</CardTitle>
              <Button onClick={toggleHistory} variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a topic (optional)"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button 
                  onClick={handleGetSuggestions} 
                  variant="outline" 
                  size="sm" 
                  disabled={isLoading || isSuggesting}
                >
                  {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Suggest Phrases
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {suggestions.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Practice Suggestions:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isRecording ? "Click to stop recording" : "Click to start recording"}
              </p>
              <Button
                onClick={handleToggleRecording}
                disabled={isLoading}
                size="lg"
                className={`w-24 h-24 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-sky-500 hover:bg-sky-600'}`}
              >
                {isRecording ? <StopCircle size={40} /> : <Mic size={40} />}
              </Button>
            </div>
            
            {(isLoading || result) && (
              <div className="space-y-4 pt-4 border-t">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    <p>Analyzing your audio...</p>
                  </div>
                )}

                {result && !isLoading && (
                  <div className="space-y-4 animate-in fade-in-50 duration-500">
                    <div>
                      <label className="text-sm font-medium text-slate-800 dark:text-slate-200">You said:</label>
                      <Textarea readOnly value={result.originalPhrase} className="mt-1 h-20" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Feedback:</label>
                      <Textarea readOnly value={result.feedback} className="mt-1 h-32" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Corrected:</label>
                      <p className="mt-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                        {result.correctedPhrase}
                      </p>
                    </div>
                    <Button onClick={playCorrectedAudio} variant="secondary" className="w-full">
                      <Volume2 className="mr-2 h-4 w-4" />
                      Listen to Pronunciation
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Panel */}
        {showHistory && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Practice History</CardTitle>
              <CardDescription>Your recent practice sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No practice history yet</p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {history.map((session) => (
                    <div key={session.user_id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-slate-500">{formatDate(session.created_at)}</p>
                          <p className="font-medium mt-1">"{session.original_phrase}"</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm"><span className="font-medium">Feedback:</span> {session.feedback}</p>
                        <p className="text-sm mt-1"><span className="font-medium">Corrected:</span> {session.corrected_phrase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}