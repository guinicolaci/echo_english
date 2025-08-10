// supabase/functions/english-tutor/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { OpenAI } from 'https://deno.land/x/openai/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAI = new OpenAI(Deno.env.get('OPENAI_API_KEY')!);
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    const body = await req.json();

    // Rota: Buscar frase para Pronunciation
    if (body.get_pronunciation_phrase) {
      const completion = await openAI.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: "Provide a single, simple, and common English sentence for pronunciation practice, suitable for an A2-B1 level learner. Just the sentence, no quotes." }],
      });
      const phrase = completion.choices[0].message.content?.trim();
      return new Response(JSON.stringify({ phrase }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rota: Buscar palavra para Vocabulary
    if (body.get_vocabulary_word) {
      // CORREÇÃO: Prompt ajustado para pedir palavras mais amigáveis (nível B1)
      const completion = await openAI.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: `
            You are an English teacher. Provide a single, useful English vocabulary word suitable for an intermediate learner (B1 CEFR level) and its simple definition.
            The word should be common enough to be valuable in everyday conversation.
            Respond ONLY in a valid JSON object with two keys: "word" and "definition".
            Example: {"word": "achieve", "definition": "to succeed in finishing something or reaching an aim"}
          ` }],
          response_format: { type: 'json_object' },
      });
      return new Response(completion.choices[0].message.content, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rota: Buscar imagem para Image Description
    if (body.get_image) {
      if (!unsplashKey) throw new Error("Unsplash API key is not configured in Supabase secrets.");
      
      const unsplashResponse = await fetch(`https://api.unsplash.com/photos/random?orientation=landscape&client_id=${unsplashKey}`);
      if (!unsplashResponse.ok) throw new Error(`Unsplash API error: ${unsplashResponse.statusText}`);
      const imageData = await unsplashResponse.json();

      const finalResponse = {
        url: imageData.urls.regular,
        photographer: imageData.user.name,
        link: imageData.links.html,
      };
      
      return new Response(JSON.stringify(finalResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rota Principal: Análise de áudio
    const { audioBase64, type, targetData, imageUrl } = body;
    if (!audioBase64) throw new Error("Audio not provided.");

    const audioBlob = await (await fetch(`data:audio/webm;base64,${audioBase64}`)).blob();
    const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    const transcription = await openAI.audio.transcriptions.create({ file: audioFile, model: 'whisper-1', language: 'en' });
    const userPhrase = transcription.text.trim();
    
    if (!userPhrase) {
      return new Response(JSON.stringify({ error: "We didn't hear anything. Please try speaking clearly." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let chatRequest: any;

    switch (type) {
      case 'image':
        if (!imageUrl) throw new Error("Image URL not provided for image description task.");
        
        chatRequest = {
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: `You are an expert English teacher. Your task is to:
                      1. Generate a detailed description of the provided image (2-3 sentences)
                      2. Provide 3 vocabulary words related to the image with simple definitions
                      
                      Respond ONLY with valid JSON in this exact format:
                      {
                        "description": "Your detailed description here",
                        "vocabulary": [
                          {"word": "word1", "definition": "simple definition"},
                          {"word": "word2", "definition": "simple definition"},
                          {"word": "word3", "definition": "simple definition"}
                        ]
                      }`
          }, {
            role: 'user',
            content: [{
              type: 'image_url',
              image_url: { url: imageUrl },
            }]
          }],
          response_format: { type: 'json_object' }
        };
        break;
      
      default:
        let prompt = '';
        switch (type) {
          case 'pronunciation':
            prompt = `You are an expert English pronunciation coach. The user was trying to say: "${targetData}". Their attempt was: "${userPhrase}". Analyze their attempt. Respond ONLY with a valid JSON object with a single key: "feedback".`;
            break;
          case 'vocabulary':
            prompt = `The user was given the word "${targetData}" and said: "${userPhrase}". Is this a correct use of the word? Provide feedback on grammar and context. Respond in a JSON object with keys "correctedPhrase" and "feedback".`;
            break;
          default: // Conversation
            prompt = `Analyze this user's phrase: "${userPhrase}". Correct grammatical errors and provide helpful feedback. Respond in a JSON object with keys "correctedPhrase" and "feedback".`;
            break;
        }
        chatRequest = {
          model: 'gpt-4o',
          messages: [{ role: 'system', content: prompt }],
          response_format: { type: 'json_object' }
        };
        break;
    }
    
    const chatCompletion = await openAI.chat.completions.create(chatRequest);
    
    const aiResponseContent = chatCompletion.choices[0].message.content;
    if (!aiResponseContent) {
      throw new Error("AI did not return a response. Please try again.");
    }

    let aiJson;
    try {
      aiJson = JSON.parse(aiResponseContent);
      
      // Verificação rigorosa para resposta de imagem
      if (type === 'image') {
        if (!aiJson.description || typeof aiJson.description !== 'string') {
          throw new Error("Missing or invalid description");
        }
        
        if (!aiJson.vocabulary || !Array.isArray(aiJson.vocabulary)) {
          throw new Error("Missing or invalid vocabulary");
        }
        
        for (const item of aiJson.vocabulary) {
          if (!item.word || !item.definition) {
            throw new Error("Invalid vocabulary item");
          }
        }
      }
    } catch (e) {
      console.error("AI response parsing failed:", e.message, "Content:", aiResponseContent);
      throw new Error("We had trouble understanding the AI's response. Please try again.");
    }

    // Para o tipo 'image', retornamos o JSON da IA diretamente
    if (type === 'image') {
      return new Response(JSON.stringify({
        originalPhrase: userPhrase,
        ...aiJson
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const correctedPhrase = aiJson.correctedPhrase || targetData;
    const feedback = aiJson.feedback;

    if (!correctedPhrase || correctedPhrase.trim() === "") {
        throw new Error("The AI returned an empty corrected phrase.");
    }

    const ttsResponse = await openAI.audio.speech.create({ 
      model: "tts-1", voice: "nova", input: correctedPhrase, response_format: "mp3" 
    });
    
    const audioBuffer = await ttsResponse.arrayBuffer();
    const correctedAudioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    const result = { originalPhrase: userPhrase, correctedPhrase, feedback, correctedAudioBase64 };
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});