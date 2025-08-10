// src/components/HistoryDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { fetchUserHistory } from '@/lib/supabase';
import { Volume2, Loader2, AlertTriangle } from 'lucide-react';

// Definindo um tipo para os itens do histórico para melhor autocompletar
type HistoryItem = {
  id: string;
  created_at: string;
  original_phrase: string;
  corrected_phrase: string;
  feedback: string;
  corrected_audio_url: string;
};

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoryDialog({ open, onOpenChange }: HistoryDialogProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Busca o histórico apenas quando o diálogo é aberto
    if (open) {
      const loadHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchUserHistory();
          setHistory(data as HistoryItem[]);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch history.');
        } finally {
          setIsLoading(false);
        }
      };
      loadHistory();
    }
  }, [open]); // A dependência [open] garante que isso rode toda vez que o diálogo abrir

  const handlePlayAudio = (audioUrl: string) => {
    // A LÓGICA CORRETA: Simplesmente crie um novo objeto de Áudio com a URL pública
    try {
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (e) {
      console.error("Error playing audio:", e);
      alert("Could not play the audio file.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Practice History</DialogTitle>
          <DialogDescription>
            Here you can review your past practice items and listen to the corrected audio.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 border rounded-md">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          )}
          {error && (
             <div className="flex flex-col items-center justify-center h-full text-red-500">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Error: {error}</p>
            </div>
          )}
          {!isLoading && !error && history.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No practice history found.</p>
            </div>
          )}
          {!isLoading && !error && (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  <p className="mb-1">
                    <span className="font-semibold">You said:</span> "{item.original_phrase}"
                  </p>
                  <p className="text-green-700">
                    <span className="font-semibold">Correction:</span> "{item.corrected_phrase}"
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md flex-1">
                      <span className="font-semibold">Feedback:</span> {item.feedback}
                    </p>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="ml-4"
                      onClick={() => handlePlayAudio(item.corrected_audio_url)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}