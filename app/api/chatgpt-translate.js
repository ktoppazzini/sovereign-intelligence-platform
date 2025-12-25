import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { language } = await request.json();

    // Replace with your actual OpenAI call if needed
    const translations = {
      welcome: language === 'fr' ? 'Bienvenue' : 'Welcome',
      description:
        language === 'fr' ? 'Ceci est une application multilingue.' : 'This is a multilingual app.',
    };

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Translation failed.' }, { status: 500 });
  }
}
