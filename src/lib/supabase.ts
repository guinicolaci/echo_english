// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'
import { v4 as uuidv4 } from 'uuid';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
const supabase = createClient();

async function uploadAudioToStorage(audioBase64: string, bucket: string): Promise<string> {
  const audioBlob = await (await fetch(`data:audio/webm;base64,${audioBase64}`)).blob();
  const fileName = `${uuidv4()}.webm`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, audioBlob, {
    contentType: 'audio/webm',
    upsert: false,
  });

  if (error) { throw new Error(`Storage Upload Error: ${error.message}`); }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function fetchPronunciationPhrase(): Promise<string> {
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/english-tutor`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ get_pronunciation_phrase: true }),
  });
  if (!response.ok) throw new Error('Failed to fetch a new phrase.');
  const data = await response.json();
  return data.phrase;
}

export async function fetchVocabularyWord(): Promise<{ word: string, definition: string }> {
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/english-tutor`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ get_vocabulary_word: true }),
  });
  if (!response.ok) throw new Error('Failed to fetch vocabulary word.');
  return await response.json();
}

export async function fetchRandomImage(): Promise<{ url: string, photographer: string, link: string }> {
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/english-tutor`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ get_image: true }),
  });
  if (!response.ok) throw new Error('Failed to fetch image.');
  return await response.json();
}

export async function analyzeGrammar(
  audioBase64: string,
  type: string,
  targetData?: any,
  imageUrl?: string
): Promise<{ data: any; error: string | null }> {
  const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/english-tutor`;
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ audioBase64, type, targetData, imageUrl }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      const errorMessage = typeof responseData.error === 'string' ? responseData.error : 'An unknown API error occurred.';
      return { data: null, error: errorMessage };
    }
    
    return { data: responseData, error: null };

  } catch (error: unknown) {
    console.error('Network or parsing error in analyzeGrammar:', error);
    let errorMessage = 'A network error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { data: null, error: errorMessage };
  }
}

export async function saveAnalysisToSupabase(analysisData: {
  original_phrase: string;
  corrected_phrase: string;
  feedback: string;
  original_audio_base64: string;
  corrected_audio_base64: string;
  practice_type: string;
}) {
  try {
    const originalAudioUrl = await uploadAudioToStorage(analysisData.original_audio_base64, 'original-audios');
    const correctedAudioUrl = await uploadAudioToStorage(analysisData.corrected_audio_base64, 'corrected-audios');

    const { data, error } = await supabase
      .from('practice_items')
      .insert([{
        original_phrase: analysisData.original_phrase,
        corrected_phrase: analysisData.corrected_phrase,
        feedback: analysisData.feedback,
        original_audio_url: originalAudioUrl,
        corrected_audio_url: correctedAudioUrl,
        practice_type: analysisData.practice_type
      }])
      .select();

    if (error) { throw new Error(error.message); }
    return data;
  } catch (error: any) {
     throw new Error('Failed to save analysis: ' + error.message);
  }
}

export async function fetchUserHistory() {
  const { data, error } = await supabase
    .from('practice_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { throw new Error(error.message); }
  return data;
}