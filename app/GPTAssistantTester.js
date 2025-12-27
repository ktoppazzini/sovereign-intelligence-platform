'use client';

import { useState } from 'react';
import { useGPTAssist } from './assistant/useGPTAssist';

export default function GPTAssistantTester() {
  const [input, setInput] = useState('');
  const { askAssistant, response, loading, error } = useGPTAssist();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    await askAssistant([{ role: 'user', content: input }]);
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>

      <h1>Ask Sovereign GPT Assistant</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={{ padding: '0.5rem', width: '70%' }}
        />
        <button type="submit" style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>
          Ask
        </button>
      </form>

      {loading && <p>🔄 Thinking...</p>}
      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
      {response && (
        <div style={{ marginTop: '2rem', whiteSpace: 'pre-wrap' }}>
          <h3>🧠 Assistant Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </main>
  );
}
