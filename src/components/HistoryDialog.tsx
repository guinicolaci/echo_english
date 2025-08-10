'use client'; 

import React, { useState, useEffect } from 'react';
// UI Components imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
// Data fetching utility
import { fetchUserHistory } from '@/lib/supabase';
// Icons from Lucide
import { Volume2, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Type definition for history items to enable better TypeScript support
 */
type HistoryItem = {
  id: string;
  created_at: string;
  original_phrase: string;
  corrected_phrase: string;
  feedback: string;
  corrected_audio_url: string;
};

interface HistoryDialogProps {
  open: boolean; // Controls dialog visibility
  onOpenChange: (open: boolean) => void; // Callback for state changes
}

/**
 * HistoryDialog Component
 * Displays a modal with user's practice history including:
 * - Original phrases
 * - Corrected versions
 * - AI feedback
 * - Audio playback functionality
 */
export default function HistoryDialog({ open, onOpenChange }: HistoryDialogProps) {
  // State management
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches user history when dialog opens
   */
  useEffect(() => {
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
  }, [open]); // Dependency ensures this runs every time dialog opens

  /**
   * Handles audio playback from URL
   * @param audioUrl - The publicly accessible audio URL
   */
  const handlePlayAudio = (audioUrl: string) => {
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
            Review your past practice items and listen to corrected audio versions.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <ScrollArea className="h-[60vh] p-4 border rounded-md">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Error: {error}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && history.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No practice history found.</p>
            </div>
          )}

          {/* Success state - History items list */}
          {!isLoading && !error && (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  {/* Timestamp */}
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(item.created_at).toLocaleString()}
                  </p>

                  {/* Original phrase */}
                  <p className="mb-1">
                    <span className="font-semibold">You said:</span> "{item.original_phrase}"
                  </p>

                  {/* Corrected phrase */}
                  <p className="text-green-700">
                    <span className="font-semibold">Correction:</span> "{item.corrected_phrase}"
                  </p>

                  {/* Feedback and audio controls */}
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md flex-1">
                      <span className="font-semibold">Feedback:</span> {item.feedback}
                    </p>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="ml-4"
                      onClick={() => handlePlayAudio(item.corrected_audio_url)}
                      aria-label="Play corrected audio"
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