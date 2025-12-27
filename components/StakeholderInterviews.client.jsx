'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * StakeholderInterviews Component
 * ═══════════════════════════════════════════════════════════════════════════
 * AI-driven stakeholder interview system that:
 * - Generates role-specific questions addressing burning issues
 * - Collects responses and analyzes them for insights
 * - Performs cross-analysis across all stakeholders
 * - Generates executive summaries and recommendations
 * - Learns from response quality to improve future questions
 * - Auto-generates status updates and communications
 * - Monitors implementation and suggests adjustments
 * 
 * @version 3.0.0 - Full autonomous AI capabilities
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
  onCrossAnalysisComplete,
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
  
  // NEW: Cross-analysis and autonomous features
  const [crossAnalysis, setCrossAnalysis] = useState(null);
  const [crossAnalyzing, setCrossAnalyzing] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [generatingStatus, setGeneratingStatus] = useState(false);
  const [showCrossAnalysis, setShowCrossAnalysis] = useState(false);
  const [implementationMonitoring, setImplementationMonitoring] = useState(null);
  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

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

      // Auto-trigger cross-analysis if 2+ stakeholders completed
      const completedCount = stakeholders.filter(s => s.status === 'completed').length + 1;
      if (autoModeEnabled && completedCount >= 2) {
        performCrossAnalysis();
      }
    } catch (err) {
      console.error('Interview submission error:', err);
      setError('Failed to submit interview. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: AUTONOMOUS AI FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Cross-analyze all completed interviews
  const performCrossAnalysis = async () => {
    const completedStakeholders = stakeholders.filter(s => s.status === 'completed');
    if (completedStakeholders.length < 2) {
      setError('Need at least 2 completed interviews for cross-analysis');
      return;
    }

    setCrossAnalyzing(true);
    setShowCrossAnalysis(true);

    try {
      const interviews = completedStakeholders.map(s => ({
        stakeholderName: s.name,
        role: s.role,
        department: s.department,
        responses: questions.map(q => ({
          question: q.question,
          response: s.responses?.[q.id] || '',
        })).filter(r => r.response),
      }));

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cross-analysis',
          interviews,
          vertical: verticalId || vertical,
          lang,
          burningIssues,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCrossAnalysis(data.analysis);
        
        // Extract AI suggestions from the analysis
        if (data.analysis?.recommendations) {
          setAiSuggestions(data.analysis.recommendations.slice(0, 5));
        }

        // Notify parent
        if (onCrossAnalysisComplete) {
          onCrossAnalysisComplete(data.analysis);
        }
      }
    } catch (err) {
      console.error('Cross-analysis error:', err);
      setError('Failed to perform cross-analysis');
    } finally {
      setCrossAnalyzing(false);
    }
  };

  // Generate automated status update
  const generateStatusUpdate = async (audience = 'executive') => {
    setGeneratingStatus(true);

    try {
      const completedCount = stakeholders.filter(s => s.status === 'completed').length;
      const highlights = crossAnalysis?.consensus?.map(c => c.point) || [];
      const challenges = crossAnalysis?.risks?.map(r => r.risk) || [];
      const nextSteps = crossAnalysis?.recommendations?.map(r => r.action) || [];

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-status-update',
          projectName: `${companyName || 'Organization'} - Stakeholder Analysis`,
          audience,
          status: `${completedCount}/${stakeholders.length} interviews completed`,
          highlights,
          challenges,
          nextSteps,
          vertical: verticalId || vertical,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusUpdate(data.statusUpdate);
      }
    } catch (err) {
      console.error('Status update generation error:', err);
    } finally {
      setGeneratingStatus(false);
    }
  };

  // Monitor implementation progress
  const checkImplementation = async () => {
    if (!crossAnalysis?.implementationRoadmap) return;

    try {
      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitor-implementation',
          projectId: `${companyName}-stakeholder-${Date.now()}`,
          milestones: Object.entries(crossAnalysis.implementationRoadmap).map(([phase, data]) => ({
            name: data.name,
            status: 'in_progress',
            progress: 0,
            dueDate: data.duration,
          })),
          currentStatus: 'In Progress',
          metrics: {
            interviewsCompleted: stakeholders.filter(s => s.status === 'completed').length,
            insightsExtracted: crossAnalysis?.hiddenInsights?.length || 0,
            recommendationsGenerated: crossAnalysis?.recommendations?.length || 0,
          },
          issues: crossAnalysis?.risks || [],
          vertical: verticalId || vertical,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImplementationMonitoring(data.monitoring);
      }
    } catch (err) {
      console.error('Implementation monitoring error:', err);
    }
  };

  // Copy status update to clipboard
  const copyStatusUpdate = () => {
    if (statusUpdate?.full_update) {
      navigator.clipboard.writeText(statusUpdate.full_update);
      alert('Status update copied to clipboard!');
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

  // Render cross-analysis panel
  const renderCrossAnalysis = () => {
    if (!showCrossAnalysis) return null;

    return (
      <div style={{ 
        background: 'rgba(0,0,0,0.3)', 
        padding: 24, 
        borderRadius: 16, 
        marginTop: 24,
        border: `1px solid ${color}40`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ color: '#fff', margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧠 AI Cross-Analysis
            {crossAnalyzing && <span style={{ fontSize: 14, color: color }}>Analyzing...</span>}
          </h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => generateStatusUpdate('executive')}
              disabled={generatingStatus || !crossAnalysis}
              style={{ ...buttonStyle, padding: '8px 16px', fontSize: 12, background: `${color}30`, color: color }}
            >
              {generatingStatus ? '⏳' : '📧'} Generate Status Update
            </button>
            <button
              onClick={() => setShowCrossAnalysis(false)}
              style={{ ...buttonStyle, padding: '8px 16px', fontSize: 12, background: 'rgba(255,255,255,0.1)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {crossAnalyzing ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>🤖</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>Sovereign AI is cross-analyzing all interviews...</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
              Identifying patterns, consensus points, and generating recommendations
            </div>
          </div>
        ) : crossAnalysis ? (
          <div>
            {/* Summary */}
            {crossAnalysis.summary && (
              <div style={{ background: `${color}15`, padding: 16, borderRadius: 12, marginBottom: 20, borderLeft: `4px solid ${color}` }}>
                <div style={{ color: color, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📋 EXECUTIVE SUMMARY</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{crossAnalysis.summary}</div>
              </div>
            )}

            {/* Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
              {crossAnalysis.overallScore && (
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{crossAnalysis.overallScore}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Overall Score</div>
                </div>
              )}
              {crossAnalysis.confidenceLevel && (
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{crossAnalysis.confidenceLevel}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>AI Confidence</div>
                </div>
              )}
            </div>

            {/* Themes */}
            {crossAnalysis.themes?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>🎯 Key Themes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {crossAnalysis.themes.map((theme, i) => (
                    <span key={i} style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      background: theme.sentiment === 'positive' ? 'rgba(16,185,129,0.2)' : 
                                  theme.sentiment === 'negative' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: theme.sentiment === 'positive' ? '#10b981' : 
                             theme.sentiment === 'negative' ? '#ef4444' : '#f59e0b',
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                      {theme.theme} ({theme.frequency})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {crossAnalysis.recommendations?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>✅ AI Recommendations</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {crossAnalysis.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={i} style={{
                      padding: 12,
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 8,
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{ color: '#fff', fontWeight: 500, marginBottom: 4 }}>
                        {i + 1}. {rec.action}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Owner: {rec.owner || 'TBD'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Timeline: {rec.timeline || 'TBD'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {crossAnalysis.risks?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>⚠️ Identified Risks</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {crossAnalysis.risks.slice(0, 3).map((risk, i) => (
                    <div key={i} style={{
                      padding: 12,
                      background: 'rgba(239,68,68,0.1)',
                      borderRadius: 8,
                      borderLeft: `3px solid ${risk.severity === 'high' ? '#ef4444' : risk.severity === 'medium' ? '#f59e0b' : '#6b7280'}`,
                    }}>
                      <div style={{ color: '#fff', fontWeight: 500, marginBottom: 4 }}>{risk.risk}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Mitigation: {risk.mitigation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Insights */}
            {crossAnalysis.hiddenInsights?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>💡 Hidden Insights</div>
                <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  {crossAnalysis.hiddenInsights.map((insight, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.5)' }}>
            No cross-analysis data yet. Complete at least 2 interviews.
          </div>
        )}

        {/* Status Update Panel */}
        {statusUpdate && (
          <div style={{ 
            marginTop: 20, 
            padding: 20, 
            background: 'rgba(139,92,246,0.1)', 
            borderRadius: 12,
            border: '1px solid rgba(139,92,246,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: '#8b5cf6', fontWeight: 600 }}>📧 Generated Status Update</div>
              <button onClick={copyStatusUpdate} style={{ ...buttonStyle, padding: '6px 12px', fontSize: 12 }}>
                📋 Copy
              </button>
            </div>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Subject: {statusUpdate.subject}</div>
            <div style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: 14, 
              whiteSpace: 'pre-wrap',
              background: 'rgba(0,0,0,0.2)',
              padding: 16,
              borderRadius: 8,
              maxHeight: 200,
              overflow: 'auto',
            }}>
              {statusUpdate.full_update || statusUpdate.executive_summary}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: 18 }}>
              🎤 Stakeholder Interviews
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: 14 }}>
              AI-powered interviews with cross-analysis, summaries, and autonomous recommendations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Auto-mode toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoModeEnabled}
                onChange={(e) => setAutoModeEnabled(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: color }}
              />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>🤖 Auto-mode</span>
            </label>
            
            {/* Cross-analysis button */}
            {stakeholders.filter(s => s.status === 'completed').length >= 2 && (
              <button
                onClick={performCrossAnalysis}
                disabled={crossAnalyzing}
                style={{
                  ...buttonStyle,
                  padding: '8px 16px',
                  fontSize: 13,
                  background: crossAnalysis ? `${color}20` : color,
                  color: crossAnalysis ? color : '#fff',
                  border: crossAnalysis ? `1px solid ${color}` : 'none',
                }}
              >
                {crossAnalyzing ? '⏳ Analyzing...' : crossAnalysis ? '🔄 Re-analyze' : '🧠 Cross-Analyze'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions Banner */}
      {aiSuggestions.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            🤖 Sovereign AI Suggests
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            {aiSuggestions[0]?.action || aiSuggestions[0]}
          </div>
        </div>
      )}

      {/* Add stakeholder form or stakeholder list */}
      {showAddStakeholder && renderAddStakeholder()}
      {stakeholders.length > 0 && renderStakeholderList()}

      {/* Interview content */}
      {activeStakeholder && !showAddStakeholder && renderInterview()}

      {/* Cross-analysis panel */}
      {renderCrossAnalysis()}

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
