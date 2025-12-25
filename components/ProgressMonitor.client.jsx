'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * ProgressMonitor Component
 * Tracks KPIs over time, detects changes, and provides AI recommendations
 */
export default function ProgressMonitor({
  verticalId,
  organizationName,
  categories = [],
  historicalData = [],
  color = '#3b82f6',
  lang = 'English',
  onAIRecommendation,
}) {
  const [metrics, setMetrics] = useState([]);
  const [trends, setTrends] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

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
    </div>
  );
}
