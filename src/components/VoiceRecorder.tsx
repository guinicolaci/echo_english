'use client';

import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  isLoading: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, isLoading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          onRecordingComplete(base64String);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access the microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
        <p className="text-lg text-gray-600">Analyzing your voice...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-24 h-24 rounded-full transition-all duration-300 ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isRecording ? (
          <StopCircle className="h-10 w-10" />
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </Button>
      <p className="mt-4 text-gray-500">
        {isRecording ? 'Recording... Click to stop.' : 'Click to start recording.'}
      </p>
    </div>
  );
}