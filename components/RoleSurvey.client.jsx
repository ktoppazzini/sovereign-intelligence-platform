'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * RoleSurvey Component
 * AI-generated survey questions based on user's role
 * Responses are used in report analysis
 */
export default function RoleSurvey({ 
  verticalId,
  roleId,
  roleTitle,
  surveyFocus,
  categories = [],
  lang = 'English',
  color = '#3b82f6',
  onSurveyComplete,
  onSurveyChange,
}) {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Generate questions when role changes
  useEffect(() => {
    if (roleId && roleTitle) {
      generateQuestions();
    }
  }, [roleId, roleTitle, verticalId, surveyFocus]);

  // Calculate progress
  useEffect(() => {
    if (questions.length === 0) {
      setProgress(0);
      return;
    }
    const answered = Object.keys(responses).filter(key => {
      const val = responses[key];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      return val !== null && val !== undefined;
    }).length;
    setProgress(Math.round((answered / questions.length) * 100));
  }, [responses, questions]);

  // Notify parent of changes
  useEffect(() => {
    if (onSurveyChange) {
      onSurveyChange({ questions, responses, progress, submitted });
    }
  }, [responses, progress, submitted]);

  const generateQuestions = async () => {
    setLoading(true);
    setGenerating(true);
    setError('');
    
    try {
      const res = await fetch('/api/survey/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verticalId,
          roleId,
          roleTitle,
          surveyFocus,
          lang,
          categories,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate questions');

      const data = await res.json();
      setQuestions(data.questions || []);
      setResponses({});
      setSubmitted(false);
    } catch (err) {
      console.error('Survey generation error:', err);
      setError('Failed to generate survey questions. Please try again.');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleResponse = useCallback((questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleMultiSelect = useCallback((questionId, option) => {
    setResponses(prev => {
      const current = prev[questionId] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const handleSubmit = () => {
    setSubmitted(true);
    if (onSurveyComplete) {
      onSurveyComplete({
        verticalId,
        roleId,
        roleTitle,
        surveyFocus,
        questions,
        responses,
        completedAt: new Date().toISOString(),
        progress,
      });
    }
  };

  const resetSurvey = () => {
    setResponses({});
    setSubmitted(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.4)',
    border: `1px solid ${color}30`,
    color: '#fff',
    fontSize: 15,
    resize: 'vertical',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {generating ? 'AI is generating your personalized survey...' : 'Loading survey...'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Based on your role as {roleTitle}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: '#ef4444', fontSize: 16, marginBottom: 16 }}>{error}</div>
        <button
          onClick={generateQuestions}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            background: color,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ color: '#10b981', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Survey Complete!
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24 }}>
          Your responses will be analyzed by AI and included in the report.
        </div>
        <button
          onClick={resetSurvey}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Edit Responses
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            📋 Role-Based Assessment
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Personalized for {roleTitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: 20, 
            padding: '6px 16px',
            fontSize: 13,
            color: progress === 100 ? '#10b981' : 'rgba(255,255,255,0.7)',
          }}>
            {progress}% Complete
          </div>
          <button
            onClick={generateQuestions}
            title="Regenerate questions"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: `${color}20`,
              color: color,
              border: `1px solid ${color}40`,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        height: 6, 
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{ 
          background: progress === 100 ? '#10b981' : color, 
          height: '100%', 
          width: `${progress}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Questions */}
      <div style={{ display: 'grid', gap: 20 }}>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${responses[q.id] ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
            }}
          >
            <div style={{ 
              color: '#fff', 
              fontSize: 15, 
              marginBottom: 16,
              display: 'flex',
              gap: 12,
            }}>
              <span style={{ 
                color: color, 
                fontWeight: 700,
                minWidth: 24,
              }}>
                {idx + 1}.
              </span>
              <span>{q.question}</span>
            </div>

            {/* Rating Question */}
            {q.type === 'rating' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 36 }}>
                {Array.from({ length: q.scale || 10 }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => handleResponse(q.id, num)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: responses[q.id] === num ? color : 'rgba(255,255,255,0.1)',
                      color: responses[q.id] === num ? '#fff' : 'rgba(255,255,255,0.7)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}

            {/* Single Choice Question */}
            {q.type === 'choice' && q.options && (
              <div style={{ display: 'grid', gap: 8, paddingLeft: 36 }}>
                {q.options.map(option => (
                  <button
                    key={option}
                    onClick={() => handleResponse(q.id, option)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: responses[q.id] === option ? color : 'rgba(255,255,255,0.05)',
                      color: responses[q.id] === option ? '#fff' : 'rgba(255,255,255,0.8)',
                      border: `1px solid ${responses[q.id] === option ? color : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14,
                      transition: 'all 0.2s',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Multi-Select Question */}
            {q.type === 'multiselect' && q.options && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 36 }}>
                {q.options.map(option => {
                  const selected = (responses[q.id] || []).includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => handleMultiSelect(q.id, option)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 20,
                        background: selected ? color : 'rgba(255,255,255,0.05)',
                        color: selected ? '#fff' : 'rgba(255,255,255,0.8)',
                        border: `1px solid ${selected ? color : 'rgba(255,255,255,0.15)'}`,
                        cursor: 'pointer',
                        fontSize: 13,
                        transition: 'all 0.2s',
                      }}
                    >
                      {selected && '✓ '}{option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text Question */}
            {q.type === 'text' && (
              <div style={{ paddingLeft: 36 }}>
                <textarea
                  value={responses[q.id] || ''}
                  onChange={(e) => handleResponse(q.id, e.target.value)}
                  placeholder="Type your answer..."
                  rows={3}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={progress < 50}
        style={{
          padding: '16px 32px',
          borderRadius: 12,
          background: progress >= 50 ? '#10b981' : 'rgba(255,255,255,0.1)',
          color: progress >= 50 ? '#fff' : 'rgba(255,255,255,0.4)',
          border: 'none',
          cursor: progress >= 50 ? 'pointer' : 'not-allowed',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {progress < 50 ? `Answer at least 50% (${progress}%)` : '✓ Submit Survey'}
      </button>

      <div style={{ 
        color: 'rgba(255,255,255,0.4)', 
        fontSize: 12, 
        textAlign: 'center',
      }}>
        Your responses will be analyzed by AI to generate personalized insights in your report.
      </div>
    </div>
  );
}
