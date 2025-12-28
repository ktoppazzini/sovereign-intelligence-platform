'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getUiTranslations } from '@/lib/i18nClient';
import { COLORS, TYPOGRAPHY, COMPONENTS, PAGE_STYLES, HEADER_STYLES, KEYFRAMES, TRANSITIONS } from '@/lib/designSystem';

// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN AI BUSINESS PARTNER - Premium Theme
// ═══════════════════════════════════════════════════════════════════════════
const AGENT_MODES = {
  CONSULTANT: { id: 'CONSULTANT', name: 'Strategic Consultant', icon: '💼', color: '#8b5cf6', description: 'McKinsey-level strategic advice and recommendations' },
  PROJECT_MANAGER: { id: 'PROJECT_MANAGER', name: 'Project Manager', icon: '📋', color: '#3b82f6', description: 'Full project lifecycle management and tracking' },
  COACH: { id: 'COACH', name: 'Executive Coach', icon: '🎯', color: '#10b981', description: 'Leadership coaching and team development' },
  ANALYST: { id: 'ANALYST', name: 'Data Analyst', icon: '📊', color: '#f59e0b', description: 'Deep analytics, forecasting, and insights' },
  CHANGE_MANAGER: { id: 'CHANGE_MANAGER', name: 'Change Manager', icon: '🔄', color: '#ef4444', description: 'Guide organizational change and adoption' },
  RESISTANCE_NEUTRALIZER: { id: 'RESISTANCE_NEUTRALIZER', name: 'Resistance Neutralizer', icon: '🛡️', color: '#ec4899', description: '100% effective resistance neutralization - superhuman persuasion and objection handling' },
  COMMUNICATOR: { id: 'COMMUNICATOR', name: 'Communications', icon: '📧', color: '#06b6d4', description: 'Draft emails, presentations, and updates' },
};

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════════
const QUICK_ACTION_CATEGORIES = {
  project: {
    title: 'Project Management',
    icon: '📋',
    actions: [
      { icon: '📋', label: 'Create Project Plan', action: 'Create a comprehensive project plan for a digital transformation initiative' },
      { icon: '✅', label: 'Create Tasks', action: 'Create tasks for the project with deadlines and assignments' },
      { icon: '🎯', label: 'Set Milestone', action: 'Create a milestone for project go-live in 3 months' },
      { icon: '📈', label: 'Track Progress', action: 'Track and report on project progress' },
      { icon: '⚠️', label: 'Identify Risks', action: 'Identify project risks and create mitigation strategies' },
      { icon: '📊', label: 'Generate Gantt', action: 'Generate a Gantt chart for the project timeline' },
    ],
  },
  change: {
    title: 'Change Management',
    icon: '🔄',
    actions: [
      { icon: '👥', label: 'Stakeholder Analysis', action: 'Perform stakeholder analysis for the change initiative' },
      { icon: '💥', label: 'Impact Assessment', action: 'Assess the change impact on people, processes, and technology' },
      { icon: '📝', label: 'Change Plan', action: 'Create a comprehensive change management plan using ADKAR' },
      { icon: '🛡️', label: 'Resistance Plan', action: 'Create a resistance management plan with interventions' },
      { icon: '📊', label: 'Track Adoption', action: 'Track adoption metrics and engagement levels' },
    ],
  },
  resistance: {
    title: 'Resistance Neutralization',
    icon: '🛡️',
    actions: [
      { icon: '🎯', label: 'Identify Resistance', action: 'Identify all sources of resistance and their root causes with 100% accuracy' },
      { icon: '🧠', label: 'Psychological Profile', action: 'Create psychological profiles of resistant stakeholders for targeted persuasion' },
      { icon: '💬', label: 'Neutralization Scripts', action: 'Generate word-perfect scripts to neutralize specific objections with 100% effectiveness' },
      { icon: '🔄', label: 'Convert Opposition', action: 'Convert resistors into advocates using advanced influence techniques' },
      { icon: '📊', label: 'Track Conversion', action: 'Track resistance neutralization progress and conversion rates' },
      { icon: '⚡', label: 'Emergency Intervention', action: 'Deploy emergency resistance intervention for critical blockers' },
      { icon: '🎭', label: 'Emotional Intelligence', action: 'Analyze emotional triggers and craft personalized persuasion strategies' },
      { icon: '🛡️', label: 'Preemptive Defense', action: 'Identify and neutralize resistance before it emerges' },
    ],
  },
  consulting: {
    title: 'Consulting & Strategy',
    icon: '💼',
    actions: [
      { icon: '🎯', label: 'SWOT Analysis', action: 'Perform a SWOT analysis for my organization' },
      { icon: '🏆', label: 'Competitive Analysis', action: 'Analyze our competitors and market position' },
      { icon: '📊', label: 'Benchmarking', action: 'Benchmark our performance against industry standards' },
      { icon: '💡', label: 'Get Recommendations', action: 'Generate strategic recommendations for growth' },
    ],
  },
  coaching: {
    title: 'Coaching & Development',
    icon: '🎯',
    actions: [
      { icon: '👤', label: 'Leadership Assessment', action: 'Assess my leadership competencies and development areas' },
      { icon: '📈', label: 'Development Plan', action: 'Create a professional development plan for career growth' },
      { icon: '👥', label: 'Team Assessment', action: 'Assess team performance and dynamics' },
      { icon: '🗣️', label: 'Coaching Session', action: 'Start a coaching session on leadership challenges' },
      { icon: '📝', label: 'Performance Feedback', action: 'Help me write performance feedback for my team' },
    ],
  },
  communication: {
    title: 'Communication',
    icon: '📧',
    actions: [
      { icon: '✉️', label: 'Draft Email', action: 'Draft a professional email to stakeholders about project status' },
      { icon: '📑', label: 'Create Presentation', action: 'Create a presentation outline for the executive team' },
      { icon: '📋', label: 'Meeting Summary', action: 'Generate a meeting summary with action items' },
      { icon: '📢', label: 'Stakeholder Update', action: 'Create a stakeholder update on project progress' },
      { icon: '📄', label: 'Executive Brief', action: 'Create an executive brief on the transformation initiative' },
    ],
  },
  analysis: {
    title: 'Advanced Analysis',
    icon: '📊',
    actions: [
      { icon: '🔬', label: 'Deep Analysis', action: 'Perform deep analysis on our operational data' },
      { icon: '🔮', label: 'Forecast', action: 'Generate a forecast for next quarter performance' },
      { icon: '🔍', label: 'Root Cause', action: 'Perform root cause analysis on the efficiency drop' },
      { icon: '📈', label: 'Trend Analysis', action: 'Identify trends in our performance metrics' },
      { icon: '📊', label: 'Generate Report', action: 'Generate a comprehensive transformation report' },
      { icon: '📤', label: 'Export PDF', action: 'Export the analysis as a PDF document' },
    ],
  },
};

const BASE_UI = {
  title: 'Sovereign AI Agent',
  subtitle: 'Your AI Business Partner',
  description: 'Project Management • Consulting • Coaching • Change Management • Resistance Neutralization',
  backBtn: '← Back',
  inputPlaceholder: 'Ask me anything or tell me what to do...',
  sendBtn: 'Send',
  autonomousMode: 'Autonomous Mode',
  selectMode: 'Select Agent Mode',
  thinking: 'Thinking...',
  executing: 'Executing action...',
  actionsTitle: 'Quick Actions',
  categoriesTitle: 'Capabilities',
  capabilitiesTitle: 'AI Business Partner Capabilities',
  capabilitiesSubtitle: 'Your autonomous AI assistant for enterprise success',
  
  // Resistance Neutralization Labels
  resistanceMode: 'Resistance Neutralizer',
  resistanceModeDesc: '100% effective resistance elimination',
  resistanceIdentify: 'Identify Resistance',
  resistanceProfile: 'Psychological Profile',
  resistanceScripts: 'Neutralization Scripts',
  resistanceConvert: 'Convert Opposition',
  resistanceTrack: 'Track Conversion',
  resistanceEmergency: 'Emergency Intervention',
  resistanceEmotional: 'Emotional Intelligence',
  resistancePreemptive: 'Preemptive Defense',
  resistanceEffectiveness: '100% Effectiveness Guarantee',
};

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITY CARDS - Featured capabilities showcase
// ═══════════════════════════════════════════════════════════════════════════
const CAPABILITY_CARDS = [
  {
    icon: '📋',
    title: 'Project Management',
    description: 'Create projects, tasks, milestones, Gantt charts, track progress, and identify risks.',
    cta: 'Start a Project',
    action: 'Create a comprehensive project plan for a digital transformation initiative',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  },
  {
    icon: '🔄',
    title: 'Change Management',
    description: 'Stakeholder analysis, change impact assessment, resistance management, ADKAR framework.',
    cta: 'Plan Change',
    action: 'Perform stakeholder analysis for the change initiative',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  {
    icon: '💼',
    title: 'Strategic Consulting',
    description: 'SWOT analysis, competitive intelligence, benchmarking, strategic recommendations.',
    cta: 'Get Strategy',
    action: 'Perform a SWOT analysis for my organization',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
  {
    icon: '🎯',
    title: 'Executive Coaching',
    description: 'Leadership assessment, development plans, team dynamics, performance feedback.',
    cta: 'Start Coaching',
    action: 'Assess my leadership competencies and development areas',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    icon: '�️',
    title: 'Resistance Neutralization',
    description: '100% effective resistance elimination. Superhuman persuasion, objection handling, psychological profiling, and conversion strategies that no human can match.',
    cta: 'Neutralize Resistance',
    action: 'Identify all sources of resistance and create 100% effective neutralization strategies',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  },
  {
    icon: '�📧',
    title: 'Communications',
    description: 'Draft emails, create presentations, meeting summaries, executive briefs.',
    cta: 'Draft Content',
    action: 'Draft a professional email to stakeholders about project status',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    icon: '📊',
    title: 'Advanced Analysis',
    description: 'Deep analytics, forecasting, root cause analysis, trend identification.',
    cta: 'Analyze Data',
    action: 'Perform deep analysis on our operational data',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
];

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function AutonomousAgentPage() {
  const [lang, setLang] = useState('English');
  const [ui, setUi] = useState(BASE_UI);
  const [dir, setDir] = useState('ltr');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [agentMode, setAgentMode] = useState('CONSULTANT');
  const [activeCategory, setActiveCategory] = useState('consulting');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const [hoveredCapability, setHoveredCapability] = useState(null);
  const [showCapabilities, setShowCapabilities] = useState(true);
  const [executions, setExecutions] = useState([]);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentMode = AGENT_MODES[agentMode];

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlLang = sp.get('lang') || 'English';
    setLang(urlLang);
    setMessages([]);
    fetchAgentStatus();
  }, []);

  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: 'SI_AGENT_V2', setDir: true });
      setUi(t || BASE_UI);
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
    })();
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' }),
      });
      const data = await res.json();
      if (data.success) setAgentStatus(data.status);
    } catch (err) { console.error('Failed to fetch agent status:', err); }
  };

  const toggleAutonomousMode = async () => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_autonomous_mode', autonomousMode: !autonomousMode }),
      });
      const data = await res.json();
      if (data.success) {
        setAutonomousMode(data.autonomousMode);
        setMessages(prev => [...prev, { id: Date.now(), role: 'system', content: data.message, timestamp: new Date().toISOString() }]);
      }
    } catch (err) { console.error('Failed to toggle autonomous mode:', err); }
  };

  const switchMode = (modeId) => {
    setAgentMode(modeId);
    setShowModeSelector(false);
    const mode = AGENT_MODES[modeId];
    // Map mode to category
    const categoryMap = { 
      CONSULTANT: 'consulting', 
      PROJECT_MANAGER: 'project', 
      COACH: 'coaching', 
      ANALYST: 'analysis', 
      CHANGE_MANAGER: 'change',
      RESISTANCE_NEUTRALIZER: 'resistance',
      COMMUNICATOR: 'communication' 
    };
    setActiveCategory(categoryMap[modeId] || 'consulting');
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'system',
      content: `🔄 Switched to **${mode.name}** mode. ${mode.description}`,
      timestamp: new Date().toISOString(),
    }]);
  };

  const sendMessage = async (messageText = null) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    setShowCapabilities(false); // Hide capability cards when user sends a message
    const userMessage = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    const isAction = /^(generate|create|send|analyze|export|schedule|translate|alert|notify|assess|plan|track|draft|forecast|coach|recommend|benchmark)/i.test(text);
    if (isAction) setIsExecuting(true);

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: text,
          agentMode: agentMode,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          context: { language: lang, mode: agentMode },
        }),
      });
      const data = await res.json();
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'I apologize, I could not process that request.',
        timestamp: new Date().toISOString(),
        actionTaken: data.actionTaken,
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (data.actionTaken) fetchAgentStatus();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '❌ I encountered an error. Please try again.', timestamp: new Date().toISOString(), error: true }]);
    } finally {
      setIsLoading(false);
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // ═══════════════════════════════════════════════════════════════════════════
  // FLAWLESS EXECUTION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchExecutions = async () => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', options: { limit: 20 } }),
      });
      const data = await res.json();
      if (data.success) setExecutions(data.executions || []);
    } catch (err) { console.error('Failed to fetch executions:', err); }
  };

  const fetchExecutionMetrics = async () => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execution_metrics' }),
      });
      const data = await res.json();
      if (data.success) setExecutionMetrics(data.metrics);
    } catch (err) { console.error('Failed to fetch metrics:', err); }
  };

  const executeFlawless = async (actionType, params, vertical = 'enterprise') => {
    setIsExecuting(true);
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'system',
      content: `⚡ Executing: **${actionType}** with flawless execution...`,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flawless_execute',
          actionType,
          params,
          vertical,
          waitForResult: true,
        }),
      });
      const data = await res.json();
      
      const statusIcon = data.success ? '✅' : data.status === 'requires_approval' ? '⏳' : '❌';
      const statusMsg = data.success 
        ? `**Execution Completed Successfully**\n\n${data.verified ? '✓ Verified' : ''} ${data.canRollback ? '↩️ Can Rollback' : ''}`
        : data.status === 'requires_approval'
        ? `**Requires Approval**\n\nExecution ID: \`${data.executionId}\``
        : `**Execution Failed**\n\n${data.error}`;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `${statusIcon} ${statusMsg}\n\n${data.result ? `**Result:** ${JSON.stringify(data.result, null, 2)}` : ''}`,
        timestamp: new Date().toISOString(),
        executionId: data.executionId,
        executionStatus: data.status,
      }]);

      fetchExecutions();
      fetchExecutionMetrics();
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Execution failed: ${err.message}`,
        timestamp: new Date().toISOString(),
        error: true,
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const approveExecution = async (executionId) => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_execution', executionId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'system',
          content: `✅ Execution **${executionId}** approved and running.`,
          timestamp: new Date().toISOString(),
        }]);
        fetchExecutions();
      }
    } catch (err) { console.error('Approve error:', err); }
  };

  const rollbackExecution = async (executionId) => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback_execution', executionId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: data.success 
          ? `↩️ Execution **${executionId}** rolled back successfully.`
          : `❌ Rollback failed: ${data.error}`,
        timestamp: new Date().toISOString(),
      }]);
      fetchExecutions();
    } catch (err) { console.error('Rollback error:', err); }
  };

  // Fetch executions on mount
  useEffect(() => {
    fetchExecutions();
    fetchExecutionMetrics();
  }, []);

  const primaryColor = currentMode.color;
  const successColor = '#10b981';

  return (
    <div dir={dir} style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #030308 0%, #0a0f1a 20%, #0f172a 50%, #0a0f1a 80%, #030308 100%)', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: TYPOGRAPHY.fontFamily,
      position: 'relative',
    }}>
      {/* Premium Background Effects */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES + `
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5); }
        .category-tab:hover { background: rgba(99, 102, 241, 0.15); }
        .quick-action:hover { transform: translateY(-2px); background: rgba(99, 102, 241, 0.2); }
        .mode-btn:hover { background: rgba(99, 102, 241, 0.1); }
      `}} />
      
      <div style={{
        position: 'fixed',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 60%)`,
        filter: 'blur(80px)',
        top: '-200px',
        right: '-200px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
        filter: 'blur(60px)',
        bottom: '10%',
        left: '-200px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      
      {/* Premium Header */}
      <header style={{ 
        ...HEADER_STYLES.container,
        background: 'rgba(3, 3, 8, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 1400, margin: '0 auto', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href={`/universal-industry-plan?lang=${encodeURIComponent(lang)}`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>{ui.backBtn}</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img 
                src="/images/secure.png" 
                alt="Sovereign Intelligence" 
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  boxShadow: `0 4px 20px ${primaryColor}40`,
                }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{ui.title}</h1>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{ui.subtitle}</p>
              </div>
            </div>
          </div>
          
          {/* Agent Mode & Autonomous Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Mode Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                className="mode-btn"
                onClick={() => setShowModeSelector(!showModeSelector)} 
                style={{ 
                  padding: '10px 18px', 
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`, 
                  border: `1px solid ${primaryColor}40`, 
                  borderRadius: 10, 
                  color: '#fff', 
                  fontSize: 14, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  transition: TRANSITIONS.normal,
                }}
              >
                <span style={{ fontSize: 18 }}>{currentMode.icon}</span>
                <span style={{ fontWeight: 600 }}>{currentMode.name}</span>
                <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>▼</span>
              </button>
              {showModeSelector && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: 8, 
                  background: 'rgba(15, 23, 42, 0.98)', 
                  border: '1px solid rgba(99, 102, 241, 0.25)', 
                  borderRadius: 14, 
                  padding: 8, 
                  zIndex: 1000, 
                  minWidth: 260, 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(20px)',
                }}>
                  {Object.values(AGENT_MODES).map(mode => (
                    <button 
                      key={mode.id} 
                      onClick={() => switchMode(mode.id)} 
                      style={{ 
                        width: '100%', 
                        padding: '12px 14px', 
                        background: agentMode === mode.id ? `${mode.color}20` : 'transparent', 
                        border: 'none', 
                        borderRadius: 10, 
                        color: '#fff', 
                        fontSize: 14, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12, 
                        textAlign: 'left',
                        transition: TRANSITIONS.normal,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{mode.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{mode.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{mode.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Autonomous Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{ui.autonomousMode}</span>
              <button onClick={toggleAutonomousMode} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: autonomousMode ? successColor : 'rgba(255,255,255,0.2)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: autonomousMode ? 23 : 3, transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {/* Execution Panel Toggle */}
            <button 
              onClick={() => setShowExecutionPanel(!showExecutionPanel)}
              style={{
                padding: '8px 14px',
                background: showExecutionPanel ? `${successColor}30` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${showExecutionPanel ? successColor : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: TRANSITIONS.normal,
              }}
            >
              <span>⚡</span>
              <span>Executions</span>
              {executions.length > 0 && (
                <span style={{
                  background: primaryColor,
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 600,
                }}>
                  {executions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Capability Cards - Show when no user messages */}
            {showCapabilities && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <h2 style={{ 
                    fontSize: 28, 
                    fontWeight: 700, 
                    background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 12
                  }}>
                    How can I help you today?
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                    Click any capability below to get started, or type your own request
                  </p>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: 20,
                  maxWidth: 900,
                  margin: '0 auto'
                }}>
                  {CAPABILITY_CARDS.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => sendMessage(card.action)}
                      onMouseEnter={() => setHoveredCapability(idx)}
                      onMouseLeave={() => setHoveredCapability(null)}
                      style={{
                        background: hoveredCapability === idx 
                          ? 'rgba(255,255,255,0.08)' 
                          : 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16,
                        padding: 24,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: hoveredCapability === idx ? 'translateY(-4px)' : 'translateY(0)',
                        boxShadow: hoveredCapability === idx 
                          ? '0 20px 40px rgba(0,0,0,0.3)' 
                          : '0 4px 20px rgba(0,0,0,0.15)',
                      }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${card.gradient.split(' → ')[0]}, ${card.gradient.split(' → ')[1]})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        marginBottom: 16,
                        boxShadow: `0 8px 24px ${card.gradient.split(' → ')[0]}40`,
                      }}>
                        {card.icon}
                      </div>
                      <h3 style={{ 
                        fontSize: 18, 
                        fontWeight: 600, 
                        color: '#fff', 
                        marginBottom: 8 
                      }}>
                        {card.title}
                      </h3>
                      <p style={{ 
                        fontSize: 14, 
                        color: 'rgba(255,255,255,0.6)', 
                        lineHeight: 1.6,
                        marginBottom: 16
                      }}>
                        {card.description}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        color: card.gradient.split(' → ')[0],
                        fontSize: 14,
                        fontWeight: 500
                      }}>
                        {card.cta}
                        <span style={{ 
                          transition: 'transform 0.3s ease',
                          transform: hoveredCapability === idx ? 'translateX(4px)' : 'translateX(0)'
                        }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '85%', 
                  padding: '14px 18px', 
                  borderRadius: msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px', 
                  background: msg.role === 'user' 
                    ? `linear-gradient(135deg, ${primaryColor}, #6366f1)` 
                    : msg.role === 'system' 
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.08) 100%)' 
                      : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)', 
                  border: msg.role === 'system' ? '1px solid rgba(16,185,129,0.3)' : msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : '0 2px 10px rgba(0,0,0,0.2)',
                }}>
                  <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#a5b4fc">$1</strong>').replace(/\n/g, '<br/>') }} />
                  {msg.actionTaken && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)', borderRadius: 10, fontSize: 13, border: '1px solid rgba(16,185,129,0.3)' }}>
                      ✅ Action executed: <strong>{msg.actionTaken.status}</strong>
                      {msg.actionTaken.plan?.category && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.6)' }}>({msg.actionTaken.plan.category})</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: msg.role === 'user' ? 'right' : 'left' }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)', borderRadius: '18px 18px 18px 6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: `linear-gradient(135deg, ${primaryColor}, #6366f1)`, animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s` }} />)}</div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{isExecuting ? ui.executing : ui.thinking}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Category Tabs - Premium Style */}
          <div style={{ 
            padding: '12px 24px', 
            borderTop: '1px solid rgba(99, 102, 241, 0.15)', 
            background: 'rgba(0,0,0,0.2)',
            display: 'flex', 
            gap: 8, 
            overflowX: 'auto', 
            flexShrink: 0 
          }}>
            {Object.entries(QUICK_ACTION_CATEGORIES).map(([key, cat]) => (
              <button 
                key={key} 
                className="category-tab"
                onClick={() => setActiveCategory(key)} 
                style={{ 
                  padding: '8px 16px', 
                  background: activeCategory === key 
                    ? `linear-gradient(135deg, ${primaryColor}30 0%, ${primaryColor}15 100%)` 
                    : 'transparent', 
                  border: activeCategory === key 
                    ? `1px solid ${primaryColor}50` 
                    : '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: 20, 
                  color: activeCategory === key ? '#fff' : 'rgba(255,255,255,0.6)', 
                  fontSize: 13, 
                  fontWeight: activeCategory === key ? 600 : 500,
                  cursor: 'pointer', 
                  whiteSpace: 'nowrap', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  transition: TRANSITIONS.normal,
                }}
              >
                <span>{cat.icon}</span><span>{cat.title}</span>
              </button>
            ))}
          </div>

          {/* Quick Actions for Selected Category - Premium Style */}
          <div style={{ 
            padding: '12px 24px', 
            borderTop: '1px solid rgba(99, 102, 241, 0.08)', 
            display: 'flex', 
            gap: 10, 
            overflowX: 'auto', 
            flexShrink: 0 
          }}>
            {QUICK_ACTION_CATEGORIES[activeCategory].actions.map((qa, i) => (
              <button 
                key={i} 
                className="quick-action"
                onClick={() => sendMessage(qa.action)} 
                disabled={isLoading} 
                style={{ 
                  padding: '10px 16px', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                  border: '1px solid rgba(99, 102, 241, 0.2)', 
                  borderRadius: 24, 
                  color: '#fff', 
                  fontSize: 13, 
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer', 
                  whiteSpace: 'nowrap', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  opacity: isLoading ? 0.5 : 1, 
                  transition: TRANSITIONS.normal,
                }}
              >
                <span>{qa.icon}</span><span>{qa.label}</span>
              </button>
            ))}
          </div>

          {/* Input Area - Premium Style */}
          <div style={{ 
            padding: '16px 24px', 
            borderTop: '1px solid rgba(99, 102, 241, 0.2)', 
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0 
          }}>
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', 
              borderRadius: 14, 
              padding: '6px 6px 6px 20px', 
              border: '1px solid rgba(99, 102, 241, 0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              <input 
                ref={inputRef} 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={handleKeyPress} 
                placeholder={ui.inputPlaceholder} 
                disabled={isLoading} 
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: 16, 
                  outline: 'none',
                  fontFamily: TYPOGRAPHY.fontFamily,
                }} 
              />
              <button 
                className="btn-primary"
                onClick={() => sendMessage()} 
                disabled={isLoading || !input.trim()} 
                style={{ 
                  padding: '14px 28px', 
                  background: isLoading || !input.trim() 
                    ? 'rgba(255,255,255,0.1)' 
                    : `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`, 
                  border: 'none', 
                  borderRadius: 10, 
                  color: '#fff', 
                  fontSize: 15, 
                  fontWeight: 600, 
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', 
                  opacity: isLoading || !input.trim() ? 0.5 : 1,
                  transition: TRANSITIONS.normal,
                  boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)',
                }}
              >
                {ui.sendBtn}
              </button>
            </div>
          </div>
        </div>

        {/* Execution Panel Sidebar */}
        {showExecutionPanel && (
          <div style={{
            width: 380,
            background: 'rgba(3, 3, 8, 0.95)',
            borderLeft: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            backdropFilter: 'blur(20px)',
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>⚡ Flawless Execution</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Verified • Audited • Rollback-capable</p>
              </div>
              <button 
                onClick={() => setShowExecutionPanel(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {/* Metrics Summary */}
            {executionMetrics && (
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: successColor }}>{executionMetrics.completed}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Completed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{executionMetrics.pending || 0}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Pending</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{executionMetrics.successRate}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Success</div>
                </div>
              </div>
            )}

            {/* Executions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {executions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                  <div>No executions yet</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Actions you execute will appear here</div>
                </div>
              ) : (
                executions.map(exec => (
                  <div 
                    key={exec.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{exec.action}</div>
                      <div style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 600,
                        background: exec.status === 'completed' ? `${successColor}25` 
                          : exec.status === 'failed' ? 'rgba(239, 68, 68, 0.25)' 
                          : exec.status === 'requires_approval' ? 'rgba(245, 158, 11, 0.25)'
                          : 'rgba(99, 102, 241, 0.25)',
                        color: exec.status === 'completed' ? successColor 
                          : exec.status === 'failed' ? '#ef4444'
                          : exec.status === 'requires_approval' ? '#f59e0b'
                          : '#6366f1',
                      }}>
                        {exec.status === 'completed' ? '✓ Completed' 
                          : exec.status === 'failed' ? '✕ Failed'
                          : exec.status === 'requires_approval' ? '⏳ Pending'
                          : exec.status === 'in_progress' ? '⚙️ Running'
                          : exec.status}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                      {exec.vertical} • {new Date(exec.createdAt).toLocaleTimeString()}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {exec.status === 'requires_approval' && (
                        <button
                          onClick={() => approveExecution(exec.id)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: `${successColor}20`,
                            border: `1px solid ${successColor}40`,
                            borderRadius: 6,
                            color: successColor,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                      )}
                      {exec.status === 'completed' && exec.verificationResult && (
                        <button
                          onClick={() => rollbackExecution(exec.id)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 6,
                            color: '#ef4444',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ↩️ Rollback
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Execute Section */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid rgba(99, 102, 241, 0.15)',
              background: 'rgba(0,0,0,0.2)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                Quick Execute
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: '📋 Create Project', action: 'CREATE_PROJECT', params: { projectName: 'New Project', description: 'Auto-created project' } },
                  { label: '📊 Run Analysis', action: 'DEEP_ANALYSIS', params: { dataSource: 'operations', analysisType: 'comprehensive' } },
                  { label: '📧 Draft Email', action: 'DRAFT_EMAIL', params: { purpose: 'Status Update', tone: 'professional' } },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => executeFlawless(btn.action, btn.params)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 6,
                      color: '#a5b4fc',
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: TRANSITIONS.normal,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
