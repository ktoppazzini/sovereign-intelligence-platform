import { useState, useContext } from 'react';
import { AssistantContext } from '../context/AssistantContext';
import generatePDF from '@/lib/pdfGenerator';

export default function useGPTAssist() {
  const [loading, setLoading] = useState(false);
  const { setPdfUrl, setAiResponse } = useContext(AssistantContext);

  const askAssistant = async (prompt) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      const aiText = data?.result || 'No response.';
      setAiResponse(aiText);

      const pdfBlob = await generatePDF(aiText);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(pdfUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { askAssistant, loading };
}
