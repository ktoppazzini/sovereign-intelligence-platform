'use client';
// app/universal-industry-plan/dashboard/TransformationDashboard.client.jsx
// [KT:DASHBOARD-CLIENT-v2.0] Interactive Progress Tracking Dashboard
// Role-based views at EVERY level, dynamic translation, continuous learning

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ============================================================================
// Dynamic Translation Hook
// ============================================================================
function useTranslation(lang) {
  const [labels, setLabels] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadTranslations() {
      if (!lang || lang === 'en' || lang === 'English') {
        setLabels(DASHBOARD_LABELS_EN);
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'json',
            targetLang: lang,
            labelsToTranslate: DASHBOARD_LABELS_EN,
          }),
        });
        
        const json = await res.json();
        setLabels(json.translatedLabels || DASHBOARD_LABELS_EN);
      } catch (e) {
        console.error('Translation error:', e);
        setLabels(DASHBOARD_LABELS_EN);
      } finally {
        setLoading(false);
      }
    }
    
    loadTranslations();
  }, [lang]);
  
  return { labels: labels || DASHBOARD_LABELS_EN, loading };
}

// ============================================================================
// English Labels (Base for Translation)
// ============================================================================
const DASHBOARD_LABELS_EN = {
  // Page titles
  pageTitle: 'Transformation Progress Dashboard',
  pageSubtitle: 'Track, adapt, and evolve your strategic transformation in real-time',
  
  // Navigation
  overview: 'Overview',
  milestones: 'Milestones',
  insights: 'AI Insights',
  reports: 'Report History',
  team: 'Team Progress',
  
  // Stats
  overallProgress: 'Overall Progress',
  totalMilestones: 'Total',
  completed: 'Completed',
  inProgress: 'In Progress',
  blocked: 'Blocked',
  notStarted: 'Not Started',
  
  // Role levels
  roleExecutive: 'Executive View',
  roleSeniorManager: 'Senior Manager View',
  roleProfessional: 'Professional View',
  roleTechnician: 'Technician View',
  roleSupport: 'Support Staff View',
  
  // Actions
  updateProgress: 'Update Progress',
  regenerateReport: 'Regenerate Report',
  viewInsights: 'View AI Insights',
  addMilestone: 'Add Milestone',
  exportReport: 'Export Report',
  
  // Filters
  filterByCategory: 'Filter by Category',
  filterByStatus: 'Filter by Status',
  filterByRole: 'Filter by Role',
  allCategories: 'All Categories',
  allStatuses: 'All Statuses',
  
  // Categories
  catStrategic: 'Strategic',
  catOperational: 'Operational',
  catTechnical: 'Technical',
  catOrganizational: 'Organizational',
  catFinancial: 'Financial',
  catCompliance: 'Compliance',
  
  // Status
  statusNotStarted: 'Not Started',
  statusInProgress: 'In Progress',
  statusBlocked: 'Blocked',
  statusCompleted: 'Completed',
  statusDeferred: 'Deferred',
  
  // Insights
  recommendations: 'AI Recommendations',
  patterns: 'Pattern Analysis',
  predictions: 'Predictions',
  blockerAnalysis: 'Blocker Analysis',
  opportunities: 'Opportunities',
  
  // Learning
  learningFromProgress: 'Learning from your progress...',
  insightsUpdated: 'AI insights updated',
  patternDetected: 'New pattern detected',
  
  // Modals
  updateProgressTitle: 'Update Progress',
  regenerateTitle: 'Regenerate Report',
  notes: 'Notes',
  blockers: 'Blockers',
  achievements: 'Achievements',
  addBlocker: 'Add Blocker',
  addAchievement: 'Add Achievement',
  cancel: 'Cancel',
  save: 'Save',
  
  // Regeneration types
  regenProgressUpdate: 'Progress Update Report',
  regenProgressDesc: 'Generate a new report that acknowledges your progress and provides updated recommendations',
  regenPivot: 'Strategic Pivot',
  regenPivotDesc: 'Major strategy shift - regenerate with new direction based on learnings and blockers',
  regenDeepDive: 'Deep Dive Analysis',
  regenDeepDiveDesc: 'Focus on specific areas that need more detailed guidance',
  regenFull: 'Full Refresh',
  regenFullDesc: 'Complete regeneration with current market conditions and your progress context',
  recommended: 'Recommended',
  
  // Getting started
  gettingStarted: 'Getting Started',
  step1: 'Generate a transformation report from the main form',
  step2: 'Click "Track Progress" on your report',
  step3: 'Monitor and update milestones as you execute',
  step4: 'Regenerate reports to adapt your strategy',
  generateFirst: 'Generate Your First Report',
  
  // Activity
  recentActivity: 'Recent Activity',
  reportHistory: 'Report History',
  version: 'Version',
  
  // Errors
  errorLoading: 'Error Loading Dashboard',
  retry: 'Retry',
  noMilestones: 'No milestones match your filters',
  
  // AI Insights specific
  quickWins: 'Quick Wins',
  riskAlerts: 'Risk Alerts',
  emergingTrends: 'Emerging Trends',
  successPatterns: 'Success Patterns',
  blockerPatterns: 'Blocker Patterns',
  competitiveAdvantages: 'Competitive Advantages',
};

// ============================================================================
// ROLE-BASED VIEWS - Every Level (ISCO-08 Based)
// ============================================================================
const ROLE_LEVELS = {
  executive: {
    label: 'Executive View',
    icon: '👔',
    viewScope: 'Strategic overview with business impact metrics',
    focusAreas: ['ROI', 'Strategic Goals', 'Risk Overview', 'Board Metrics'],
    dashboardType: 'executive_summary',
    showDetails: ['strategic', 'financial'],
    kpis: ['revenue_impact', 'market_position', 'transformation_velocity', 'risk_score'],
  },
  senior_manager: {
    label: 'Senior Manager View',
    icon: '📊',
    viewScope: 'Department-level progress and resource allocation',
    focusAreas: ['Team Progress', 'Resource Utilization', 'Dependencies', 'Bottlenecks'],
    dashboardType: 'management_overview',
    showDetails: ['strategic', 'operational', 'organizational'],
    kpis: ['team_velocity', 'resource_efficiency', 'blocker_resolution', 'milestone_completion'],
  },
  professional: {
    label: 'Professional View',
    icon: '💼',
    viewScope: 'Project execution and technical implementation',
    focusAreas: ['Tasks', 'Technical Details', 'Quality Metrics', 'Collaboration'],
    dashboardType: 'project_execution',
    showDetails: ['operational', 'technical'],
    kpis: ['task_completion', 'quality_score', 'technical_debt', 'collaboration_index'],
  },
  technician: {
    label: 'Technician View',
    icon: '🔧',
    viewScope: 'Technical tasks and implementation details',
    focusAreas: ['Technical Tasks', 'System Status', 'Issue Tracking', 'Documentation'],
    dashboardType: 'technical_details',
    showDetails: ['technical', 'compliance'],
    kpis: ['tasks_completed', 'issues_resolved', 'system_uptime', 'documentation_coverage'],
  },
  support: {
    label: 'Support Staff View',
    icon: '🤝',
    viewScope: 'Individual tasks and team coordination',
    focusAreas: ['My Tasks', 'Team Updates', 'Training', 'Support Tickets'],
    dashboardType: 'individual_tasks',
    showDetails: ['organizational', 'compliance'],
    kpis: ['personal_tasks', 'training_progress', 'support_tickets', 'team_contribution'],
  },
};

// ============================================================================
// Progress Status Colors & Icons
// ============================================================================
const STATUS_CONFIG = {
  not_started: { color: 'bg-slate-500', text: 'Not Started', icon: '○' },
  in_progress: { color: 'bg-blue-500', text: 'In Progress', icon: '◐' },
  blocked: { color: 'bg-red-500', text: 'Blocked', icon: '⊘' },
  completed: { color: 'bg-emerald-500', text: 'Completed', icon: '●' },
  deferred: { color: 'bg-amber-500', text: 'Deferred', icon: '◇' },
};

const CATEGORY_ICONS = {
  strategic: '🎯',
  operational: '⚙️',
  technical: '💻',
  organizational: '👥',
  financial: '💰',
  compliance: '📋',
};

// ============================================================================
// Main Dashboard Component
// ============================================================================
export default function TransformationDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const transformationId = searchParams.get('id');
  const companyId = searchParams.get('companyId');
  const roleParam = searchParams.get('role');
  const lang = searchParams.get('lang') || 'en';
  
  // Dynamic translation
  const { labels, loading: translationLoading } = useTranslation(lang);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentRole, setCurrentRole] = useState(roleParam || 'professional');
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  // ============================================================================
  // Fetch Progress Data
  // ============================================================================
  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (transformationId) params.set('transformationId', transformationId);
      if (companyId) params.set('companyId', companyId);
      if (currentRole) params.set('role', currentRole);
      
      const res = await fetch(`/api/universal-industry-plan/progress?${params}`);
      const json = await res.json();
      
      if (!json.ok) throw new Error(json.error);
      
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [transformationId, companyId, currentRole]);
  
  useEffect(() => {
    if (transformationId || companyId) {
      fetchProgress();
    } else {
      setLoading(false);
    }
  }, [fetchProgress, transformationId, companyId]);
  
  // ============================================================================
  // Fetch AI Insights (Continuous Learning)
  // ============================================================================
  const fetchAiInsights = useCallback(async () => {
    if (!transformationId) return;
    
    setInsightsLoading(true);
    try {
      const params = new URLSearchParams({
        transformationId,
        role: currentRole,
        lang,
      });
      
      const res = await fetch(`/api/universal-industry-plan/progress/ai-insights?${params}`);
      const json = await res.json();
      
      if (json.ok) {
        setAiInsights(json);
      }
    } catch (e) {
      console.error('Error fetching AI insights:', e);
    } finally {
      setInsightsLoading(false);
    }
  }, [transformationId, currentRole, lang]);
  
  useEffect(() => {
    if (showInsightsPanel && !aiInsights) {
      fetchAiInsights();
    }
  }, [showInsightsPanel, aiInsights, fetchAiInsights]);
  
  // ============================================================================
  // Update Progress (with AI Learning)
  // ============================================================================
  const handleUpdateProgress = async (updateData) => {
    try {
      const res = await fetch('/api/universal-industry-plan/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          transformationId,
          ...updateData,
        }),
      });
      
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      
      // Trigger AI learning from this update
      if (updateData.blockers?.length > 0 || updateData.achievements?.length > 0) {
        fetch('/api/universal-industry-plan/progress/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: updateData.blockers?.length > 0 ? 'learn_from_blocker' : 'learn_from_success',
            transformationId,
            milestoneId: updateData.milestoneId,
            industry: data?.transformation?.industry,
            role: currentRole,
            blockers: updateData.blockers,
            achievements: updateData.achievements,
            lang,
          }),
        }).catch(e => console.warn('AI learning error:', e));
      }
      
      setShowUpdateModal(false);
      setAiInsights(null); // Clear cached insights to force refresh
      fetchProgress(); // Refresh data
    } catch (e) {
      alert('Error updating progress: ' + e.message);
    }
  };
  
  // ============================================================================
  // Trigger Report Regeneration
  // ============================================================================
  const handleRegenerate = async (regenerationType) => {
    try {
      const res = await fetch('/api/universal-industry-plan/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_report',
          transformationId,
          regenerationType,
        }),
      });
      
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      
      // Redirect to report generation with context
      const params = new URLSearchParams({
        regenerate: 'true',
        transformationId,
        type: regenerationType,
        context: JSON.stringify(json.regenerationContext),
      });
      
      router.push(`/universal-industry-plan?${params}`);
    } catch (e) {
      alert('Error initiating regeneration: ' + e.message);
    }
  };
  
  // ============================================================================
  // Filter Milestones (Role-Based)
  // ============================================================================
  const roleConfig = ROLE_LEVELS[currentRole] || ROLE_LEVELS.professional;
  
  const filteredMilestones = data?.transformation?.milestones?.filter(m => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    // Role-based filtering: show only relevant categories
    if (!roleConfig.showDetails.includes(m.category)) return false;
    return true;
  }) || [];
  
  // ============================================================================
  // No Data State (with Translation)
  // ============================================================================
  if (!transformationId && !companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              🎯 {labels.pageTitle}
            </h1>
            <p className="text-white/70 text-lg mb-8">
              {labels.pageSubtitle}
            </p>
            <div className="bg-white/10 rounded-2xl p-8 text-left">
              <h2 className="text-xl font-semibold text-white mb-4">{labels.gettingStarted}</h2>
              <ol className="space-y-4 text-white/80">
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</span>
                  <span>{labels.step1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</span>
                  <span>{labels.step2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</span>
                  <span>{labels.step3}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">4</span>
                  <span>{labels.step4}</span>
                </li>
              </ol>
            </div>
            <a
              href={`/universal-industry-plan?lang=${lang}`}
              className="inline-block mt-8 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              {labels.generateFirst} →
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // Loading State
  // ============================================================================
  if (loading || translationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/70">Loading transformation data...</p>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // Error State
  // ============================================================================
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-white/70">{error}</p>
          <button
            onClick={fetchProgress}
            className="mt-4 px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  const transformation = data?.transformation;
  const stats = transformation?.stats || {};
  
  // ============================================================================
  // Main Dashboard Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {transformation?.companyName || labels.pageTitle}
              </h1>
              <p className="text-white/60 mt-1">
                {transformation?.industry} • {transformation?.country}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowInsightsPanel(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all flex items-center gap-2"
              >
                🧠 {labels.viewInsights}
              </button>
              <button
                onClick={() => setShowRegenerateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all flex items-center gap-2"
              >
                🔄 {labels.regenerateReport}
              </button>
            </div>
          </div>
        </div>
        
        {/* Role Switcher - Every Level */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/60 text-sm">{labels.filterByRole}:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_LEVELS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setCurrentRole(key);
                  setAiInsights(null); // Clear insights to refresh for new role
                }}
                className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                  currentRole === key
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-transparent text-white'
                    : 'border-white/20 text-white/60 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <span>{config.icon}</span>
                <span className="hidden md:inline">{config.label}</span>
              </button>
            ))}
          </div>
          {/* Role Description */}
          <div className="mt-3 p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 text-white">
              <span className="text-xl">{roleConfig.icon}</span>
              <span className="font-medium">{roleConfig.label}</span>
            </div>
            <p className="text-white/50 text-sm mt-1">{roleConfig.viewScope}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {roleConfig.focusAreas.map((area, i) => (
                <span key={i} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Overall Progress */}
          <div className="col-span-2 md:col-span-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(transformation?.overallProgress || 0) * 2.51} 251`}
                    className="text-emerald-500"
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-white">
                  {transformation?.overallProgress || 0}%
                </span>
              </div>
              <p className="text-white/60 mt-2 text-sm">Overall Progress</p>
            </div>
          </div>
          
          {/* Stat Cards */}
          {[
            { label: 'Total', value: stats.totalMilestones || 0, color: 'text-white' },
            { label: 'Completed', value: stats.completed || 0, color: 'text-emerald-400' },
            { label: 'In Progress', value: stats.inProgress || 0, color: 'text-blue-400' },
            { label: 'Blocked', value: stats.blocked || 0, color: 'text-red-400' },
          ].map((stat, i) => (
            <div key={i} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-white/60 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        
        {/* Filters */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">{labels.filterByCategory}</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">{labels.allCategories}</option>
                {roleConfig.showDetails.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">{labels.filterByStatus}</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">{labels.allStatuses}</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.text}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg">
                {roleConfig.icon} {roleConfig.label}
              </span>
            </div>
          </div>
        </div>
        
        {/* Milestones List */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">
              🎯 Milestones ({filteredMilestones.length})
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {filteredMilestones.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                No milestones match your filters
              </div>
            ) : (
              filteredMilestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  onUpdate={() => {
                    setSelectedMilestone(milestone);
                    setShowUpdateModal(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Recent Activity */}
        {transformation?.progressUpdates?.length > 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">📝 Recent Activity</h2>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {transformation.progressUpdates.slice(0, 10).map((update, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full mt-1.5 ${STATUS_CONFIG[update.status]?.color || 'bg-gray-500'}`} />
                  <div className="flex-1">
                    <p className="text-white/80">{update.notes || 'Progress updated'}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {update.updatedBy} ({update.updatedByRole}) • {new Date(update.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Report History */}
        {transformation?.reportHistory?.length > 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">📊 Report History</h2>
            </div>
            <div className="p-4">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {transformation.reportHistory.map((report, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-4 min-w-[200px] hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="text-white font-medium">Version {report.version}</div>
                    <div className="text-white/50 text-sm mt-1">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Update Progress Modal */}
      {showUpdateModal && selectedMilestone && (
        <UpdateProgressModal
          milestone={selectedMilestone}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedMilestone(null);
          }}
          onSubmit={handleUpdateProgress}
          labels={labels}
        />
      )}
      
      {/* Regenerate Report Modal */}
      {showRegenerateModal && (
        <RegenerateModal
          onClose={() => setShowRegenerateModal(false)}
          onRegenerate={handleRegenerate}
          progress={transformation?.overallProgress || 0}
          labels={labels}
        />
      )}
      
      {/* AI Insights Panel */}
      {showInsightsPanel && (
        <AiInsightsPanel
          insights={aiInsights}
          loading={insightsLoading}
          onClose={() => setShowInsightsPanel(false)}
          onRefresh={() => {
            setAiInsights(null);
            fetchAiInsights();
          }}
          roleConfig={roleConfig}
          labels={labels}
        />
      )}
    </div>
  );
}

// ============================================================================
// Milestone Row Component
// ============================================================================
function MilestoneRow({ milestone, onUpdate }) {
  const statusConfig = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.not_started;
  const categoryIcon = CATEGORY_ICONS[milestone.category] || '📌';
  
  return (
    <div className="p-4 hover:bg-white/5 transition-all">
      <div className="flex items-center gap-4">
        {/* Status & Progress */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className={`w-10 h-10 rounded-full ${statusConfig.color} flex items-center justify-center text-white text-lg mx-auto`}>
            {statusConfig.icon}
          </div>
          <div className="text-white/60 text-xs mt-1">{milestone.progress}%</div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryIcon}</span>
            <h3 className="text-white font-medium truncate">{milestone.title}</h3>
          </div>
          {milestone.description && (
            <p className="text-white/50 text-sm mt-1 line-clamp-2">{milestone.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded">
              Priority: {milestone.priority}
            </span>
            {milestone.targetDate && (
              <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded">
                Target: {new Date(milestone.targetDate).toLocaleDateString()}
              </span>
            )}
            {milestone.roles?.length > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                {milestone.roles.length} roles
              </span>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="hidden md:block w-32">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${statusConfig.color} transition-all`}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </div>
        
        {/* Update Button */}
        <button
          onClick={onUpdate}
          className="flex-shrink-0 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
        >
          Update
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Update Progress Modal
// ============================================================================
function UpdateProgressModal({ milestone, onClose, onSubmit }) {
  const [status, setStatus] = useState(milestone.status);
  const [progress, setProgress] = useState(milestone.progress);
  const [notes, setNotes] = useState('');
  const [blocker, setBlocker] = useState('');
  const [blockers, setBlockers] = useState([]);
  const [achievement, setAchievement] = useState('');
  const [achievements, setAchievements] = useState([]);
  
  const handleSubmit = () => {
    onSubmit({
      milestoneId: milestone.id,
      status,
      progress,
      notes,
      blockers,
      achievements,
      updatedBy: 'User', // Would come from auth
      updatedByRole: 'Team Member', // Would come from user profile
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Update Progress</h2>
          <p className="text-white/60 mt-1">{milestone.title}</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="text-white/80 text-sm block mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    status === key
                      ? `${config.color} border-transparent text-white`
                      : 'border-white/20 text-white/60 hover:border-white/40'
                  }`}
                >
                  {config.icon} {config.text}
                </button>
              ))}
            </div>
          </div>
          
          {/* Progress Slider */}
          <div>
            <label className="text-white/80 text-sm block mb-2">
              Progress: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-white/80 text-sm block mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 resize-none"
              placeholder="What progress was made?"
            />
          </div>
          
          {/* Blockers */}
          <div>
            <label className="text-white/80 text-sm block mb-2">Blockers</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/30"
                placeholder="Add a blocker..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && blocker.trim()) {
                    setBlockers([...blockers, blocker.trim()]);
                    setBlocker('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (blocker.trim()) {
                    setBlockers([...blockers, blocker.trim()]);
                    setBlocker('');
                  }
                }}
                className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
              >
                Add
              </button>
            </div>
            {blockers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockers.map((b, i) => (
                  <span
                    key={i}
                    className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {b}
                    <button onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Achievements */}
          <div>
            <label className="text-white/80 text-sm block mb-2">Achievements</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/30"
                placeholder="Add an achievement..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && achievement.trim()) {
                    setAchievements([...achievements, achievement.trim()]);
                    setAchievement('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (achievement.trim()) {
                    setAchievements([...achievements, achievement.trim()]);
                    setAchievement('');
                  }
                }}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30"
              >
                Add
              </button>
            </div>
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {achievements.map((a, i) => (
                  <span
                    key={i}
                    className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {a}
                    <button onClick={() => setAchievements(achievements.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Regenerate Report Modal
// ============================================================================
function RegenerateModal({ onClose, onRegenerate, progress }) {
  const regenerationTypes = [
    {
      id: 'progress_update',
      title: '📊 Progress Update Report',
      description: 'Generate a new report that acknowledges your progress and provides updated recommendations',
      recommended: progress > 20 && progress < 80,
    },
    {
      id: 'pivot',
      title: '🔄 Strategic Pivot',
      description: 'Major strategy shift - regenerate with new direction based on learnings and blockers',
      recommended: false,
    },
    {
      id: 'deep_dive',
      title: '🔬 Deep Dive Analysis',
      description: 'Focus on specific areas that need more detailed guidance',
      recommended: false,
    },
    {
      id: 'full',
      title: '🆕 Full Refresh',
      description: 'Complete regeneration with current market conditions and your progress context',
      recommended: progress >= 80,
    },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">🔄 Regenerate Report</h2>
          <p className="text-white/60 mt-1">
            Your new report will include your progress ({progress}%) and adapt recommendations accordingly
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {regenerationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onRegenerate(type.id)}
              className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium group-hover:text-blue-300 transition-colors">
                    {type.title}
                  </h3>
                  <p className="text-white/50 text-sm mt-1">{type.description}</p>
                </div>
                {type.recommended && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI Insights Panel (Continuous Learning)
// ============================================================================
function AiInsightsPanel({ insights, loading, onClose, onRefresh, roleConfig, labels }) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/70">{labels.learningFromProgress}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl my-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              🧠 {labels.insights} - {roleConfig.label}
            </h2>
            <p className="text-white/60 mt-1">
              AI-powered recommendations personalized for your role
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              title="Refresh insights"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Recommendations */}
          {insights?.recommendations && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                💡 {labels.recommendations}
              </h3>
              <div className="grid gap-3">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{rec.icon || '💡'}</span>
                      <div>
                        <h4 className="text-white font-medium">{rec.title}</h4>
                        <p className="text-white/60 text-sm mt-1">{rec.description}</p>
                        {rec.priority && (
                          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                            rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                            rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {rec.priority} priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Quick Wins */}
          {insights?.quickWins?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                ⚡ {labels.quickWins}
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.quickWins.map((win, i) => (
                  <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-white">{win}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Risk Alerts */}
          {insights?.risks?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                ⚠️ {labels.riskAlerts}
              </h3>
              <div className="space-y-3">
                {insights.risks.map((risk, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">🚨</span>
                      <div>
                        <h4 className="text-white font-medium">{risk.title}</h4>
                        <p className="text-white/60 text-sm mt-1">{risk.description}</p>
                        {risk.mitigation && (
                          <p className="text-emerald-400 text-sm mt-2">
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Patterns Detected */}
          {insights?.patterns && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                📊 {labels.patterns}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {insights.patterns.successPatterns?.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <h4 className="text-emerald-300 font-medium mb-2">{labels.successPatterns}</h4>
                    <ul className="space-y-2">
                      {insights.patterns.successPatterns.map((p, i) => (
                        <li key={i} className="text-white/80 text-sm flex items-center gap-2">
                          <span className="text-emerald-400">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.patterns.blockerPatterns?.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <h4 className="text-amber-300 font-medium mb-2">{labels.blockerPatterns}</h4>
                    <ul className="space-y-2">
                      {insights.patterns.blockerPatterns.map((p, i) => (
                        <li key={i} className="text-white/80 text-sm flex items-center gap-2">
                          <span className="text-amber-400">!</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Predictions */}
          {insights?.predictions && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                🔮 {labels.predictions}
              </h3>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-purple-300">
                      {insights.predictions.estimatedCompletion || 'N/A'}
                    </div>
                    <p className="text-white/60 text-sm">Est. Completion</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-300">
                      {insights.predictions.velocity || 'N/A'}
                    </div>
                    <p className="text-white/60 text-sm">Current Velocity</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-300">
                      {insights.predictions.confidence || 'N/A'}%
                    </div>
                    <p className="text-white/60 text-sm">Confidence</p>
                  </div>
                </div>
                {insights.predictions.trajectory && (
                  <p className="text-white/70 text-sm mt-4 text-center">
                    {insights.predictions.trajectory}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Opportunities */}
          {insights?.opportunities?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                🌟 {labels.opportunities}
              </h3>
              <div className="grid gap-3">
                {insights.opportunities.map((opp, i) => (
                  <div key={i} className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💎</span>
                      <div>
                        <h4 className="text-white font-medium">{opp.title}</h4>
                        <p className="text-white/60 text-sm mt-1">{opp.description}</p>
                        {opp.impact && (
                          <p className="text-amber-300 text-sm mt-2">
                            <strong>Impact:</strong> {opp.impact}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Learning Status */}
          {insights?.learningStatus && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <span className="animate-pulse">🧠</span>
                <span>
                  AI continuously learning from {insights.learningStatus.totalUpdates || 0} updates, 
                  {insights.learningStatus.totalBlockers || 0} blockers resolved, 
                  {insights.learningStatus.totalSuccesses || 0} successes
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-500 hover:to-orange-500 transition-all"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
}
