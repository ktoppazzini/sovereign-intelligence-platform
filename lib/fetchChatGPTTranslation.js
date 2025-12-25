// lib/fetchChatGPTTranslation.js

export default async function fetchChatGPTTranslation(key, targetLang) {
  try {
    const prompt = `Translate the following UI label into ${targetLang}: "${key}"`;
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    return data.translation || key;
  } catch (error) {
    console.error('Translation error:', error);
    return key;
  }
}
