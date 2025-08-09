import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { OpenAI } from 'https://deno.land/x/openai/mod.ts';

serve(async (req) => {
  const openAI = new OpenAI(Deno.env.get('OPENAI_API_KEY')!);

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Logic to get a suggestion
    if (body.getSuggestion) {
      const { topic } = body;
      const completion = await openAI.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
            role: 'system', 
            content: "You are a professional English teacher. Provide 3 diverse English phrases without quotes or additional text for speaking practice."
        }, {
            role: 'user', 
            content: topic ? `Topic: "${topic}"` : "Give me diverse phrases to practice."
        }],
        max_tokens: 500,
        temperature: 0.7,
      });
      const suggestions = completion.choices[0].message.content?.trim().split('\n').filter(s => s.trim());
      return new Response(JSON.stringify({ suggestions }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Main audio analysis logic
    const { audioBase64 } = body;
    if (!audioBase64) throw new Error("Audio not provided.");

    // Convert base64 to Uint8Array
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

    // 1. Transcription with Whisper
    const transcription = await openAI.audio.transcriptions.create({
        file: new File([audioBytes], "audio.webm", { type: "audio/webm" }),
        model: 'whisper-1',
        language: 'en',
    });
    const userPhrase = transcription.text;

    // 2. Correction with GPT - more direct approach
    const prompt = `Correct the following English phrase and provide concise feedback. Be direct and factual.

    Original phrase: "${userPhrase}"
    
    Respond in the following exact format:
    Corrected phrase: [the corrected phrase]
    Feedback: [concise feedback]`;

    const chatCompletion = await openAI.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
    });
    
    const aiResponse = chatCompletion.choices[0].message.content || "";
    let correctedPhrase = "";
    let feedback = "";

    // Parse the response
    const correctedMatch = aiResponse.match(/Corrected phrase:\s*(.+)/i);
    if (correctedMatch) {
      correctedPhrase = correctedMatch[1];
    } else {
      correctedPhrase = aiResponse.split('\n')[0];
    }

    const feedbackMatch = aiResponse.match(/Feedback:\s*([\s\S]*)/i);
    if (feedbackMatch) {
      feedback = feedbackMatch[1];
    } else {
      feedback = aiResponse.split('\n').slice(1).join('\n');
    }

    // 3. Generate TTS audio
    const ttsResponse = await openAI.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: correctedPhrase,
        response_format: "mp3"
    });
    
    // Convert audio to base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const correctedAudioBase64 = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );
    
    const result = {
        originalPhrase: userPhrase,
        correctedPhrase: correctedPhrase.trim(),
        feedback: feedback.trim() || "No feedback needed.",
        correctedAudioBase64,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});