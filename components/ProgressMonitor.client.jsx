'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * ProgressMonitor Component
 * ═══════════════════════════════════════════════════════════════════════════
 * AI-powered implementation monitoring that:
 * - Tracks KPIs over time, detects changes, and provides AI recommendations
 * - Autonomously monitors implementation progress
 * - Generates status updates and communications
 * - Manages tasks and adjustments
 * - Prepares training and change management activities
 * - Updates dashboards with AI insights
 * 
 * @version 3.0.0 - Full autonomous AI capabilities
 */
export default function ProgressMonitor({
  verticalId,
  organizationName,
  categories = [],
  historicalData = [],
  color = '#3b82f6',
  lang = 'English',
  onAIRecommendation,
  projectData = null,
  teamMembers = [],
}) {
  const [metrics, setMetrics] = useState([]);
  const [trends, setTrends] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  
  // NEW: Autonomous AI State
  const [activeTab, setActiveTab] = useState('monitor'); // monitor, tasks, training, change, artifacts, status
  const [dashboardInsights, setDashboardInsights] = useState(null);
  const [projectArtifacts, setProjectArtifacts] = useState(null);
  const [taskAssignments, setTaskAssignments] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [changePlan, setChangePlan] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [implementationMonitor, setImplementationMonitor] = useState(null);
  const [aiGenerating, setAiGenerating] = useState({});
  const [autoMonitorEnabled, setAutoMonitorEnabled] = useState(false);

  // Initialize metrics based on categories
  useEffect(() => {
    if (categories.length > 0) {
      initializeMetrics();
    }
  }, [categories]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshMetrics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const initializeMetrics = () => {
    const initialMetrics = categories.map(catId => ({
      id: catId,
      name: catId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      currentValue: Math.random() * 30 + 70, // 70-100 range
      previousValue: Math.random() * 30 + 65,
      target: 85,
      unit: '%',
      trend: 'stable',
      lastChange: new Date().toISOString(),
    }));
    setMetrics(initialMetrics);
    calculateTrends(initialMetrics);
    setLastUpdated(new Date());
  };

  const calculateTrends = (metricsData) => {
    const newTrends = {};
    metricsData.forEach(metric => {
      const change = metric.currentValue - metric.previousValue;
      const percentChange = (change / metric.previousValue) * 100;
      
      newTrends[metric.id] = {
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
        percentChange: percentChange.toFixed(1),
        vsTarget: metric.currentValue - metric.target,
        status: metric.currentValue >= metric.target ? 'on-track' : 
                metric.currentValue >= metric.target * 0.9 ? 'at-risk' : 'off-track',
      };
    });
    setTrends(newTrends);
    
    // Generate alerts for significant changes
    generateAlerts(metricsData, newTrends);
  };

  const generateAlerts = (metricsData, trendsData) => {
    const newAlerts = [];
    
    metricsData.forEach(metric => {
      const trend = trendsData[metric.id];
      if (!trend) return;
      
      // Alert for significant drops
      if (trend.direction === 'down' && Math.abs(parseFloat(trend.percentChange)) > 5) {
        newAlerts.push({
          id: `${metric.id}-drop-${Date.now()}`,
          type: 'warning',
          metric: metric.name,
          message: `${metric.name} dropped ${Math.abs(trend.percentChange)}% from previous period`,
          timestamp: new Date().toISOString(),
          severity: Math.abs(parseFloat(trend.percentChange)) > 10 ? 'high' : 'medium',
        });
      }
      
      // Alert for off-track metrics
      if (trend.status === 'off-track') {
        newAlerts.push({
          id: `${metric.id}-offtarget-${Date.now()}`,
          type: 'critical',
          metric: metric.name,
          message: `${metric.name} is ${Math.abs(trend.vsTarget).toFixed(1)}% below target`,
          timestamp: new Date().toISOString(),
          severity: 'high',
        });
      }
      
      // Alert for positive achievements
      if (trend.direction === 'up' && parseFloat(trend.percentChange) > 10) {
        newAlerts.push({
          id: `${metric.id}-improvement-${Date.now()}`,
          type: 'success',
          metric: metric.name,
          message: `${metric.name} improved ${trend.percentChange}% - exceeding expectations`,
          timestamp: new Date().toISOString(),
          severity: 'info',
        });
      }
    });
    
    setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep last 10 alerts
  };

  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    
    // Simulate metric refresh with slight variations
    setTimeout(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        previousValue: metric.currentValue,
        currentValue: Math.max(0, Math.min(100, metric.currentValue + (Math.random() - 0.5) * 10)),
        lastChange: new Date().toISOString(),
      })));
      
      setLastUpdated(new Date());
      setLoading(false);
    }, 1000);
  }, []);

  // Recalculate trends when metrics change
  useEffect(() => {
    if (metrics.length > 0) {
      calculateTrends(metrics);
    }
  }, [metrics]);

  const requestAIAnalysis = async () => {
    setAiAnalyzing(true);
    
    try {
      const response = await fetch('/api/progress/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verticalId,
          organizationName,
          metrics,
          trends,
          alerts,
          lang,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (onAIRecommendation) {
          onAIRecommendation(data.recommendations);
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS AI FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Auto-monitor implementation progress
  useEffect(() => {
    if (!autoMonitorEnabled) return;
    
    const interval = setInterval(() => {
      monitorImplementation();
      updateDashboardInsights();
    }, 60000); // Every minute when auto-monitoring is enabled

    return () => clearInterval(interval);
  }, [autoMonitorEnabled, metrics, trends, alerts]);

  // Update dashboard with AI insights
  const updateDashboardInsights = async () => {
    setAiGenerating(prev => ({ ...prev, dashboard: true }));
    
    try {
      const metricsObj = {};
      metrics.forEach(m => { metricsObj[m.name] = `${m.currentValue.toFixed(1)}${m.unit}`; });
      
      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-dashboard',
          metrics: metricsObj,
          alerts: alerts.slice(0, 10),
          trends,
          projectStatus: implementationMonitor?.healthStatus || 'In Progress',
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDashboardInsights(data.dashboardInsights);
      }
    } catch (err) {
      console.error('Dashboard update failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, dashboard: false }));
    }
  };

  // Monitor implementation progress
  const monitorImplementation = async () => {
    setAiGenerating(prev => ({ ...prev, monitor: true }));
    
    try {
      const milestones = projectData?.milestones || categories.map((cat, i) => ({
        name: cat.replace(/_/g, ' '),
        status: trends[cat]?.status || 'in_progress',
        progress: Math.round((metrics.find(m => m.id === cat)?.currentValue || 0)),
        dueDate: `Week ${i + 2}`,
      }));

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitor-implementation',
          projectId: `${organizationName || 'Project'}-${verticalId}`,
          milestones,
          currentStatus: getOverallStatus(),
          metrics: {
            onTrack: Object.values(trends).filter(t => t.status === 'on-track').length,
            atRisk: Object.values(trends).filter(t => t.status === 'at-risk').length,
            offTrack: Object.values(trends).filter(t => t.status === 'off-track').length,
            improving: Object.values(trends).filter(t => t.direction === 'up').length,
          },
          issues: alerts.filter(a => a.type === 'critical' || a.type === 'warning'),
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImplementationMonitor(data.monitoring);
        
        // Auto-generate adjustments if off-track
        if (data.monitoring?.healthStatus === 'off-track' && data.monitoring?.adjustments) {
          console.log('AI Auto-Adjustment:', data.monitoring.adjustments);
        }
      }
    } catch (err) {
      console.error('Implementation monitoring failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, monitor: false }));
    }
  };

  // Generate project artifacts
  const generateProjectArtifacts = async () => {
    setAiGenerating(prev => ({ ...prev, artifacts: true }));
    
    try {
      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-project-artifacts',
          projectName: `${organizationName || 'Organization'} - ${verticalId} Transformation`,
          projectType: 'Reform Initiative',
          scope: {
            objectives: categories.map(c => `Improve ${c.replace(/_/g, ' ')}`),
          },
          stakeholders: teamMembers,
          timeline: '6 months',
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProjectArtifacts(data.artifacts);
      }
    } catch (err) {
      console.error('Project artifact generation failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, artifacts: false }));
    }
  };

  // Assign tasks to team
  const assignTasksToTeam = async () => {
    if (!teamMembers || teamMembers.length === 0) {
      alert('No team members defined. Add team members to assign tasks.');
      return;
    }
    
    setAiGenerating(prev => ({ ...prev, tasks: true }));
    
    try {
      const tasks = implementationMonitor?.quickWins?.map((qw, i) => ({
        name: qw.action,
        duration: qw.timeframe,
        priority: 'high',
        skills: ['General'],
      })) || categories.map(c => ({
        name: `Implement ${c.replace(/_/g, ' ')} improvements`,
        duration: '2 weeks',
        priority: trends[c]?.status === 'off-track' ? 'high' : 'medium',
        skills: ['Project Management'],
      }));

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign-tasks',
          tasks,
          teamMembers,
          constraints: ['Balance workload', 'Prioritize critical items'],
          priorities: ['Address off-track metrics first'],
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTaskAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Task assignment failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, tasks: false }));
    }
  };

  // Prepare training plan
  const prepareTrainingPlan = async () => {
    setAiGenerating(prev => ({ ...prev, training: true }));
    
    try {
      const gapAreas = Object.entries(trends)
        .filter(([_, t]) => t.status !== 'on-track')
        .map(([id, _]) => id.replace(/_/g, ' '));

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prepare-training',
          topic: `${verticalId} Implementation Training`,
          audience: teamMembers.map(m => ({ role: m.role || m.name, level: 'intermediate' })),
          objectives: [
            'Understand new processes',
            'Master required tools',
            ...gapAreas.map(g => `Improve ${g} performance`),
          ],
          duration: '4 hours',
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTrainingPlan(data.training);
      }
    } catch (err) {
      console.error('Training plan preparation failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, training: false }));
    }
  };

  // Create change management plan
  const createChangePlan = async () => {
    setAiGenerating(prev => ({ ...prev, change: true }));
    
    try {
      const impactedGroups = [...new Set(teamMembers.map(m => m.department || m.role))].map(g => ({
        name: g,
        size: teamMembers.filter(m => (m.department || m.role) === g).length,
        impact: 'medium',
      }));

      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manage-change',
          changeName: `${organizationName || 'Organization'} ${verticalId} Transformation`,
          changeType: 'Process and Technology Change',
          impactedGroups,
          currentState: 'Current operating model',
          futureState: 'Optimized, efficient operations',
          resistance: alerts.filter(a => a.type === 'warning').map(a => ({
            source: a.metric,
            reason: a.message,
          })),
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChangePlan(data.changePlan);
      }
    } catch (err) {
      console.error('Change plan creation failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, change: false }));
    }
  };

  // Generate status update
  const generateStatusUpdate = async (audience = 'executive') => {
    setAiGenerating(prev => ({ ...prev, status: true }));
    
    try {
      const res = await fetch('/api/ai/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-status-update',
          projectName: `${organizationName || 'Organization'} ${verticalId} Initiative`,
          audience,
          status: getOverallStatus(),
          highlights: Object.entries(trends)
            .filter(([_, t]) => t.direction === 'up')
            .map(([id, t]) => `${id.replace(/_/g, ' ')}: +${t.percentChange}%`),
          challenges: alerts.filter(a => a.type === 'critical' || a.type === 'warning')
            .map(a => a.message),
          nextSteps: implementationMonitor?.quickWins?.map(q => q.action) || ['Continue monitoring'],
          vertical: verticalId,
          lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusUpdate(data.statusUpdate);
      }
    } catch (err) {
      console.error('Status update generation failed:', err);
    } finally {
      setAiGenerating(prev => ({ ...prev, status: false }));
    }
  };

  const getOverallStatus = () => {
    const offTrack = Object.values(trends).filter(t => t.status === 'off-track').length;
    const atRisk = Object.values(trends).filter(t => t.status === 'at-risk').length;
    if (offTrack > 0) return 'Off Track';
    if (atRisk > Math.floor(Object.keys(trends).length / 2)) return 'At Risk';
    return 'On Track';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'on-track': return '#10b981';
      case 'at-risk': return '#f59e0b';
      case 'off-track': return '#ef4444';
      default: return 'rgba(255,255,255,0.5)';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      default: return '#3b82f6';
    }
  };

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
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>📊 Progress Monitor</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Initializing...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refreshMetrics}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: loading ? 'rgba(255,255,255,0.1)' : `${color}20`,
              color: loading ? 'rgba(255,255,255,0.5)' : color,
              border: `1px solid ${color}40`,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: autoRefresh ? '#10b981' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {autoRefresh ? '⏸️ Auto' : '▶️ Auto'}
          </button>
          <button
            onClick={requestAIAnalysis}
            disabled={aiAnalyzing}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: aiAnalyzing ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff',
              border: 'none',
              cursor: aiAnalyzing ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {aiAnalyzing ? '🤖 Analyzing...' : '🤖 AI Analysis'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16 
      }}>
        {metrics.map(metric => {
          const trend = trends[metric.id] || {};
          return (
            <div
              key={metric.id}
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${getStatusColor(trend.status)}30`,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 12,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{metric.name}</div>
                <span style={{ fontSize: 16 }}>{getTrendIcon(trend.direction)}</span>
              </div>
              
              <div style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                color: '#fff',
                marginBottom: 8,
              }}>
                {metric.currentValue.toFixed(1)}{metric.unit}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: 12,
              }}>
                <span style={{ 
                  color: trend.direction === 'up' ? '#10b981' : 
                         trend.direction === 'down' ? '#ef4444' : 
                         'rgba(255,255,255,0.5)' 
                }}>
                  {trend.direction === 'up' ? '+' : ''}{trend.percentChange}%
                </span>
                <span style={{ 
                  background: `${getStatusColor(trend.status)}20`,
                  color: getStatusColor(trend.status),
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {trend.status}
                </span>
              </div>
              
              {/* Progress bar to target */}
              <div style={{ marginTop: 12 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 4,
                }}>
                  <span>Progress</span>
                  <span>Target: {metric.target}%</span>
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  height: 4, 
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{ 
                    background: getStatusColor(trend.status), 
                    height: '100%', 
                    width: `${Math.min(100, (metric.currentValue / metric.target) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: 12, 
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ 
            color: '#fff', 
            fontSize: 14, 
            fontWeight: 600, 
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            🔔 Recent Alerts
            <span style={{ 
              background: 'rgba(239,68,68,0.2)', 
              color: '#ef4444',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
            }}>
              {alerts.filter(a => a.type === 'critical' || a.type === 'warning').length}
            </span>
          </div>
          
          <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {alerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                style={{
                  background: `${getAlertColor(alert.type)}10`,
                  borderLeft: `3px solid ${getAlertColor(alert.type)}`,
                  borderRadius: '0 8px 8px 0',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: 13 }}>{alert.message}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <span style={{ 
                  color: getAlertColor(alert.type),
                  fontSize: 18,
                }}>
                  {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : '✅'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 12,
      }}>
        {[
          { label: 'On Track', value: Object.values(trends).filter(t => t.status === 'on-track').length, color: '#10b981' },
          { label: 'At Risk', value: Object.values(trends).filter(t => t.status === 'at-risk').length, color: '#f59e0b' },
          { label: 'Off Track', value: Object.values(trends).filter(t => t.status === 'off-track').length, color: '#ef4444' },
          { label: 'Improving', value: Object.values(trends).filter(t => t.direction === 'up').length, color: '#3b82f6' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: `${stat.color}15`,
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
              border: `1px solid ${stat.color}30`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* AUTONOMOUS AI COMMAND CENTER */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.1) 100%)',
        borderRadius: 16,
        border: '1px solid rgba(139,92,246,0.3)',
        overflow: 'hidden',
      }}>
        {/* Command Center Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Sovereign AI Command Center</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Autonomous Project Management</div>
            </div>
          </div>
          <button
            onClick={() => setAutoMonitorEnabled(!autoMonitorEnabled)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: autoMonitorEnabled ? '#10b981' : 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {autoMonitorEnabled ? '✓ Auto-Pilot ON' : '○ Auto-Pilot OFF'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          {[
            { id: 'monitor', icon: '📊', label: 'Monitor' },
            { id: 'tasks', icon: '📋', label: 'Tasks' },
            { id: 'training', icon: '🎓', label: 'Training' },
            { id: 'change', icon: '🔄', label: 'Change Mgmt' },
            { id: 'artifacts', icon: '📁', label: 'Artifacts' },
            { id: 'status', icon: '📢', label: 'Status Updates' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab.id ? 'rgba(139,92,246,0.3)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 20 }}>
          {/* Monitor Tab */}
          {activeTab === 'monitor' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={monitorImplementation}
                  disabled={aiGenerating.monitor}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: aiGenerating.monitor ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    cursor: aiGenerating.monitor ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {aiGenerating.monitor ? '⏳ Analyzing...' : '🔍 Check Implementation'}
                </button>
                <button
                  onClick={updateDashboardInsights}
                  disabled={aiGenerating.dashboard}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: aiGenerating.dashboard ? 'rgba(59,130,246,0.3)' : '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    cursor: aiGenerating.dashboard ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {aiGenerating.dashboard ? '⏳ Updating...' : '📈 Update Dashboard'}
                </button>
              </div>

              {implementationMonitor && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>Implementation Health</div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: implementationMonitor.healthStatus === 'on-track' ? '#10b98120' :
                                  implementationMonitor.healthStatus === 'at-risk' ? '#f59e0b20' : '#ef444420',
                      color: implementationMonitor.healthStatus === 'on-track' ? '#10b981' :
                             implementationMonitor.healthStatus === 'at-risk' ? '#f59e0b' : '#ef4444',
                    }}>
                      {implementationMonitor.healthStatus?.toUpperCase()}
                    </span>
                  </div>
                  
                  {implementationMonitor.summary && (
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 16 }}>
                      {implementationMonitor.summary}
                    </p>
                  )}

                  {implementationMonitor.quickWins?.length > 0 && (
                    <div>
                      <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚡ Quick Wins</div>
                      {implementationMonitor.quickWins.map((qw, i) => (
                        <div key={i} style={{
                          background: 'rgba(16,185,129,0.1)',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 8,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.9)',
                        }}>
                          <strong>{qw.action}</strong> - {qw.timeframe} ({qw.impact} impact)
                        </div>
                      ))}
                    </div>
                  )}

                  {implementationMonitor.adjustments?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🔧 Recommended Adjustments</div>
                      {implementationMonitor.adjustments.map((adj, i) => (
                        <div key={i} style={{
                          background: 'rgba(245,158,11,0.1)',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 8,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.9)',
                        }}>
                          <strong>{adj.area}</strong>: {adj.recommendation}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dashboardInsights && (
                <div style={{ 
                  background: 'rgba(59,130,246,0.1)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(59,130,246,0.3)',
                }}>
                  <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 12 }}>📈 Executive Dashboard Insights</div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {typeof dashboardInsights === 'string' ? dashboardInsights : JSON.stringify(dashboardInsights, null, 2)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(typeof dashboardInsights === 'string' ? dashboardInsights : JSON.stringify(dashboardInsights, null, 2))}
                    style={{ marginTop: 12, padding: '6px 12px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    📋 Copy Insights
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <button
                onClick={assignTasksToTeam}
                disabled={aiGenerating.tasks}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: aiGenerating.tasks ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  cursor: aiGenerating.tasks ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {aiGenerating.tasks ? '⏳ Assigning Tasks...' : '🎯 AI Auto-Assign Tasks'}
              </button>

              {taskAssignments && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 16 }}>📋 AI Task Assignments</div>
                  
                  {taskAssignments.assignments?.map((assignment, i) => (
                    <div key={i} style={{
                      background: 'rgba(139,92,246,0.1)',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 12,
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{assignment.task}</div>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: assignment.priority === 'high' ? '#ef444420' : '#f59e0b20',
                          color: assignment.priority === 'high' ? '#ef4444' : '#f59e0b',
                        }}>
                          {assignment.priority?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ color: '#8b5cf6', fontSize: 13, marginBottom: 4 }}>
                        👤 Assigned to: <strong>{assignment.assignee}</strong>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                        📅 Due: {assignment.deadline} | ⏱️ Est: {assignment.estimatedHours}h
                      </div>
                      {assignment.reason && (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                          💡 {assignment.reason}
                        </div>
                      )}
                    </div>
                  ))}

                  {taskAssignments.workloadBalance && (
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
                      <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>⚖️ Workload Balance</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                        {JSON.stringify(taskAssignments.workloadBalance)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Training Tab */}
          {activeTab === 'training' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <button
                onClick={prepareTrainingPlan}
                disabled={aiGenerating.training}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: aiGenerating.training ? 'rgba(16,185,129,0.3)' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  cursor: aiGenerating.training ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {aiGenerating.training ? '⏳ Preparing Training...' : '🎓 Generate Training Plan'}
              </button>

              {trainingPlan && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 16, fontSize: 16 }}>
                    🎓 AI-Generated Training Plan
                  </div>
                  
                  {trainingPlan.overview && (
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 16 }}>
                      {trainingPlan.overview}
                    </p>
                  )}

                  {trainingPlan.modules?.map((module, i) => (
                    <div key={i} style={{
                      background: 'rgba(16,185,129,0.1)',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 12,
                    }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                        Module {i + 1}: {module.title}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>
                        ⏱️ Duration: {module.duration}
                      </div>
                      {module.topics && (
                        <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                          {module.topics.map((topic, j) => <li key={j}>{topic}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}

                  {trainingPlan.exercises?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📝 Exercises</div>
                      {trainingPlan.exercises.map((ex, i) => (
                        <div key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>
                          • {ex.name || ex}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(trainingPlan, null, 2))}
                    style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    📋 Export Training Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Change Management Tab */}
          {activeTab === 'change' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <button
                onClick={createChangePlan}
                disabled={aiGenerating.change}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: aiGenerating.change ? 'rgba(245,158,11,0.3)' : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  cursor: aiGenerating.change ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {aiGenerating.change ? '⏳ Creating Plan...' : '🔄 Generate Change Plan'}
              </button>

              {changePlan && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 16, fontSize: 16 }}>
                    🔄 AI Change Management Plan
                  </div>
                  
                  {changePlan.summary && (
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 16 }}>
                      {changePlan.summary}
                    </p>
                  )}

                  {changePlan.impactAssessment && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📊 Impact Assessment</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {typeof changePlan.impactAssessment === 'string' 
                          ? changePlan.impactAssessment 
                          : JSON.stringify(changePlan.impactAssessment, null, 2)}
                      </div>
                    </div>
                  )}

                  {changePlan.stakeholderStrategy?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>👥 Stakeholder Strategies</div>
                      {changePlan.stakeholderStrategy.map((strat, i) => (
                        <div key={i} style={{
                          background: 'rgba(139,92,246,0.1)',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 6,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.8)',
                        }}>
                          <strong>{strat.group}:</strong> {strat.approach}
                        </div>
                      ))}
                    </div>
                  )}

                  {changePlan.resistanceManagement && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🛡️ Resistance Management</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {typeof changePlan.resistanceManagement === 'string' 
                          ? changePlan.resistanceManagement 
                          : JSON.stringify(changePlan.resistanceManagement, null, 2)}
                      </div>
                    </div>
                  )}

                  {changePlan.adoptionRoadmap?.length > 0 && (
                    <div>
                      <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>🗺️ Adoption Roadmap</div>
                      {changePlan.adoptionRoadmap.map((phase, i) => (
                        <div key={i} style={{
                          background: 'rgba(16,185,129,0.1)',
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 6,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.8)',
                        }}>
                          <strong>Phase {i + 1}:</strong> {phase.name || phase}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => copyToClipboard(JSON.stringify(changePlan, null, 2))}
                    style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    📋 Export Change Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Artifacts Tab */}
          {activeTab === 'artifacts' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <button
                onClick={generateProjectArtifacts}
                disabled={aiGenerating.artifacts}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: aiGenerating.artifacts ? 'rgba(59,130,246,0.3)' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  cursor: aiGenerating.artifacts ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {aiGenerating.artifacts ? '⏳ Generating...' : '📁 Generate All Artifacts'}
              </button>

              {projectArtifacts && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 16, fontSize: 16 }}>
                    📁 AI-Generated Project Artifacts
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {Object.entries(projectArtifacts).map(([key, value]) => (
                      <div key={key} style={{
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: 10,
                        padding: 14,
                        border: '1px solid rgba(59,130,246,0.2)',
                      }}>
                        <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                          📄 {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, maxHeight: 100, overflow: 'hidden' }}>
                          {typeof value === 'string' ? value.substring(0, 150) + '...' : JSON.stringify(value).substring(0, 150) + '...'}
                        </div>
                        <button
                          onClick={() => copyToClipboard(typeof value === 'string' ? value : JSON.stringify(value, null, 2))}
                          style={{ marginTop: 8, padding: '4px 10px', borderRadius: 4, background: '#3b82f620', color: '#3b82f6', border: 'none', cursor: 'pointer', fontSize: 11 }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(projectArtifacts, null, 2))}
                    style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    📋 Export All Artifacts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Updates Tab */}
          {activeTab === 'status' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => generateStatusUpdate('executive')}
                  disabled={aiGenerating.status}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: aiGenerating.status ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    cursor: aiGenerating.status ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {aiGenerating.status ? '⏳ Generating...' : '👔 Executive Update'}
                </button>
                <button
                  onClick={() => generateStatusUpdate('team')}
                  disabled={aiGenerating.status}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    cursor: aiGenerating.status ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  👥 Team Update
                </button>
                <button
                  onClick={() => generateStatusUpdate('stakeholder')}
                  disabled={aiGenerating.status}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    cursor: aiGenerating.status ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  🤝 Stakeholder Update
                </button>
              </div>

              {statusUpdate && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 12, 
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 16, fontSize: 16 }}>
                    📢 AI-Generated Status Update
                  </div>
                  
                  {statusUpdate.subject && (
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                      Subject: {statusUpdate.subject}
                    </div>
                  )}

                  {statusUpdate.summary && (
                    <div style={{ 
                      background: 'rgba(139,92,246,0.1)', 
                      borderRadius: 8, 
                      padding: 14, 
                      marginBottom: 12,
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}>
                      {statusUpdate.summary}
                    </div>
                  )}

                  {statusUpdate.highlights?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>✨ Highlights</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {statusUpdate.highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}

                  {statusUpdate.challenges?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>⚠️ Challenges</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {statusUpdate.challenges.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {statusUpdate.nextSteps?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>➡️ Next Steps</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {statusUpdate.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(
                      `Subject: ${statusUpdate.subject || 'Status Update'}\n\n${statusUpdate.summary || ''}\n\nHighlights:\n${statusUpdate.highlights?.map(h => `• ${h}`).join('\n') || ''}\n\nChallenges:\n${statusUpdate.challenges?.map(c => `• ${c}`).join('\n') || ''}\n\nNext Steps:\n${statusUpdate.nextSteps?.map(n => `• ${n}`).join('\n') || ''}`
                    )}
                    style={{ marginTop: 12, padding: '8px 16px', borderRadius: 6, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    📋 Copy for Email
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
