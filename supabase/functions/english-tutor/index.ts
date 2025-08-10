import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { OpenAI } from 'https://deno.land/x/openai/mod.ts';

// CORS headers configuration to allow cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Main server function handling all API routes
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize OpenAI client with API key from environment variables
    const openAI = new OpenAI(Deno.env.get('OPENAI_API_KEY')!);
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    const body = await req.json();

    // Route: Get pronunciation practice phrase
    if (body.get_pronunciation_phrase) {
      const completion = await openAI.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ 
          role: 'system', 
          content: `Generate a SIMPLE English sentence for pronunciation practice about everyday life or technology with:
         1. ONLY basic vocabulary (A1-A2 level), including common IT words.
         2. 12-18 words long.
         3. Topics about common daily routines or simple tech tasks.
         4. A natural and grammatically correct structure.
         5. NO repetition from previous sentences.
         6. Structure: Subject + verb + object + place/time.
         
         Examples:
         - "He needs to charge his new phone before he goes to the office."
         - "My sister is watching a video about cooking on her tablet in the kitchen."
         - "I always check my email when I turn on my computer in the morning."
         
         Respond ONLY with the sentence, NO additional text or quotes.`
        }],
        temperature: 1.2, 
        top_p: 0.9,
        frequency_penalty: 0.7, 
        presence_penalty: 0.7, 
      });
      
      const phrase = completion.choices[0].message.content?.trim()
        .replace(/^"+|"+$/g, '') // Remove quotes se o modelo adicionar
        .replace(/\.$/, ''); // Remove ponto final se existir

      return new Response(JSON.stringify({ phrase }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Route: Get vocabulary word with definition
    if (body.get_vocabulary_word) {
      const completion = await openAI.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ 
            role: 'system', 
            content: `
              You are an English teacher. Provide a single, useful English vocabulary word suitable for an intermediate learner (B1 CEFR level) and its simple definition.
              The word should be common enough to be valuable in everyday conversation.
              Respond ONLY in a valid JSON object with two keys: "word" and "definition".
              Example: {"word": "achieve", "definition": "to succeed in finishing something or reaching an aim"}
            ` 
          }],
          response_format: { type: 'json_object' },
      });
      return new Response(completion.choices[0].message.content, { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Route: Get random image for description exercise
    if (body.get_image) {
      if (!unsplashKey) throw new Error("Unsplash API key is not configured in Supabase secrets.");
      
      // Fetch random image from Unsplash API
      const unsplashResponse = await fetch(`https://api.unsplash.com/photos/random?orientation=landscape&client_id=${unsplashKey}`);
      if (!unsplashResponse.ok) throw new Error(`Unsplash API error: ${unsplashResponse.statusText}`);
      const imageData = await unsplashResponse.json();

      // Format response with image details
      const finalResponse = {
        url: imageData.urls.regular,
        photographer: imageData.user.name,
        link: imageData.links.html,
      };
      
      return new Response(JSON.stringify(finalResponse), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Main Route: Audio analysis and feedback
    const { audioBase64, type, targetData, imageUrl } = body;
    if (!audioBase64) throw new Error("Audio not provided.");

    // Convert base64 audio to blob for OpenAI processing
    const audioBlob = await (await fetch(`data:audio/webm;base64,${audioBase64}`)).blob();
    const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    // Transcribe audio using Whisper
    const transcription = await openAI.audio.transcriptions.create({ 
      file: audioFile, 
      model: 'whisper-1', 
      language: 'en' 
    });
    const userPhrase = transcription.text.trim();
    
    // Handle empty transcription
    if (!userPhrase) {
      return new Response(JSON.stringify({ 
        error: "We didn't hear anything. Please try speaking clearly." 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let chatRequest: any;

    // Prepare appropriate prompt based on exercise type
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
    
    // Get AI response
    const chatCompletion = await openAI.chat.completions.create(chatRequest);
    
    const aiResponseContent = chatCompletion.choices[0].message.content;
    if (!aiResponseContent) {
      throw new Error("AI did not return a response. Please try again.");
    }

    // Parse and validate AI response
    let aiJson;
    try {
      aiJson = JSON.parse(aiResponseContent);
      
      // Additional validation for image responses
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

    // For image type, return the AI response directly
    if (type === 'image') {
      return new Response(JSON.stringify({
        originalPhrase: userPhrase,
        ...aiJson
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // For other types, get corrected phrase and feedback
    const correctedPhrase = aiJson.correctedPhrase || targetData;
    const feedback = aiJson.feedback;

    if (!correctedPhrase || correctedPhrase.trim() === "") {
        throw new Error("The AI returned an empty corrected phrase.");
    }

    // Generate audio for corrected phrase
    const ttsResponse = await openAI.audio.speech.create({ 
      model: "tts-1", 
      voice: "fable", 
      input: correctedPhrase,
      response_format: "mp3" 
    });
    
    // Convert audio to base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const correctedAudioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    // Prepare final response
    const result = { 
      originalPhrase: userPhrase, 
      correctedPhrase, 
      feedback, 
      correctedAudioBase64 
    };
    
    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});