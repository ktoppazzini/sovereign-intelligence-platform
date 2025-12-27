'use client';
import { useState, useCallback, useEffect } from 'react';
import { getReportConfig } from '@/lib/reportConfig';
import { getVerticalRoles, getRoleById } from '@/lib/roleHierarchy';
import { loadModuleTranslations, ensureTranslatedResponse } from '@/lib/dynamicTranslation';
import dynamic from 'next/dynamic';

const DataUpload = dynamic(() => import('./DataUpload.client'), { ssr: false });
const ReportTemplates = dynamic(() => import('./ReportTemplates.client'), { ssr: false });
const RoleSurvey = dynamic(() => import('./RoleSurvey.client'), { ssr: false });
const StakeholderInterviews = dynamic(() => import('./StakeholderInterviews.client'), { ssr: false });
const ProgressMonitor = dynamic(() => import('./ProgressMonitor.client'), { ssr: false });
const EmailReport = dynamic(() => import('./EmailReport.client'), { ssr: false });
const ScheduledReports = dynamic(() => import('./ScheduledReports.client'), { ssr: false });
const AskSovereign = dynamic(() => import('./AskSovereign.client'), { ssr: false });
const TeamWorkspace = dynamic(() => import('./TeamWorkspace.client'), { ssr: false });
const RealTimeDashboard = dynamic(() => import('./RealTimeDashboard.client'), { ssr: false });
const WhiteLabelSettings = dynamic(() => import('./WhiteLabelSettings.client'), { ssr: false });
const ApiAccess = dynamic(() => import('./ApiAccess.client'), { ssr: false });

// Workflow states
const WORKFLOW_STATES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  FINALIZED: 'finalized',
};

export default function EnterpriseReportForm({ verticalId, lang, ui, onReportGenerated }) {
  const config = getReportConfig(verticalId);
  const verticalRoles = getVerticalRoles(verticalId);
  
  // Form state
  const [reportType, setReportType] = useState(config.reportTypes[0]?.id || 'comprehensive');
  const [organizationName, setOrganizationName] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedByEmail, setPreparedByEmail] = useState('');
  const [preparedFor, setPreparedFor] = useState('');
  const [preparedForEmail, setPreparedForEmail] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(config.categories.slice(0, 4).map(c => c.id));
  const [selectedRoleId, setSelectedRoleId] = useState(verticalRoles.roles[0]?.id || '');
  const [selectedRole, setSelectedRole] = useState(verticalRoles.roles[0]?.title || 'Executive');
  const [context, setContext] = useState('');
  
  // NEW: Additional form fields
  const [country, setCountry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [targetSavings, setTargetSavings] = useState('');
  const [secondaryObjectives, setSecondaryObjectives] = useState('');
  
  // Industry/Sub-Industry state (for universal vertical)
  const [industries, setIndustries] = useState({});
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedSubIndustry, setSelectedSubIndustry] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');
  
  // Airtable options state (fetched from /api/reform/options)
  const [countries, setCountries] = useState([]);
  const [companySizes, setCompanySizes] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [timeFrames, setTimeFrames] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // Data upload state
  const [uploadedData, setUploadedData] = useState(null);
  
  // Survey state
  const [surveyData, setSurveyData] = useState(null);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  
  // Stakeholder interview state
  const [interviewData, setInterviewData] = useState(null);
  const [interviewsCompleted, setInterviewsCompleted] = useState(0);
  const [burningIssues, setBurningIssues] = useState([]);
  
  // AI-powered Burning Issues state
  const [aiBurningIssues, setAiBurningIssues] = useState([]);
  const [loadingBurningIssues, setLoadingBurningIssues] = useState(true);
  const [selectedBurningIssues, setSelectedBurningIssues] = useState([]);
  const [customIssue, setCustomIssue] = useState('');
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState(WORKFLOW_STATES.DRAFT);
  const [approvals, setApprovals] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // config, survey, data, workflow, approvals
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  
  // Generated report state (for email/chat features)
  const [generatedReportHtml, setGeneratedReportHtml] = useState('');

  // ISCO-08 Occupations state
  const [iscoOccupations, setIscoOccupations] = useState({});
  const [loadingIsco, setLoadingIsco] = useState(true);
  const [selectedIscoCategory, setSelectedIscoCategory] = useState('');

  // Fetch AI-powered Burning Issues for the vertical
  useEffect(() => {
    const fetchBurningIssues = async () => {
      setLoadingBurningIssues(true);
      try {
        // Map verticalId to industry name for API
        const industryMap = {
          'reform': 'government',
          'defense': 'defense',
          'pharma': 'pharma',
          'finance': 'finance',
          'clinical': 'healthcare',
          'manufacturing': 'manufacturing',
          'insurance': 'insurance',
          'logistics': 'logistics',
          'energy': 'energy',
          'enterprise': 'universal'
        };
        const industry = industryMap[verticalId] || 'universal';
        const res = await fetch(`/api/burning-issues?industry=${industry}&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          setAiBurningIssues(data.issues || []);
          // Pre-select first 3 issues by default
          if (data.issues && data.issues.length > 0) {
            setSelectedBurningIssues(data.issues.slice(0, 3).map(i => i.title));
          }
        }
      } catch (err) {
        console.error('[EnterpriseReportForm] Failed to fetch burning issues:', err);
      } finally {
        setLoadingBurningIssues(false);
      }
    };
    fetchBurningIssues();
  }, [verticalId, lang]);

  // Fetch form options from Airtable (Countries, Company Sizes, Tiers, Time Frames)
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch('/api/reform/options');
        if (res.ok) {
          const data = await res.json();
          setCountries(data.countries || []);
          setCompanySizes(data.sizes || []);
          setTiers(data.tiers || []);
          setTimeFrames(data.timeFrames || []);
          console.log('[EnterpriseReportForm] Loaded options from Airtable:', {
            countries: (data.countries || []).length,
            sizes: (data.sizes || []).length,
            tiers: (data.tiers || []).length,
            timeFrames: (data.timeFrames || []).length,
          });
        }
      } catch (err) {
        console.error('[EnterpriseReportForm] Failed to fetch options:', err);
        // Fallback to defaults if Airtable fails
        setCountries(['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France']);
        setCompanySizes(['1-50 employees', '51-200 employees', '201-500 employees', '501-1,000 employees', '1,001-5,000 employees', '5,001-10,000 employees']);
        setTimeFrames(['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', '6 Months', '12 Months', '18 Months', '24 Months']);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  // Fetch AI-powered Industries for universal vertical
  useEffect(() => {
    if (!config.supportsIndustries) {
      setLoadingIndustries(false);
      return;
    }
    const fetchIndustries = async () => {
      setLoadingIndustries(true);
      try {
        const res = await fetch(`/api/universal-industry-plan/ai-industries?lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          setIndustries(data.industries || {});
          console.log('[EnterpriseReportForm] Loaded industries:', Object.keys(data.industries || {}).length);
        }
      } catch (err) {
        console.error('[EnterpriseReportForm] Failed to fetch industries:', err);
        // Fallback to some defaults
        setIndustries({
          'Technology': { icon: '💻', subIndustries: ['Software', 'Hardware', 'IT Services', 'Cloud Computing', 'Cybersecurity'] },
          'Healthcare': { icon: '🏥', subIndustries: ['Hospitals', 'Pharmaceuticals', 'Medical Devices', 'Biotechnology', 'Healthcare IT'] },
          'Financial Services': { icon: '🏦', subIndustries: ['Banking', 'Insurance', 'Asset Management', 'Fintech', 'Capital Markets'] },
          'Manufacturing': { icon: '🏭', subIndustries: ['Automotive', 'Aerospace', 'Electronics', 'Consumer Goods', 'Industrial Equipment'] },
          'Retail': { icon: '🛒', subIndustries: ['E-commerce', 'Grocery', 'Fashion', 'Consumer Electronics', 'Home & Garden'] },
          'Energy': { icon: '⚡', subIndustries: ['Oil & Gas', 'Renewable Energy', 'Utilities', 'Mining', 'Nuclear'] },
        });
      } finally {
        setLoadingIndustries(false);
      }
    };
    fetchIndustries();
  }, [config.supportsIndustries, lang]);

  // Fetch ISCO-08 occupations
  useEffect(() => {
    const fetchIscoOccupations = async () => {
      try {
        const res = await fetch(`/api/universal-industry-plan/ai-occupations?lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.occupations) {
            setIscoOccupations(data.occupations);
            // Set default category to first one
            const firstCategory = Object.keys(data.occupations)[0];
            if (firstCategory && !selectedIscoCategory) {
              setSelectedIscoCategory(firstCategory);
            }
            console.log(`[EnterpriseReport] Loaded ${data.majorGroupCount} ISCO-08 major groups`);
          }
        }
      } catch (e) {
        console.log('[EnterpriseReport] Could not fetch ISCO occupations:', e.message);
      } finally {
        setLoadingIsco(false);
      }
    };
    fetchIscoOccupations();
  }, [lang]);

  // Fetch burning issues for this vertical
  useEffect(() => {
    const fetchBurningIssues = async () => {
      try {
        const res = await fetch(`/api/burning-issues?vertical=${verticalId}&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (data.issues && data.issues.length > 0) {
            setBurningIssues(data.issues);
            console.log(`[EnterpriseReport] Loaded ${data.issues.length} burning issues for ${verticalId}`);
          }
        }
      } catch (e) {
        console.log('[EnterpriseReport] Could not fetch burning issues:', e.message);
      }
    };
    
    if (verticalId) {
      fetchBurningIssues();
    }
  }, [verticalId, lang]);

  // Update role when roleId changes
  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    const role = getRoleById(verticalId, roleId);
    if (role) {
      setSelectedRole(role.title);
      setSurveyCompleted(false); // Reset survey when role changes
      setSurveyData(null);
    }
  };

  const toggleCategory = (id) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { id: Date.now(), text: newComment, author: preparedBy || 'User', date: new Date().toISOString(), role: selectedRole }]);
    setNewComment('');
  };

  const handleSubmit = async () => {
    setWorkflowState(WORKFLOW_STATES.SUBMITTED);
    setApprovals(prev => [...prev, { action: 'Submitted', by: preparedBy || 'User', role: selectedRole, date: new Date().toISOString() }]);
  };

  const handleApprove = async () => {
    setWorkflowState(WORKFLOW_STATES.APPROVED);
    setApprovals(prev => [...prev, { action: 'Approved', by: preparedBy || 'Approver', role: selectedRole, date: new Date().toISOString() }]);
  };

  // Airtable finalize state
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [airtableRecordId, setAirtableRecordId] = useState(null);

  const handleFinalize = async () => {
    setFinalizeLoading(true);
    try {
      // Call the finalize API to save to Airtable
      const res = await fetch('/api/enterprise/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verticalId,
          html: generatedReportHtml,
          organizationName,
          preparedBy,
          lang,
          reportType,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setWorkflowState(WORKFLOW_STATES.FINALIZED);
        setApprovals(prev => [...prev, { 
          action: 'Finalized', 
          by: preparedBy || 'User', 
          role: selectedRole, 
          date: new Date().toISOString(),
          recordId: data.recordId,
        }]);
        
        if (data.recordId) {
          setAirtableRecordId(data.recordId);
          setDownloadLink(data.downloadLink);
        }
        
        console.log('[EnterpriseReport] Report finalized:', data.message);
      } else {
        console.error('[EnterpriseReport] Finalize error:', data.error);
        alert('Error finalizing report: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('[EnterpriseReport] Finalize failed:', err);
      alert('Failed to finalize report: ' + err.message);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      // Get current role info
      const currentRole = getRoleById(verticalId, selectedRoleId);
      
      // Use the full AI-powered report generation API
      const payload = { 
        lang, 
        verticalId, 
        reportType, 
        organizationName, 
        preparedBy,
        preparedByEmail,
        preparedFor,
        preparedForEmail,
        country,
        companySize,
        targetSavings,
        secondaryObjectives,
        // Industry fields (for universal vertical)
        industry: selectedIndustry,
        subIndustry: selectedSubIndustry,
        reportingPeriod, 
        selectedCategories,
        selectedBurningIssues, 
        selectedRole,
        selectedRoleId,
        roleLevel: currentRole?.level,
        rolePermissions: currentRole?.permissions,
        context, 
        workflowState, 
        approvals, 
        comments,
        // Include uploaded data if available
        uploadedData: uploadedData ? {
          fileName: uploadedData.fileName,
          headers: uploadedData.headers,
          rowCount: uploadedData.rows?.length || 0,
          summary: uploadedData.summary,
          sampleData: uploadedData.data?.slice(0, 50), // First 50 rows for AI analysis
        } : null,
        // Include survey responses for AI analysis
        surveyData: surveyData ? {
          questions: surveyData.questions,
          responses: surveyData.responses,
          surveyFocus: currentRole?.surveyFocus,
          completedAt: surveyData.completedAt,
        } : null,
        // Include stakeholder interview data for AI analysis
        interviewData: interviewData && interviewData.length > 0 ? {
          totalInterviews: interviewData.length,
          stakeholders: interviewData.map(i => ({
            name: i.stakeholder?.name,
            role: i.stakeholder?.role,
            department: i.stakeholder?.department,
            responses: i.responses,
            analysis: i.analysis?.synthesis,
          })),
          insights: interviewData.flatMap(i => i.analysis?.synthesis?.highPriorityActions || []),
          themes: interviewData.flatMap(i => i.analysis?.synthesis?.commonThemes || []),
        } : null,
        // Include burning issues context (user selected from AI suggestions + custom)
        burningIssues: selectedBurningIssues,
        // Request full AI analysis
        fullAnalysis: true,
        minWords: 20000,
      };
      
      // [KT:VERTICAL-ROUTING] Route to correct API based on vertical
      // Reform vertical uses dedicated /api/reform/generate with full translation support
      // Other verticals use /api/enterprise/generate-full-report
      const apiEndpoint = verticalId === 'reform' 
        ? '/api/reform/generate' 
        : '/api/enterprise/generate-full-report';
      
      console.log('[EnterpriseReport] Calling API:', { verticalId, apiEndpoint, lang });
      
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.html) { 
          console.log('[EnterpriseReport] Full AI report generated successfully');
          setGeneratedReportHtml(data.html);
          onReportGenerated(data.html); 
          setLoading(false); 
          return; 
        }
      }
      
      // Fallback to basic API (only for non-reform verticals)
      if (verticalId !== 'reform') {
        console.log('[EnterpriseReport] Falling back to basic API');
        const basicRes = await fetch('/api/enterprise/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (basicRes.ok) {
          const data = await basicRes.json();
          if (data.html) { 
            setGeneratedReportHtml(data.html);
            onReportGenerated(data.html); 
            setLoading(false); 
            return; 
          }
        }
      }
    } catch (e) { console.error('[EnterpriseReport] Generation error:', e); }
    // Fallback demo report
    console.log('[EnterpriseReport] Using demo fallback');
    const demoHtml = generateDemoReport();
    setGeneratedReportHtml(demoHtml);
    onReportGenerated(demoHtml);
    setLoading(false);
  }, [lang, verticalId, reportType, organizationName, preparedBy, reportingPeriod, selectedCategories, selectedBurningIssues, selectedRole, selectedRoleId, context, workflowState, approvals, comments, uploadedData, surveyData, interviewData, burningIssues, onReportGenerated]);

  const generateDemoReport = () => {
    const reportTypeLabel = config.reportTypes.find(r => r.id === reportType)?.label || 'Report';
    
    // Generate analysis for each selected burning issue
    const burningIssuesAnalysis = selectedBurningIssues.map((issue, idx) => {
      const severity = Math.floor(Math.random() * 30) + 60; // 60-90 severity
      const color = severity >= 80 ? '#ef4444' : severity >= 70 ? '#f59e0b' : '#10b981';
      const priorityLabel = severity >= 80 ? 'Critical' : severity >= 70 ? 'High' : 'Medium';
      return `<div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 24px; border-left: 4px solid ${color};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: #fff; margin: 0;">🔥 ${issue}</h3>
          <span style="background: ${color}20; color: ${color}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${priorityLabel} Priority</span>
        </div>
        <p style="color: rgba(255,255,255,0.7); margin: 0 0 16px 0; font-size: 14px;">AI analysis of this burning issue and its impact on organizational objectives.</p>
        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
            <div><div style="font-size: 24px; font-weight: 700; color: ${config.color};">${severity}%</div><div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Impact Score</div></div>
            <div><div style="font-size: 24px; font-weight: 700; color: ${config.color};">$${(Math.random() * 50 + 10).toFixed(1)}M</div><div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Est. Savings</div></div>
            <div><div style="font-size: 24px; font-weight: 700; color: ${config.color};">${Math.floor(Math.random() * 12) + 3}mo</div><div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Resolution Time</div></div>
          </div>
        </div>
        <ul style="margin: 16px 0 0 0; padding-left: 20px; color: rgba(255,255,255,0.8);">
          <li style="margin-bottom: 8px;">Root cause analysis identifies ${Math.floor(Math.random() * 5) + 2} contributing factors</li>
          <li style="margin-bottom: 8px;">AI recommends ${Math.floor(Math.random() * 4) + 3} mitigation strategies</li>
          <li>Predictive model shows ${severity >= 70 ? 'significant' : 'moderate'} improvement potential with intervention</li>
        </ul>
      </div>`;
    }).join('');

    const workflowBadge = workflowState === WORKFLOW_STATES.FINALIZED 
      ? `<span style="background: #10b981; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ FINALIZED</span>`
      : workflowState === WORKFLOW_STATES.APPROVED
      ? `<span style="background: #3b82f6; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ APPROVED</span>`
      : workflowState === WORKFLOW_STATES.SUBMITTED
      ? `<span style="background: #f59e0b; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">⏳ PENDING REVIEW</span>`
      : `<span style="background: rgba(255,255,255,0.2); color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">DRAFT</span>`;

    const approvalHistory = approvals.length > 0 ? `
      <div style="margin-bottom: 48px;">
        <h2 style="font-size: 24px; color: ${config.color}; margin-bottom: 24px;">📋 Approval History</h2>
        <div style="display: grid; gap: 12px;">
          ${approvals.map(a => `
            <div style="background: rgba(0,0,0,0.2); padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div><strong style="color: #fff;">${a.action}</strong><span style="color: rgba(255,255,255,0.5); margin-left: 12px;">by ${a.by} (${a.role})</span></div>
              <span style="color: rgba(255,255,255,0.4); font-size: 13px;">${new Date(a.date).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e8eefb;">
      <div style="text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid ${config.color}40;">
        <div style="font-size: 14px; color: ${config.color}; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px;">SOVEREIGN INTELLIGENCE • ${config.name.toUpperCase()}</div>
        <h1 style="font-size: clamp(28px, 5vw, 42px); font-weight: 800; margin: 0 0 12px 0; color: #fff;">${reportTypeLabel}</h1>
        <div style="font-size: 20px; color: rgba(255,255,255,0.7); margin-bottom: 16px;">${organizationName || 'Organization'}</div>
        ${workflowBadge}
        <div style="display: flex; justify-content: center; gap: 24px; margin-top: 32px; flex-wrap: wrap;">
          <div style="background: ${config.color}15; padding: 16px 28px; border-radius: 12px; border: 1px solid ${config.color}30;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Period</div>
            <div style="font-size: 18px; color: #fff; font-weight: 600; margin-top: 4px;">${reportingPeriod} 2025</div>
          </div>
          <div style="background: ${config.color}15; padding: 16px 28px; border-radius: 12px; border: 1px solid ${config.color}30;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Prepared By</div>
            <div style="font-size: 18px; color: #fff; font-weight: 600; margin-top: 4px;">${preparedBy || selectedRole}</div>
          </div>
          <div style="background: ${config.color}15; padding: 16px 28px; border-radius: 12px; border: 1px solid ${config.color}30;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase;">Report ID</div>
            <div style="font-size: 18px; color: #fff; font-weight: 600; margin-top: 4px;">${verticalId.toUpperCase().slice(0,3)}-${Date.now().toString(36).toUpperCase()}</div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 48px;">
        <h2 style="font-size: 24px; color: ${config.color}; margin-bottom: 24px;">📊 Executive Summary</h2>
        <div style="background: ${config.color}10; border-radius: 16px; padding: 28px; border: 1px solid ${config.color}20;">
          <p style="font-size: 16px; line-height: 1.9; color: rgba(255,255,255,0.85); margin: 0;">
            This ${reportTypeLabel.toLowerCase()} provides comprehensive AI-powered analysis for <strong style="color: ${config.color};">${organizationName || 'the organization'}</strong> 
            covering <strong style="color: ${config.color};">${selectedBurningIssues.length}</strong> critical burning issues for <strong style="color: ${config.color};">${reportingPeriod} 2025</strong>.
            The analysis leverages machine learning models, predictive analytics, and real-time monitoring to deliver actionable intelligence.
          </p>
          ${context ? `<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid ${config.color}20;"><div style="font-size: 13px; color: ${config.color}; font-weight: 600; margin-bottom: 8px;">Focus Areas:</div><p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 0;">${context}</p></div>` : ''}
        </div>
      </div>

      <div style="margin-bottom: 48px;">
        <h2 style="font-size: 24px; color: ${config.color}; margin-bottom: 24px;">� Burning Issues Analysis</h2>
        <div style="display: grid; gap: 20px;">${burningIssuesAnalysis}</div>
      </div>

      ${approvalHistory}

      <div style="margin-bottom: 48px;">
        <h2 style="font-size: 24px; color: ${config.color}; margin-bottom: 24px;">🤖 AI Recommendations</h2>
        <div style="background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%); border-radius: 16px; padding: 28px; border: 1px solid rgba(16,185,129,0.2);">
          <ol style="margin: 0; padding-left: 24px; color: rgba(255,255,255,0.85);">
            <li style="margin-bottom: 16px;"><strong style="color: #10b981;">Priority Action 1:</strong> AI models have identified immediate optimization opportunities in the highest-impact category.</li>
            <li style="margin-bottom: 16px;"><strong style="color: #10b981;">Priority Action 2:</strong> Predictive analytics suggest proactive measures to address emerging trends.</li>
            <li style="margin-bottom: 16px;"><strong style="color: #10b981;">Priority Action 3:</strong> Cross-functional analysis reveals synergy opportunities across departments.</li>
            <li style="margin-bottom: 0;"><strong style="color: #10b981;">Priority Action 4:</strong> Long-term strategic recommendations based on market and industry benchmarks.</li>
          </ol>
        </div>
      </div>

      <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid ${config.color}30;">
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
          <div><div style="font-size: 14px; color: rgba(255,255,255,0.6);"><strong style="color: ${config.color};">Sovereign Intelligence</strong> • ${config.name}</div><div style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;">${config.compliance}</div></div>
          <div style="text-align: right;"><div style="font-size: 12px; color: rgba(255,255,255,0.5);">Generated: ${new Date().toLocaleString()}</div></div>
        </div>
      </div>
    </div>`;
  };

  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: `1px solid ${config.color}30`, color: '#fff', fontSize: 15 };
  const labelStyle = { display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: 14 };

  // Get current role for survey
  const currentRole = getRoleById(verticalId, selectedRoleId);

  // AI recommendations state
  const [aiRecommendations, setAiRecommendations] = useState(null);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'config', label: `⚙️ ${ui?.tabConfig || 'Config'}` }, 
          { id: 'interviews', label: `🎤 ${ui?.tabInterviews || 'Interviews'}${interviewsCompleted > 0 ? ` (${interviewsCompleted})` : ''}` },
          { id: 'survey', label: `📋 ${ui?.tabSurvey || 'Survey'}${surveyCompleted ? ' ✓' : ''}` },
          { id: 'data', label: `📊 ${ui?.tabData || 'Data'}${uploadedData ? ' ✓' : ''}` }, 
          { id: 'progress', label: `📈 ${ui?.tabMonitor || 'Monitor'}` },
          { id: 'templates', label: `💾 ${ui?.tabTemplates || 'Templates'}` },
          { id: 'workflow', label: `🔄 ${ui?.tabFlow || 'Flow'}` }, 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, minWidth: 60, padding: '8px 10px', borderRadius: 8, background: activeTab === tab.id ? config.color : 'transparent', color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>{tab.label}</button>
        ))}
      </div>

      {/* Stakeholder Interviews Tab */}
      {activeTab === 'interviews' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <StakeholderInterviews
            verticalId={verticalId}
            vertical={config.name}
            roleId={selectedRoleId}
            roleTitle={selectedRole}
            roleLevel={currentRole?.level}
            companyName={organizationName}
            categories={selectedCategories}
            lang={lang}
            color={config.color}
            burningIssues={burningIssues}
            onInterviewComplete={(data) => {
              setInterviewsCompleted(prev => prev + 1);
              setInterviewData(prev => prev ? [...prev, data] : [data]);
            }}
            onInterviewChange={(data) => {
              if (data.stakeholders?.length > 0) {
                const completed = data.stakeholders.filter(s => s.status === 'completed').length;
                setInterviewsCompleted(completed);
              }
            }}
          />
        </div>
      )}

      {/* Progress Monitor Tab */}
      {activeTab === 'progress' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <ProgressMonitor
            verticalId={verticalId}
            organizationName={organizationName}
            categories={selectedCategories}
            color={config.color}
            lang={lang}
            onAIRecommendation={(recs) => setAiRecommendations(recs)}
          />
          {aiRecommendations && (
            <div style={{ marginTop: 20, padding: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))', borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)' }}>
              <div style={{ color: '#8b5cf6', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                🤖 AI Recommendations
                <span style={{ background: `${aiRecommendations.overallHealth === 'good' ? '#10b981' : aiRecommendations.overallHealth === 'moderate' ? '#f59e0b' : '#ef4444'}20`, color: aiRecommendations.overallHealth === 'good' ? '#10b981' : aiRecommendations.overallHealth === 'moderate' ? '#f59e0b' : '#ef4444', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  Health: {aiRecommendations.healthScore}/100
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 16 }}>{aiRecommendations.summary}</p>
              {aiRecommendations.priorityActions?.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {aiRecommendations.priorityActions.slice(0, 3).map((action, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ background: '#8b5cf6', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{action.priority}</span>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{action.action}</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{action.impact} • {action.urgency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 18 }}>💾 Report Templates</h3>
          <ReportTemplates
            config={config}
            color={config.color}
            currentSettings={{
              reportType,
              organizationName,
              preparedBy,
              reportingPeriod,
              selectedCategories,
              selectedRoleId,
              selectedRole,
              context,
            }}
            onLoadTemplate={(settings) => {
              if (settings.reportType) setReportType(settings.reportType);
              if (settings.organizationName) setOrganizationName(settings.organizationName);
              if (settings.preparedBy) setPreparedBy(settings.preparedBy);
              if (settings.reportingPeriod) setReportingPeriod(settings.reportingPeriod);
              if (settings.selectedCategories) setSelectedCategories(settings.selectedCategories);
              if (settings.selectedRoleId) handleRoleChange(settings.selectedRoleId);
              if (settings.context) setContext(settings.context);
            }}
          />
        </div>
      )}

      {/* Survey Tab */}
      {activeTab === 'survey' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          {currentRole ? (
            <RoleSurvey
              verticalId={verticalId}
              roleId={selectedRoleId}
              roleTitle={currentRole.title}
              surveyFocus={currentRole.surveyFocus}
              categories={selectedCategories}
              lang={lang}
              color={config.color}
              onSurveyComplete={(data) => {
                setSurveyData(data);
                setSurveyCompleted(true);
              }}
              onSurveyChange={(data) => {
                if (data.progress > 0) {
                  setSurveyData(data);
                }
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>👤</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
                Please select a role in the Config tab first
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Upload Tab */}
      {activeTab === 'data' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: 18 }}>📊 Upload Your Data</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 20px 0' }}>
            Upload CSV, Excel, or JSON files to analyze your actual data instead of demo data.
          </p>
          <DataUpload 
            color={config.color} 
            lang={lang}
            onDataLoaded={(data) => {
              setUploadedData(data);
              if (data) {
                // Auto-generate context from data summary
                const summaryText = data.summary ? 
                  `Analyzing ${data.summary.totalRows.toLocaleString()} rows with ${data.summary.totalColumns} columns from ${data.fileName}` : '';
                if (summaryText && !context) {
                  setContext(summaryText);
                }
              }
            }}
          />
          {uploadedData && uploadedData.summary && (
            <div style={{ marginTop: 20, padding: 16, background: `${config.color}10`, borderRadius: 12, border: `1px solid ${config.color}20` }}>
              <div style={{ color: config.color, fontWeight: 600, marginBottom: 12 }}>📈 Data Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>ROWS</div>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{uploadedData.summary.totalRows.toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>COLUMNS</div>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{uploadedData.summary.totalColumns}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>NUMERIC</div>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{Object.values(uploadedData.summary.columns).filter(c => c.isNumeric).length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 18 }}>{ui?.reportConfiguration || 'Report Configuration'}</h3>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={labelStyle}>{ui?.reportType || 'Report Type'}</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={inputStyle}>
                  {config.reportTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              
              {/* Industry / Sub-Industry Selection (for universal vertical) */}
              {config.supportsIndustries && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>
                      {ui?.industryCategory || 'Industry Category'}
                      <span style={{ marginLeft: 8, fontSize: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '2px 8px', borderRadius: 10, color: '#fff' }}>{ui?.aiPowered || 'AI-Powered'}</span>
                    </label>
                    <input 
                      type="text" 
                      value={industrySearch} 
                      onChange={(e) => setIndustrySearch(e.target.value)} 
                      placeholder={ui?.searchIndustries || 'Search industries...'} 
                      style={{...inputStyle, marginBottom: 8, fontSize: 13}} 
                    />
                    <select 
                      value={selectedIndustry} 
                      onChange={(e) => {
                        setSelectedIndustry(e.target.value);
                        setSelectedSubIndustry(''); // Reset sub-industry when industry changes
                      }} 
                      style={inputStyle} 
                      disabled={loadingIndustries}
                    >
                      <option value="">{loadingIndustries ? (ui?.loadingIndustries || 'Loading industries...') : (ui?.selectIndustry || '— Select Industry —')}</option>
                      {Object.entries(industries)
                        .filter(([name]) => !industrySearch || name.toLowerCase().includes(industrySearch.toLowerCase()))
                        .map(([name, data]) => (
                          <option key={name} value={name}>{data.icon} {name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{ui?.subIndustry || 'Sub-Industry'}</label>
                    <select 
                      value={selectedSubIndustry} 
                      onChange={(e) => setSelectedSubIndustry(e.target.value)} 
                      style={inputStyle}
                      disabled={!selectedIndustry || loadingIndustries}
                    >
                      <option value="">{!selectedIndustry ? (ui?.selectIndustryFirst || '— Select industry first —') : (ui?.selectSubIndustry || '— Select Sub-Industry —')}</option>
                      {selectedIndustry && industries[selectedIndustry]?.subIndustries?.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={labelStyle}>{ui?.organizationName || 'Organization Name'}</label>
                  <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder={ui?.enterOrgName || 'Enter organization name'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.countryRegion || 'Country / Region'}</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle} disabled={loadingOptions}>
                    <option value="">{loadingOptions ? (ui?.loading || 'Loading...') : (ui?.selectCountry || '— Select Country —')}</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{ui?.companySize || 'Company Size'}</label>
                  <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} style={inputStyle} disabled={loadingOptions}>
                    <option value="">{loadingOptions ? (ui?.loading || 'Loading...') : (ui?.selectSize || '— Select Size —')}</option>
                    {companySizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{ui?.preparedBy || 'Prepared By'}</label>
                  <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder={ui?.yourName || 'Your name'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.preparedByEmail || 'Prepared By Email'}</label>
                  <input type="email" value={preparedByEmail} onChange={(e) => setPreparedByEmail(e.target.value)} placeholder="your.email@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.preparedFor || 'Prepared For'}</label>
                  <input type="text" value={preparedFor} onChange={(e) => setPreparedFor(e.target.value)} placeholder={ui?.clientName || 'Client name or organization'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.preparedForEmail || 'Prepared For Email'}</label>
                  <input type="email" value={preparedForEmail} onChange={(e) => setPreparedForEmail(e.target.value)} placeholder="client.email@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.yourRole || 'Your Role (ISCO-08)'}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Category selector */}
                    <select 
                      value={selectedIscoCategory} 
                      onChange={(e) => {
                        setSelectedIscoCategory(e.target.value);
                        setSelectedRole('');
                        setSelectedRoleId('');
                      }} 
                      style={{...inputStyle, fontSize: 13}}
                    >
                      <option value="">{ui?.selectCategory || 'Select Category...'}</option>
                      {Object.entries(iscoOccupations).map(([cat, data]) => (
                        <option key={cat} value={cat}>{data.icon} {cat}</option>
                      ))}
                    </select>
                    {/* Role selector */}
                    <select 
                      value={selectedRole} 
                      onChange={(e) => {
                        setSelectedRole(e.target.value);
                        setSelectedRoleId(e.target.value);
                      }} 
                      style={inputStyle}
                      disabled={!selectedIscoCategory}
                    >
                      <option value="">{ui?.selectRole || 'Select Role...'}</option>
                      {selectedIscoCategory && iscoOccupations[selectedIscoCategory]?.subOccupations?.map((occ, idx) => (
                        <option key={idx} value={occ}>{occ}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{ui?.reportingPeriod || 'Reporting Period'}</label>
                  <select value={reportingPeriod} onChange={(e) => setReportingPeriod(e.target.value)} style={inputStyle} disabled={loadingOptions}>
                    <option value="">{loadingOptions ? (ui?.loading || 'Loading...') : (ui?.selectTimeFrame || '— Select Time Frame —')}</option>
                    {timeFrames.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>
              </div>
              
              {/* Target Savings and Secondary Objectives Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>{ui?.targetSavings || 'Target Savings / Value Creation'}</label>
                  <input type="text" value={targetSavings} onChange={(e) => setTargetSavings(e.target.value)} placeholder="$2,000,000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{ui?.secondaryObjectives || 'Secondary Objectives'}</label>
                  <textarea 
                    value={secondaryObjectives} 
                    onChange={(e) => setSecondaryObjectives(e.target.value)} 
                    placeholder={ui?.secondaryObjectivesPlaceholder || 'Describe additional transformation objectives...'}
                    rows={2}
                    style={{...inputStyle, minHeight: 60, resize: 'vertical'}}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              🔥 {ui?.burningIssues || 'Burning Issues'}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{ui?.aiGenerated || '(AI-Generated)'}</span>
            </h3>
            
            {loadingBurningIssues ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> {ui?.loadingBurningIssues || 'Loading burning issues...'}
              </div>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
                  {ui?.burningIssuesHint || 'Select the top issues affecting your organization (AI suggests top 6 for your industry):'}
                </p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  {aiBurningIssues.map((issue, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => {
                        setSelectedBurningIssues(prev => 
                          prev.includes(issue.title) 
                            ? prev.filter(t => t !== issue.title) 
                            : [...prev, issue.title]
                        );
                      }} 
                      style={{ 
                        padding: '12px 18px', 
                        borderRadius: 12, 
                        background: selectedBurningIssues.includes(issue.title) ? config.color : 'rgba(255,255,255,0.05)', 
                        color: selectedBurningIssues.includes(issue.title) ? '#000' : '#fff', 
                        border: `1px solid ${selectedBurningIssues.includes(issue.title) ? config.color : 'rgba(255,255,255,0.15)'}`, 
                        cursor: 'pointer', 
                        fontWeight: 500, 
                        fontSize: 13,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 4,
                        textAlign: 'left',
                        minWidth: 180,
                        transition: 'all 0.2s ease'
                      }}
                      title={issue.description}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{issue.icon}</span>
                        <span>{issue.title}</span>
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
                        {issue.stat} {issue.statLabel}
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Custom Issue Input */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
                    {ui?.addOwnIssue || 'Or add your own burning issue:'}
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="text" 
                      value={customIssue} 
                      onChange={(e) => setCustomIssue(e.target.value)} 
                      placeholder={ui?.addIssuePlaceholder || 'e.g., Budget Allocation Delays, Inter-Agency Coordination...'}
                      style={{ 
                        flex: 1, 
                        padding: '12px 16px', 
                        borderRadius: 8, 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.15)', 
                        color: '#fff', 
                        fontSize: 14 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customIssue.trim()) {
                          setSelectedBurningIssues(prev => [...prev, customIssue.trim()]);
                          setCustomIssue('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (customIssue.trim()) {
                          setSelectedBurningIssues(prev => [...prev, customIssue.trim()]);
                          setCustomIssue('');
                        }
                      }}
                      style={{ 
                        padding: '12px 20px', 
                        borderRadius: 8, 
                        background: config.color, 
                        color: '#000', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontWeight: 600, 
                        fontSize: 14 
                      }}
                    >
                      {ui?.addBtn || '+ Add'}
                    </button>
                  </div>
                </div>
                
                {/* Selected Issues Summary */}
                {selectedBurningIssues.length > 0 && (
                  <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                      {ui?.selectedIssues || 'Selected Issues'} ({selectedBurningIssues.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedBurningIssues.map((issue, idx) => (
                        <span 
                          key={idx} 
                          style={{ 
                            padding: '4px 10px', 
                            background: `${config.color}30`, 
                            borderRadius: 6, 
                            fontSize: 12, 
                            color: config.color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          {issue}
                          <span 
                            onClick={() => setSelectedBurningIssues(prev => prev.filter(i => i !== issue))}
                            style={{ cursor: 'pointer', opacity: 0.7 }}
                          >×</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 18 }}>{ui?.additionalContext || 'Additional Context'}</h3>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder={ui?.additionalContextPlaceholder || 'Any specific focus areas, concerns, or context for this report...'} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <h3 style={{ color: '#fff', margin: '0 0 24px 0', fontSize: 18 }}>Workflow Status</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, left: '10%', right: '10%', height: 4, background: 'rgba(255,255,255,0.1)', zIndex: 0 }} />
            {Object.values(WORKFLOW_STATES).map((state, idx) => {
              const isActive = Object.values(WORKFLOW_STATES).indexOf(workflowState) >= idx;
              return (
                <div key={state} style={{ textAlign: 'center', zIndex: 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: isActive ? config.color : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: isActive ? '#000' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{isActive ? '✓' : idx + 1}</div>
                  <div style={{ fontSize: 12, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{state.replace('_', ' ')}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {workflowState === WORKFLOW_STATES.DRAFT && <button onClick={handleSubmit} style={{ padding: '12px 24px', borderRadius: 8, background: config.color, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Submit for Review</button>}
            {workflowState === WORKFLOW_STATES.SUBMITTED && <button onClick={handleApprove} style={{ padding: '12px 24px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Approve Report</button>}
            {workflowState === WORKFLOW_STATES.APPROVED && (
              <button 
                onClick={handleFinalize} 
                disabled={finalizeLoading || !generatedReportHtml}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: 8, 
                  background: finalizeLoading ? 'rgba(59,130,246,0.5)' : '#3b82f6', 
                  color: '#fff', 
                  border: 'none', 
                  cursor: finalizeLoading ? 'wait' : 'pointer', 
                  fontWeight: 600,
                  opacity: !generatedReportHtml ? 0.5 : 1,
                }}
              >
                {finalizeLoading ? '⏳ Saving to Airtable...' : 'Finalize Report'}
              </button>
            )}
            {workflowState === WORKFLOW_STATES.FINALIZED && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '12px 24px', background: 'rgba(16,185,129,0.2)', borderRadius: 8, color: '#10b981', fontWeight: 600 }}>✓ Report Finalized</div>
                {downloadLink && (
                  <a 
                    href={downloadLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: 8, 
                      background: '#8b5cf6', 
                      color: '#fff', 
                      textDecoration: 'none', 
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    📥 Download Report
                  </a>
                )}
                {airtableRecordId && (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Record: {airtableRecordId}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, border: `1px solid ${config.color}20` }}>
          <h3 style={{ color: '#fff', margin: '0 0 24px 0', fontSize: 18 }}>Approvals & Comments</h3>
          {approvals.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 12 }}>Approval History</h4>
              {approvals.map((a, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff' }}><strong>{a.action}</strong> by {a.by} ({a.role})</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{new Date(a.date).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 12 }}>Comments ({comments.length})</h4>
            {comments.map(c => (
              <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: config.color, fontWeight: 600 }}>{c.author} ({c.role})</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{new Date(c.date).toLocaleString()}</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>{c.text}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ ...inputStyle, flex: 1 }} onKeyPress={(e) => e.key === 'Enter' && addComment()} />
              <button onClick={addComment} style={{ padding: '12px 24px', borderRadius: 8, background: config.color, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button onClick={generateReport} disabled={loading} style={{ padding: '16px 32px', borderRadius: 12, background: loading ? 'rgba(255,255,255,0.2)' : `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: loading ? 'rgba(255,255,255,0.5)' : '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16 }}>
        {loading ? (ui?.generating || 'Generating...') : (ui?.generateReport || `Generate ${config.name}`)}
      </button>

      {/* Email, Schedule, and AI Chat Features */}
      {generatedReportHtml && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <EmailReport 
            reportHtml={generatedReportHtml}
            reportTitle={`${config.name} - ${organizationName || 'Report'}`}
            verticalId={verticalId}
            color={config.color}
            lang={lang}
          />
          <ScheduledReports 
            verticalId={verticalId}
            currentConfig={{
              reportType,
              organizationName,
              preparedBy,
              reportingPeriod,
              selectedCategories,
              selectedRoleId,
              context,
            }}
            color={config.color}
            lang={lang}
          />
          <TeamWorkspace
            verticalId={verticalId}
            color={config.color}
            lang={lang}
            organizationName={organizationName}
          />
          <RealTimeDashboard
            verticalId={verticalId}
            color={config.color}
            lang={lang}
            reportData={generatedReportHtml}
          />
          <WhiteLabelSettings
            verticalId={verticalId}
            color={config.color}
            lang={lang}
            organizationName={organizationName}
          />
          <ApiAccess
            verticalId={verticalId}
            color={config.color}
            lang={lang}
            organizationName={organizationName}
          />
        </div>
      )}

      {/* Ask Sovereign AI Chat */}
      <AskSovereign
        reportHtml={generatedReportHtml}
        reportContext={context}
        verticalId={verticalId}
        color={config.color}
        lang={lang}
      />
    </div>
  );
}
