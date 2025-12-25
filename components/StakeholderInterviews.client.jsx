'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * StakeholderInterviews Component
 * ═══════════════════════════════════════════════════════════════════════════
 * AI-driven stakeholder interview system that:
 * - Generates role-specific questions addressing burning issues
 * - Collects responses and analyzes them for insights
 * - Learns from response quality to improve future questions
 * - Supports multiple stakeholders per project
 * 
 * @version 2.0.0
 */
export default function StakeholderInterviews({
  verticalId,
  vertical,
  roleId,
  roleTitle,
  roleLevel = 'specialist',
  companyName = '',
  categories = [],
  lang = 'English',
  color = '#3b82f6',
  burningIssues = [],
  onInterviewComplete,
  onInterviewChange,
}) {
  // State
  const [stakeholders, setStakeholders] = useState([]);
  const [activeStakeholder, setActiveStakeholder] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [interviewTips, setInterviewTips] = useState([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [showAddStakeholder, setShowAddStakeholder] = useState(true);
  const [newStakeholder, setNewStakeholder] = useState({ name: '', role: '', email: '', department: '' });

  // Calculate progress
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (questions.length === 0) return setProgress(0);
    const answered = Object.keys(responses).filter(key => {
      const val = responses[key];
      return val && (typeof val === 'string' ? val.trim().length > 0 : true);
    }).length;
    setProgress(Math.round((answered / questions.length) * 100));
  }, [responses, questions]);

  // Notify parent of changes
  useEffect(() => {
    if (onInterviewChange) {
      onInterviewChange({
        stakeholders,
        activeStakeholder,
        questions,
        responses,
        progress,
        analysis,
      });
    }
  }, [stakeholders, responses, progress, analysis]);

  // Add a stakeholder
  const addStakeholder = useCallback(() => {
    if (!newStakeholder.name || !newStakeholder.role) return;
    
    const stakeholder = {
      id: `s_${Date.now()}`,
      ...newStakeholder,
      status: 'pending',
      addedAt: new Date().toISOString(),
    };
    
    setStakeholders(prev => [...prev, stakeholder]);
    setNewStakeholder({ name: '', role: '', email: '', department: '' });
    setShowAddStakeholder(false);
    
    // Auto-select if first stakeholder
    if (stakeholders.length === 0) {
      selectStakeholder(stakeholder);
    }
  }, [newStakeholder, stakeholders]);

  // Select a stakeholder for interview
  const selectStakeholder = useCallback(async (stakeholder) => {
    setActiveStakeholder(stakeholder);
    setResponses({});
    setAnalysis(null);
    await generateQuestions(stakeholder);
  }, [verticalId, companyName, burningIssues, lang, categories]);

  // Generate AI questions for stakeholder
  const generateQuestions = async (stakeholder) => {
    setLoading(true);
    setGenerating(true);
    setError('');
    
    try {
      const res = await fetch('/api/universal-industry-plan/interviews/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          role: stakeholder.role,
          roleTitle: stakeholder.role,
          department: stakeholder.department,
          companyName,
          industry: vertical || verticalId,
          vertical: verticalId || vertical,
          verticalId,
          burningIssues,
          categories,
          customContext: `Interview with ${stakeholder.name}, ${stakeholder.role}${stakeholder.department ? ` in ${stakeholder.department}` : ''}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate questions');

      const data = await res.json();
      setQuestions(data.questions || []);
      setInterviewTips(data.interviewTips || []);
      setFollowUpSuggestions(data.followUpSuggestions || []);
      
      console.log(`Generated ${data.questionCount} questions with ${data.learningsApplied ? 'learned improvements' : 'base AI'}`);
    } catch (err) {
      console.error('Question generation error:', err);
      setError('Failed to generate interview questions. Please try again.');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  // Handle response input
  const handleResponse = useCallback((questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }, []);

  // Submit interview and analyze responses
  const submitInterview = async () => {
    if (!activeStakeholder) return;
    
    setAnalyzing(true);
    
    try {
      // Prepare responses for analysis
      const responsesArray = questions
        .filter(q => q.category !== 'intro')
        .map(q => ({
          questionId: q.id,
          question: q.question,
          response: responses[q.id] || '',
          role: activeStakeholder.role,
        }))
        .filter(r => r.response.trim().length > 0);

      if (responsesArray.length > 0) {
        // Analyze responses
        const analysisRes = await fetch('/api/universal-industry-plan/interviews/analyze-response', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responses: responsesArray,
            vertical: verticalId || vertical,
            lang,
          }),
        });

        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          setAnalysis(analysisData);
        }
      }

      // Update stakeholder status
      setStakeholders(prev => prev.map(s => 
        s.id === activeStakeholder.id 
          ? { ...s, status: 'completed', completedAt: new Date().toISOString(), responses }
          : s
      ));

      // Notify parent
      if (onInterviewComplete) {
        onInterviewComplete({
          stakeholder: activeStakeholder,
          questions,
          responses,
          analysis,
          completedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Interview submission error:', err);
      setError('Failed to submit interview. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Styles
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

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: 8,
    background: color,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };

  // Render add stakeholder form
  const renderAddStakeholder = () => (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
      <h4 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 16 }}>
        ➕ Add Stakeholder to Interview
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <input
          type="text"
          placeholder="Name *"
          value={newStakeholder.name}
          onChange={(e) => setNewStakeholder(prev => ({ ...prev, name: e.target.value }))}
          style={inputStyle}
        />
        <select
          value={newStakeholder.role}
          onChange={(e) => setNewStakeholder(prev => ({ ...prev, role: e.target.value }))}
          style={inputStyle}
        >
          <option value="">Select Role *</option>
          <option value="Executive / C-Suite">Executive / C-Suite</option>
          <option value="Senior Leadership">Senior Leadership</option>
          <option value="Operations / Management">Operations / Management</option>
          <option value="IT / Technology">IT / Technology</option>
          <option value="Finance / Accounting">Finance / Accounting</option>
          <option value="HR / People">HR / People</option>
          <option value="Sales / Marketing">Sales / Marketing</option>
          <option value="Customer Service / Support">Customer Service / Support</option>
          <option value="Frontline / Field">Frontline / Field</option>
          <option value="Other">Other</option>
        </select>
        <input
          type="text"
          placeholder="Department"
          value={newStakeholder.department}
          onChange={(e) => setNewStakeholder(prev => ({ ...prev, department: e.target.value }))}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={newStakeholder.email}
          onChange={(e) => setNewStakeholder(prev => ({ ...prev, email: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button
          onClick={addStakeholder}
          disabled={!newStakeholder.name || !newStakeholder.role}
          style={{
            ...buttonStyle,
            opacity: (!newStakeholder.name || !newStakeholder.role) ? 0.5 : 1,
            cursor: (!newStakeholder.name || !newStakeholder.role) ? 'not-allowed' : 'pointer',
          }}
        >
          Add Stakeholder
        </button>
        {stakeholders.length > 0 && (
          <button
            onClick={() => setShowAddStakeholder(false)}
            style={{ ...buttonStyle, background: 'rgba(255,255,255,0.1)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  // Render stakeholder list
  const renderStakeholderList = () => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ color: '#fff', margin: 0, fontSize: 16 }}>👥 Stakeholders ({stakeholders.length})</h4>
        {!showAddStakeholder && (
          <button
            onClick={() => setShowAddStakeholder(true)}
            style={{ ...buttonStyle, padding: '6px 12px', fontSize: 12 }}
          >
            + Add
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {stakeholders.map(s => (
          <div
            key={s.id}
            onClick={() => s.status !== 'completed' && selectStakeholder(s)}
            style={{
              background: activeStakeholder?.id === s.id ? `${color}20` : 'rgba(0,0,0,0.2)',
              padding: '12px 16px',
              borderRadius: 8,
              border: activeStakeholder?.id === s.id ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
              cursor: s.status === 'completed' ? 'default' : 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: '#fff', fontWeight: 600 }}>{s.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {s.role}{s.department ? ` • ${s.department}` : ''}
              </div>
            </div>
            <div style={{
              background: s.status === 'completed' ? '#10b98120' : s.status === 'in_progress' ? `${color}20` : 'rgba(255,255,255,0.1)',
              color: s.status === 'completed' ? '#10b981' : s.status === 'in_progress' ? color : 'rgba(255,255,255,0.5)',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
            }}>
              {s.status === 'completed' ? '✓ Done' : s.status === 'in_progress' ? 'Active' : 'Pending'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render interview questions
  const renderInterview = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {generating ? 'AI is generating personalized questions...' : 'Loading interview...'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Based on {activeStakeholder?.role} role and industry burning issues
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: '#ef4444', fontSize: 16, marginBottom: 16 }}>{error}</div>
          <button onClick={() => generateQuestions(activeStakeholder)} style={buttonStyle}>
            Try Again
          </button>
        </div>
      );
    }

    const completedStakeholder = stakeholders.find(s => s.id === activeStakeholder?.id && s.status === 'completed');
    if (completedStakeholder) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ color: '#10b981', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Interview Complete!
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24 }}>
            Responses from {activeStakeholder.name} have been recorded and analyzed.
          </div>
          {analysis && (
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ color: color, fontWeight: 700, marginBottom: 12 }}>📊 Response Analysis</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                Quality Score: <strong style={{ color: analysis.averageQuality >= 70 ? '#10b981' : '#f59e0b' }}>
                  {Math.round(analysis.averageQuality)}/100
                </strong>
              </div>
              {analysis.synthesis?.totalInsightsExtracted > 0 && (
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8 }}>
                  Insights Extracted: <strong>{analysis.synthesis.totalInsightsExtracted}</strong>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setShowAddStakeholder(true)}
            style={buttonStyle}
          >
            Interview Another Stakeholder
          </button>
        </div>
      );
    }

    return (
      <div>
        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              Interview with {activeStakeholder?.name}
            </span>
            <span style={{ color: color, fontWeight: 600 }}>{progress}% Complete</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3 }}>
            <div style={{ background: color, height: '100%', width: `${progress}%`, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Interview tips */}
        {interviewTips.length > 0 && (
          <div style={{ background: `${color}10`, padding: 16, borderRadius: 12, marginBottom: 24, border: `1px solid ${color}20` }}>
            <div style={{ color: color, fontWeight: 600, marginBottom: 8, fontSize: 13 }}>💡 Interview Tips</div>
            <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {interviewTips.slice(0, 3).map((tip, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions */}
        <div style={{ display: 'grid', gap: 24 }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <label style={{ color: '#fff', fontWeight: 500, fontSize: 15, flex: 1 }}>
                  {idx + 1}. {q.question}
                  {q.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </label>
                {q.category && q.category !== 'intro' && (
                  <span style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}>
                    {q.category}
                  </span>
                )}
              </div>
              
              {q.type === 'select' && q.options ? (
                <select
                  value={responses[q.id] || ''}
                  onChange={(e) => handleResponse(q.id, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select...</option>
                  {q.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : q.type === 'textarea' ? (
                <textarea
                  value={responses[q.id] || ''}
                  onChange={(e) => handleResponse(q.id, e.target.value)}
                  placeholder="Enter your response..."
                  rows={4}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="text"
                  value={responses[q.id] || ''}
                  onChange={(e) => handleResponse(q.id, e.target.value)}
                  placeholder="Enter your response..."
                  style={inputStyle}
                />
              )}
              
              {q.insight_type === 'burning_issue' && (
                <div style={{ marginTop: 8, padding: '6px 12px', background: '#f59e0b15', borderRadius: 8, fontSize: 12, color: '#f59e0b' }}>
                  🔥 This question addresses a key industry burning issue
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button
            onClick={submitInterview}
            disabled={analyzing || progress < 30}
            style={{
              ...buttonStyle,
              flex: 1,
              padding: '16px 24px',
              fontSize: 16,
              opacity: (analyzing || progress < 30) ? 0.5 : 1,
              cursor: (analyzing || progress < 30) ? 'not-allowed' : 'pointer',
            }}
          >
            {analyzing ? '🔄 Analyzing Responses...' : '✓ Complete Interview & Analyze'}
          </button>
        </div>
        
        {progress < 30 && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            Please answer at least 30% of questions to submit
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: 18 }}>
          🎤 Stakeholder Interviews
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 14 }}>
          AI-powered interviews that address industry burning issues. Questions improve based on response quality.
        </p>
      </div>

      {/* Add stakeholder form or stakeholder list */}
      {showAddStakeholder && renderAddStakeholder()}
      {stakeholders.length > 0 && renderStakeholderList()}

      {/* Interview content */}
      {activeStakeholder && !showAddStakeholder && renderInterview()}

      {/* Empty state */}
      {stakeholders.length === 0 && !showAddStakeholder && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 16 }}>
            No stakeholders added yet
          </div>
          <button onClick={() => setShowAddStakeholder(true)} style={buttonStyle}>
            Add First Stakeholder
          </button>
        </div>
      )}
    </div>
  );
}
