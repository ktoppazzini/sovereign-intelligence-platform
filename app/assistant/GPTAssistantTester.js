'use client';

import React, { useState } from 'react';
import { useGPTAssist } from './useGPTAssist';

export default function GPTAssistantTester() {
  const [input, setInput] = useState('');
  const { response, loading, error, askAssistant } = useGPTAssist();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim() === '') return;

    await askAssistant([{ role: 'user', content: input }]);
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '2rem auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h2>Sovereign Intelligence</h2>

      <form onSubmit={handleSubmit}>
        <textarea
          rows={5}
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            resize: 'vertical',
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            fontSize: '16px',
            backgroundColor: '#00264d',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Thinking...' : 'Ask Assistant'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>⚠️ Error: {error}</p>}

      {response && (
        <div
          style={{
            marginTop: '2rem',
            backgroundColor: '#f2f2f2',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <strong>Assistant:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
