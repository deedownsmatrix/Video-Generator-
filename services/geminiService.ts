
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Persona, SlideData } from "../types";

export class GeminiService {
  private static ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  static async generatePresentationScripts(
    slides: { base64: string }[],
    persona: Persona
  ): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const personaInstructions = {
      CEO: "professional, visionary, strategic, and high-level.",
      Scientist: "analytical, detail-oriented, precise, and evidence-based.",
      Teacher: "engaging, clear, educational, and patient."
    };

    const prompt = `Analyze these ${slides.length} slides from a presentation. For each slide, write a speaker script that sounds like a ${personaInstructions[persona]}. 
    Ensure transitions between slides are seamless (e.g., "Now, turning our attention to...").
    Return the response as a JSON array of strings, where each string is the script for that slide index.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        {
          parts: [
            ...slides.map(s => ({ inlineData: { mimeType: 'image/jpeg', data: s.base64 } })),
            { text: prompt }
          ]
        }
      ],
      config: {
        thinkingConfig: { thinkingBudget: 12000 }, // High reasoning mode
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse script JSON", e);
      return slides.map((_, i) => `Slide ${i + 1} narration.`);
    }
  }

  static async generateCaptions(script: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `Summarize this presentation script into a single, punchy, 1-line caption for a video subtitle: "${script}"`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return response.text?.trim() || "Presentation Slide";
  }

  static async generateAudio(script: string, voiceName: string = 'Kore'): Promise<{ audioBlob: Blob; duration: number }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");

    const audioBytes = this.decodeBase64(base64Audio);
    
    // We must convert raw PCM to WAV for the browser <audio> element to support it.
    const wavBlob = this.pcmToWav(audioBytes, 24000);
    
    // Calculate duration for timing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await this.decodeAudioData(audioBytes, audioContext, 24000, 1);
    
    return { audioBlob: wavBlob, duration: buffer.duration };
  }

  private static pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 32 + pcmData.length, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count (1 = Mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    // write the PCM data
    for (let i = 0; i < pcmData.length; i++) {
      view.setUint8(44 + i, pcmData[i]);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private static decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private static async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
