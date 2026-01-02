import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import { env } from '@/lib/env';
import { CHAT_SYSTEM_INSTRUCTION } from '@/lib/ai-config';

// Validation Schema
const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().default([]),
});

export async function POST(req: Request) {
  try {

    const body = await req.json();
    
    // Validate request body
    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { message, history } = validation.data;

    const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);

    // Updated to gemini-2.0-flash as we are in 2026 and older models are deprecated
    const modelName = 'gemini-2.0-flash';
    console.log('Initializing Gemini Chat with model:', modelName);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
    });

    // Convert history format for Gemini SDK
    // Note: Gemini roles are 'user' and 'model'
    const rawHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const sanitizedHistory: { role: string; parts: { text: string }[] }[] = [];

    // 1. Remove leading 'model' messages (Gemini requirement: history must start with user)
    let startIndex = 0;
    while (startIndex < rawHistory.length && rawHistory[startIndex].role === 'model') {
      startIndex++;
    }

    // 2. Merge consecutive same-role messages (Gemini requirement: alternating roles)
    for (let i = startIndex; i < rawHistory.length; i++) {
      const msg = rawHistory[i];
      const lastMsg = sanitizedHistory[sanitizedHistory.length - 1];

      if (lastMsg && lastMsg.role === msg.role) {
        lastMsg.parts[0].text += "\n" + msg.parts[0].text;
      } else {
        sanitizedHistory.push({
          role: msg.role,
          parts: [{ text: msg.parts[0].text }]
        });
      }
    }

    const chat = model.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    // Return more specific error for debugging
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
