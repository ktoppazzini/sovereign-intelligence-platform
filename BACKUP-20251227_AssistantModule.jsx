'use client';

import { useState, useEffect, useRef } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// ASSISTANT MODULE v2.0 - Full AI Business Partner
// Project Management • Consulting • Coaching • Change Management • Analysis
// Supports 207 languages + RTL + Vertical-specific theming
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// ═══════════════════════════════════════════════════════════════════════════
// AGENT MODES - Different operational personalities
// ═══════════════════════════════════════════════════════════════════════════
const AGENT_MODES = {
  CONSULTANT: { id: 'CONSULTANT', name: 'Strategic Consultant', icon: '💼', color: '#8b5cf6', description: 'McKinsey-level strategic advice' },
  PROJECT_MANAGER: { id: 'PROJECT_MANAGER', name: 'Project Manager', icon: '📋', color: '#3b82f6', description: 'Full project lifecycle management' },
  COACH: { id: 'COACH', name: 'Executive Coach', icon: '🎯', color: '#10b981', description: 'Leadership and team development' },
  ANALYST: { id: 'ANALYST', name: 'Data Analyst', icon: '📊', color: '#f59e0b', description: 'Deep analytics and forecasting' },
  CHANGE_MANAGER: { id: 'CHANGE_MANAGER', name: 'Change Manager', icon: '🔄', color: '#ef4444', description: 'Organizational change guidance' },
  COMMUNICATOR: { id: 'COMMUNICATOR', name: 'Communications', icon: '📧', color: '#06b6d4', description: 'Emails, presentations, updates' },
};

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ACTION CATEGORIES - Universal actions organized by function
// ═══════════════════════════════════════════════════════════════════════════
const QUICK_ACTION_CATEGORIES = {
  project: {
    title: 'Project',
    icon: '📋',
    actions: [
      { icon: '📋', label: 'Create Project', action: 'Create a comprehensive project plan' },
      { icon: '✅', label: 'Tasks', action: 'Create tasks with deadlines' },
      { icon: '🎯', label: 'Milestone', action: 'Set a project milestone' },
      { icon: '📈', label: 'Progress', action: 'Track project progress' },
    ],
  },
  change: {
    title: 'Change',
    icon: '🔄',
    actions: [
      { icon: '👥', label: 'Stakeholders', action: 'Perform stakeholder analysis' },
      { icon: '💥', label: 'Impact', action: 'Assess change impact' },
      { icon: '📝', label: 'Plan', action: 'Create change management plan' },
      { icon: '📊', label: 'Adoption', action: 'Track adoption metrics' },
    ],
  },
  consulting: {
    title: 'Strategy',
    icon: '💼',
    actions: [
      { icon: '🎯', label: 'SWOT', action: 'Perform SWOT analysis' },
      { icon: '🏆', label: 'Competitive', action: 'Analyze competitors' },
      { icon: '📊', label: 'Benchmark', action: 'Industry benchmarking' },
      { icon: '💡', label: 'Recommend', action: 'Generate strategic recommendations' },
    ],
  },
  coaching: {
    title: 'Coach',
    icon: '🎯',
    actions: [
      { icon: '👤', label: 'Leadership', action: 'Assess leadership competencies' },
      { icon: '📈', label: 'Development', action: 'Create development plan' },
      { icon: '👥', label: 'Team', action: 'Assess team performance' },
      { icon: '🗣️', label: 'Coaching', action: 'Start coaching session' },
    ],
  },
  communication: {
    title: 'Comm',
    icon: '📧',
    actions: [
      { icon: '✉️', label: 'Email', action: 'Draft professional email' },
      { icon: '📑', label: 'Presentation', action: 'Create presentation outline' },
      { icon: '📋', label: 'Meeting', action: 'Generate meeting summary' },
      { icon: '📄', label: 'Brief', action: 'Create executive brief' },
    ],
  },
  analysis: {
    title: 'Analysis',
    icon: '📊',
    actions: [
      { icon: '🔬', label: 'Deep Analysis', action: 'Perform deep data analysis' },
      { icon: '🔮', label: 'Forecast', action: 'Generate performance forecast' },
      { icon: '🔍', label: 'Root Cause', action: 'Root cause analysis' },
      { icon: '📤', label: 'Export', action: 'Export as PDF' },
    ],
  },
};

// Vertical-specific quick actions (dynamically translated)
const getQuickActions = (verticalId) => {
  const actions = {
    defense: [
      { icon: '🎯', labelKey: 'qaAnalyzeThreat', action: 'Analyze current threat intelligence and provide risk assessment' },
      { icon: '🛡️', labelKey: 'qaSecurityAudit', action: 'Run a comprehensive security audit on our systems' },
      { icon: '📋', labelKey: 'qaMissionPlan', action: 'Help me create a mission planning document' },
      { icon: '🔒', labelKey: 'qaClassifiedBrief', action: 'Generate a classified intelligence briefing' },
      { icon: '⚠️', labelKey: 'qaSetAlert', action: 'Set up an alert for threat level changes' },
      { icon: '📤', labelKey: 'qaExportReport', action: 'Export the security assessment as a PDF' },
    ],
    pharma: [
      { icon: '💊', labelKey: 'qaTrialAnalysis', action: 'Analyze clinical trial data for efficacy patterns' },
      { icon: '📋', labelKey: 'qaComplianceCheck', action: 'Check FDA compliance status for current submissions' },
      { icon: '🔬', labelKey: 'qaLitReview', action: 'Perform a literature review on recent drug interactions' },
      { icon: '📊', labelKey: 'qaSafetyReport', action: 'Generate a drug safety monitoring report' },
      { icon: '⚠️', labelKey: 'qaAdverseAlert', action: 'Alert me when new adverse events are reported' },
      { icon: '📤', labelKey: 'qaExportTrial', action: 'Export trial results for regulatory submission' },
    ],
    clinical: [
      { icon: '🏥', labelKey: 'qaPatientAnalysis', action: 'Analyze patient outcomes for treatment protocols' },
      { icon: '📋', labelKey: 'qaProtocolReview', action: 'Review clinical protocol compliance' },
      { icon: '🩺', labelKey: 'qaDiagnosticSupport', action: 'Provide diagnostic decision support' },
      { icon: '📊', labelKey: 'qaOutcomeReport', action: 'Generate patient outcome summary report' },
      { icon: '⚠️', labelKey: 'qaCriticalAlert', action: 'Alert me on critical patient indicators' },
      { icon: '📤', labelKey: 'qaExportRecords', action: 'Export patient analysis for medical records' },
    ],
    finance: [
      { icon: '📈', labelKey: 'qaMarketAnalysis', action: 'Analyze market trends and investment opportunities' },
      { icon: '🏦', labelKey: 'qaRiskAssessment', action: 'Run a comprehensive portfolio risk assessment' },
      { icon: '📋', labelKey: 'qaComplianceAudit', action: 'Check regulatory compliance status' },
      { icon: '📊', labelKey: 'qaFinancialReport', action: 'Generate quarterly financial performance report' },
      { icon: '⚠️', labelKey: 'qaMarketAlert', action: 'Alert me on significant market movements' },
      { icon: '📤', labelKey: 'qaExportPortfolio', action: 'Export portfolio analysis as PDF' },
    ],
    insurance: [
      { icon: '📋', labelKey: 'qaClaimAnalysis', action: 'Analyze claims patterns for fraud detection' },
      { icon: '🛡️', labelKey: 'qaRiskProfile', action: 'Generate customer risk profiles' },
      { icon: '📊', labelKey: 'qaUnderwriting', action: 'Assist with underwriting decisions' },
      { icon: '💰', labelKey: 'qaPremiumCalc', action: 'Calculate optimal premium pricing' },
      { icon: '⚠️', labelKey: 'qaFraudAlert', action: 'Alert me on potential fraudulent claims' },
      { icon: '📤', labelKey: 'qaExportClaims', action: 'Export claims analysis report' },
    ],
    logistics: [
      { icon: '🚚', labelKey: 'qaRouteOptimize', action: 'Optimize delivery routes for efficiency' },
      { icon: '📦', labelKey: 'qaInventoryAnalysis', action: 'Analyze inventory levels and reorder points' },
      { icon: '📊', labelKey: 'qaSupplyChain', action: 'Generate supply chain performance report' },
      { icon: '🌐', labelKey: 'qaVendorAnalysis', action: 'Analyze vendor performance metrics' },
      { icon: '⚠️', labelKey: 'qaDelayAlert', action: 'Alert me on shipment delays' },
      { icon: '📤', labelKey: 'qaExportLogistics', action: 'Export logistics dashboard as PDF' },
    ],
    manufacturing: [
      { icon: '🏭', labelKey: 'qaProductionAnalysis', action: 'Analyze production efficiency metrics' },
      { icon: '🔧', labelKey: 'qaMaintenancePredict', action: 'Predict equipment maintenance needs' },
      { icon: '📊', labelKey: 'qaQualityReport', action: 'Generate quality control report' },
      { icon: '📋', labelKey: 'qaProcessOptimize', action: 'Optimize manufacturing processes' },
      { icon: '⚠️', labelKey: 'qaDefectAlert', action: 'Alert me on quality defect patterns' },
      { icon: '📤', labelKey: 'qaExportProduction', action: 'Export production analysis' },
    ],
    energy: [
      { icon: '⚡', labelKey: 'qaEnergyAnalysis', action: 'Analyze energy consumption patterns' },
      { icon: '🌱', labelKey: 'qaSustainability', action: 'Generate sustainability compliance report' },
      { icon: '📊', labelKey: 'qaGridAnalysis', action: 'Analyze grid performance metrics' },
      { icon: '🔋', labelKey: 'qaStorageOptimize', action: 'Optimize energy storage utilization' },
      { icon: '⚠️', labelKey: 'qaOutageAlert', action: 'Alert me on potential grid issues' },
      { icon: '📤', labelKey: 'qaExportEnergy', action: 'Export energy analysis report' },
    ],
  };
  return actions[verticalId] || null;
};

export default function AssistantModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [agentMode, setAgentMode] = useState('CONSULTANT');
  const [activeCategory, setActiveCategory] = useState('consulting');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#8b5cf6', secondary: '#7c3aed', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a0f28 50%, #0d1520 100%)', cardBorder: 'rgba(139,92,246,0.2)' };
  const moduleConfig = vertical?.modules?.assistant || { title: 'AI Agent', icon: '🤖' };
  const quickActions = getQuickActions(verticalId);

  const BASE_UI = {
    pageTitle: moduleConfig.title || 'Sovereign AI Agent',
    pageSubtitle: 'Your Advanced AI Intelligence Partner (v2.1.0)',
    
    // Input
    placeholder: 'Ask me anything or tell me what to do...',
    send: 'Send',
    thinking: 'Thinking...',
    executing: 'Executing action...',
    
    // Autonomous mode
    autonomousMode: 'Autonomous Mode',
    autonomousModeOn: 'Agent will act without approval',
    autonomousModeOff: 'Agent will ask before acting',
    
    // Agent Modes (Can now assume ANY role flexibly)
    agentModeLabel: 'Agent Mode',
    modeConsultant: 'Strategic Consultant',
    modeProjectManager: 'Project Manager',
    modeCoach: 'Executive Coach',
    modeAnalyst: 'Data Analyst',
    modeChangeManager: 'Change Manager',
    modeCommunicator: 'Communications',
    
    // Welcome (Updated for 2.1.0 capabilities)
    welcomeTitle: `Hello! I am ${vertical?.name || 'Sovereign'} - Your Advanced AI Intelligence Partner.`,
    welcomeMessage: `I'm your **Advanced AI Intelligence Partner** operating at 10+ years ahead of industry standards:

**🎯 Strategic Capabilities**
• Master-level expertise across 16+ domains
• Highest IQ tier with maximum cognitive capacity
• Solve problems impossible for others in the next decade
• Flexible role assumption for any organizational need

**📊 Business Operations**
Create projects, tasks, milestones • Track progress • Gantt charts • Resource allocation
Stakeholder analysis • Impact assessment • ADKAR framework • Adoption tracking

**🏛️ Strategic Intelligence**
SWOT analysis • Competitive intelligence • Benchmarking • Recommendations

**🎯 Executive Coaching**
Leadership assessment • Development plans • Team dynamics • Performance feedback

**📧 Communications**
Draft emails • Create presentations • Meeting summaries • Executive briefs

**📊 Advanced Analysis**
Deep analytics • Forecasting • Root cause analysis • Trend identification

Select a mode above and try any quick action below!`,
    
    // Quick actions labels (will be translated)
    qaGenerateReport: 'Generate Report',
    qaAnalyzeData: 'Analyze Data',
    qaTranslate: 'Translate',
    qaSchedule: 'Schedule Task',
    qaSetAlert: 'Set Alert',
    qaExport: 'Export PDF',
    qaAnalyzeThreat: 'Analyze Threats',
    qaSecurityAudit: 'Security Audit',
    qaMissionPlan: 'Mission Plan',
    qaClassifiedBrief: 'Intel Brief',
    qaExportReport: 'Export Report',
    qaTrialAnalysis: 'Trial Analysis',
    qaComplianceCheck: 'Compliance Check',
    qaLitReview: 'Literature Review',
    qaSafetyReport: 'Safety Report',
    qaAdverseAlert: 'Adverse Events',
    qaExportTrial: 'Export Trial',
    qaPatientAnalysis: 'Patient Analysis',
    qaProtocolReview: 'Protocol Review',
    qaDiagnosticSupport: 'Diagnostic Support',
    qaOutcomeReport: 'Outcome Report',
    qaCriticalAlert: 'Critical Alert',
    qaExportRecords: 'Export Records',
    qaMarketAnalysis: 'Market Analysis',
    qaRiskAssessment: 'Risk Assessment',
    qaComplianceAudit: 'Compliance Audit',
    qaFinancialReport: 'Financial Report',
    qaMarketAlert: 'Market Alert',
    qaExportPortfolio: 'Export Portfolio',
    qaClaimAnalysis: 'Claim Analysis',
    qaRiskProfile: 'Risk Profiles',
    qaUnderwriting: 'Underwriting',
    qaPremiumCalc: 'Premium Calc',
    qaFraudAlert: 'Fraud Alert',
    qaExportClaims: 'Export Claims',
    qaRouteOptimize: 'Route Optimize',
    qaInventoryAnalysis: 'Inventory',
    qaSupplyChain: 'Supply Chain',
    qaVendorAnalysis: 'Vendor Analysis',
    qaDelayAlert: 'Delay Alert',
    qaExportLogistics: 'Export Logistics',
    qaProductionAnalysis: 'Production',
    qaMaintenancePredict: 'Maintenance',
    qaQualityReport: 'Quality Report',
    qaProcessOptimize: 'Optimize',
    qaDefectAlert: 'Defect Alert',
    qaExportProduction: 'Export',
    qaEnergyAnalysis: 'Energy Analysis',
    qaSustainability: 'Sustainability',
    qaGridAnalysis: 'Grid Analysis',
    qaStorageOptimize: 'Storage',
    qaOutageAlert: 'Outage Alert',
    qaExportEnergy: 'Export Energy',
    
    // Status
    statusTitle: 'Agent Status',
    statusMode: 'Mode',
    statusAutonomous: 'Autonomous',
    statusSupervised: 'Supervised',
    statusQueue: 'Queue',
    statusTasks: 'tasks',
    statusExecutions: 'Executions',
    statusRules: 'Active Rules',
    
    // Errors
    errorGeneric: 'I apologize, I could not process that request.',
    errorNetwork: 'Connection error. Please try again.',
    
    // Action indicators
    actionExecuted: 'Action executed',
    actionSteps: 'steps',
    
    backToHome: verticalId ? `← Back to ${vertical?.name}` : '← Back to Home',
  };

  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { 
    const sp = new URLSearchParams(window.location.search); 
    const urlLang = sp.get('lang') || 'English';
    setLang(urlLang);
    // Set initial welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: BASE_UI.welcomeMessage,
      timestamp: new Date().toISOString(),
    }]);
    fetchAgentStatus();
  }, []);

  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_AGENT_${verticalId || 'MAIN'}_V3` });
      if (m) {
        setUi(t || BASE_UI);
        // Update welcome message with translation
        setMessages(prev => prev.map(msg => 
          msg.id === 'welcome' ? { ...msg, content: (t || BASE_UI).welcomeMessage } : msg
        ));
      }
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    }
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
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'system',
          content: data.message,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('Failed to toggle autonomous mode:', err);
    }
  };

  const handleSend = async (messageText = null) => {
    const text = messageText || inputValue.trim();
    if (!text || loading) return;
    
    const userMessage = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    
    // Detect if this is an action request
    const isAction = /^(generate|create|send|analyze|export|schedule|translate|alert|notify|optimize|calculate|review|check)/i.test(text);
    if (isAction) setIsExecuting(true);
    
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: text,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          context: { 
            language: lang,
            vertical: verticalId,
            verticalName: vertical?.name,
            verticalTagline: vertical?.tagline,
          },
        }),
      });
      const data = await res.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || ui.errorGeneric,
        timestamp: new Date().toISOString(),
        actionTaken: data.actionTaken,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.actionTaken) {
        fetchAgentStatus();
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ ${ui.errorNetwork}`,
        timestamp: new Date().toISOString(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div style={{ minHeight: '100vh', background: theme.gradient, direction: dir, display: 'flex', flexDirection: 'column' }}>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}

      {/* Header */}
      <header style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${theme.cardBorder}`, padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={homeLink} style={{ color: theme.primary, textDecoration: 'none', fontSize: '0.85rem' }}>{ui.backToHome}</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.75rem' }}>🤖</span>
              <div>
                <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{ui.pageTitle}</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.75rem' }}>{ui.pageSubtitle}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Agent Mode Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowModeSelector(!showModeSelector)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', 
                  background: `${AGENT_MODES[agentMode].color}20`, 
                  border: `1px solid ${AGENT_MODES[agentMode].color}40`, 
                  borderRadius: 8, 
                  color: '#fff', 
                  fontSize: '0.8rem', 
                  cursor: 'pointer' 
                }}
              >
                <span>{AGENT_MODES[agentMode].icon}</span>
                <span>{AGENT_MODES[agentMode].name}</span>
                <span style={{ opacity: 0.5 }}>▼</span>
              </button>
              {showModeSelector && (
                <div style={{ 
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'rgba(15,23,42,0.98)', border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 10, padding: 8, zIndex: 1000, minWidth: 200, 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                  {Object.values(AGENT_MODES).map(mode => (
                    <button 
                      key={mode.id}
                      onClick={() => { setAgentMode(mode.id); setShowModeSelector(false); }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 12px', background: agentMode === mode.id ? `${mode.color}20` : 'transparent',
                        border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{mode.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{mode.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{mode.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Autonomous Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{ui.autonomousMode}</span>
              <button onClick={toggleAutonomousMode} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: autonomousMode ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: autonomousMode ? 23 : 3, transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: 900, margin: '0 auto', width: '100%' }}>
          
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '85%', 
                  padding: '12px 16px', 
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                  background: msg.role === 'user' 
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})` 
                    : msg.role === 'system' 
                      ? 'rgba(16,185,129,0.15)' 
                      : 'rgba(255,255,255,0.08)',
                  border: msg.role === 'system' ? '1px solid rgba(16,185,129,0.3)' : 'none',
                }}>
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#fff', whiteSpace: 'pre-wrap' }} 
                       dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  {msg.actionTaken && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.15)', borderRadius: 8, fontSize: '0.75rem' }}>
                      ✅ {ui.actionExecuted}: {msg.actionTaken.status}
                      {msg.actionTaken.plan?.steps && (
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}> • {msg.actionTaken.plan.steps.length} {ui.actionSteps}</span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '16px 16px 16px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ 
                          width: 8, height: 8, borderRadius: '50%', 
                          background: theme.primary, 
                          animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s` 
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                      {isExecuting ? ui.executing : ui.thinking}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Category Tabs + Quick Actions */}
          <div style={{ borderTop: `1px solid ${theme.cardBorder}`, flexShrink: 0 }}>
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 24px', overflowX: 'auto', borderBottom: `1px solid ${theme.cardBorder}` }}>
              {Object.entries(QUICK_ACTION_CATEGORIES).map(([key, cat]) => (
                <button 
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  style={{ 
                    padding: '6px 12px', 
                    background: activeCategory === key ? `${AGENT_MODES[agentMode].color}25` : 'transparent', 
                    border: activeCategory === key ? `1px solid ${AGENT_MODES[agentMode].color}50` : '1px solid transparent',
                    borderRadius: 6, 
                    color: activeCategory === key ? '#fff' : 'rgba(255,255,255,0.6)', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </button>
              ))}
              {/* Vertical-specific tab if available */}
              {quickActions && (
                <button 
                  onClick={() => setActiveCategory('vertical')}
                  style={{ 
                    padding: '6px 12px', 
                    background: activeCategory === 'vertical' ? `${theme.primary}25` : 'transparent', 
                    border: activeCategory === 'vertical' ? `1px solid ${theme.primary}50` : '1px solid transparent',
                    borderRadius: 6, 
                    color: activeCategory === 'vertical' ? '#fff' : 'rgba(255,255,255,0.6)', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>⚡</span>
                  <span>{vertical?.name || 'Industry'}</span>
                </button>
              )}
            </div>
            
            {/* Quick Action Buttons */}
            <div style={{ padding: '10px 24px', display: 'flex', gap: 8, overflowX: 'auto' }}>
              {activeCategory === 'vertical' && quickActions ? (
                quickActions.map((qa, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(qa.action)} 
                    disabled={loading}
                    style={{ 
                      padding: '8px 14px', 
                      background: `${theme.primary}15`, 
                      border: `1px solid ${theme.cardBorder}`, 
                      borderRadius: 20, 
                      color: '#fff', 
                      fontSize: '0.75rem', 
                      cursor: loading ? 'not-allowed' : 'pointer', 
                      whiteSpace: 'nowrap', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>{qa.icon}</span>
                    <span>{ui[qa.labelKey] || qa.labelKey}</span>
                  </button>
                ))
              ) : (
                QUICK_ACTION_CATEGORIES[activeCategory]?.actions.map((qa, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(qa.action)} 
                    disabled={loading}
                    style={{ 
                      padding: '8px 14px', 
                      background: `${AGENT_MODES[agentMode].color}15`, 
                      border: `1px solid ${AGENT_MODES[agentMode].color}30`, 
                      borderRadius: 20, 
                      color: '#fff', 
                      fontSize: '0.75rem', 
                      cursor: loading ? 'not-allowed' : 'pointer', 
                      whiteSpace: 'nowrap', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      opacity: loading ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>{qa.icon}</span>
                    <span>{qa.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Input Area */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.cardBorder}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '4px 4px 4px 16px', border: `1px solid ${theme.cardBorder}` }}>
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                onKeyPress={handleKeyPress} 
                placeholder={ui.placeholder} 
                disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', outline: 'none' }} 
              />
              <button 
                onClick={() => handleSend()} 
                disabled={loading || !inputValue.trim()} 
                style={{ 
                  padding: '12px 24px', 
                  background: loading || !inputValue.trim() ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`, 
                  border: 'none', 
                  borderRadius: 8, 
                  color: '#fff', 
                  fontSize: '0.9rem', 
                  fontWeight: 600, 
                  cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer', 
                  opacity: loading || !inputValue.trim() ? 0.5 : 1 
                }}
              >
                {ui.send}
              </button>
            </div>
          </div>
        </div>
      </div>

      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      
      <style jsx global>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
