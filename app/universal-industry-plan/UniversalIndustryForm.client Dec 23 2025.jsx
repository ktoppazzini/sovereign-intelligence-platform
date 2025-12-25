'use client';
// app/universal-industry-plan/UniversalIndustryForm.client.jsx
// [KT:UNIVERSAL-FORM-v3.0] Dynamic Industry-Agnostic Form Component
// Features: AI-powered industries + pain points, 207 languages, 3-button workflow
// [KT:I18N] Full form translation using useTranslation hook (GPT-5-nano)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import useTranslation from '../hooks/useTranslation';

// ============================================================================
// BASE_UI - All translatable form labels (English defaults)
// These get translated via GPT-5-nano when user selects a different language
// ============================================================================
const BASE_UI = {
  // Page Header
  pageTitle: 'Universal Global Industry Transformation',
  pageSubtitle: 'AI-Powered 25,000+ Word Strategic Analysis for Any Industry, in Any Language, in Any Country',
  languagesSupported: 'languages supported',
  
  // Company Section
  companySection: 'Company Information',
  companyName: 'Company Name',
  companyNamePlaceholder: 'Enter company name',
  countryRegion: 'Country / Region',
  companySize: 'Company Size',
  annualRevenue: 'Annual Revenue',
  
  // Industry Section
  industrySection: 'Industry Selection',
  aiPowered: 'AI-Powered',
  searchIndustries: 'Search industries...',
  industryCategory: 'Industry Category',
  subIndustry: 'Sub-Industry',
  selectSubIndustry: 'Select sub-industry...',
  customIndustry: 'Or Enter Custom Industry',
  customIndustryPlaceholder: 'e.g., Vertical Farming, Space Tourism, Quantum Computing...',
  
  // Role/Occupation Section (ISCO-08)
  roleSection: 'Your Role / Occupation',
  roleDescription: 'Select your role for a personalized report tailored to your responsibilities',
  searchRoles: 'Search roles...',
  roleCategory: 'Role Category',
  specificRole: 'Specific Role',
  selectRole: 'Select your role...',
  
  // Pain Points Section
  painPointsSection: 'Key Challenges & Pain Points',
  aiGenerated: 'AI-Generated',
  painPointsIntro: 'Based on your industry selection, AI has identified these critical challenges. Select the ones most relevant to your organization or add your own:',
  analyzingChallenges: 'Analyzing challenges...',
  selectIndustryForPainPoints: 'Select an industry above to see AI-generated pain points',
  addCustomChallenge: 'Add a custom challenge...',
  add: 'Add',
  selectedChallenges: 'Selected Challenges',
  
  // Strategic Goals Section
  strategicSection: 'Strategic Goals & Timeline',
  targetSavings: 'Target Savings / Value Creation',
  implementationTimeline: 'Implementation Timeline',
  strategicObjective: 'Primary Strategic Objective',
  strategicObjectivePlaceholder: 'Describe your main transformation objective...',
  
  // Report Details Section
  reportSection: 'Report Details',
  preparedFor: 'Prepared For',
  preparedForPlaceholder: 'Client name or executive',
  preparedBy: 'Prepared By',
  preparedByPlaceholder: 'Your name or organization',
  logoUrl: 'Company Logo URL',
  logoUrlPlaceholder: 'https://example.com/logo.png',
  optional: 'optional',
  
  // Approval Workflow Section
  approvalSection: 'Approval Workflow',
  sendApprovalEmail: 'Send approval request via email',
  emailApprovalHint: 'Report will be emailed to approver with Approve/Reject/Request Changes buttons',
  localApprovalHint: 'You will approve the report directly in the browser (no email sent)',
  approverEmail: 'Approver Email',
  approverEmailPlaceholder: 'approver@company.com',
  yourEmail: 'Your Email',
  yourEmailPlaceholder: 'your.email@company.com',
  forNotifications: 'for notifications',
  
  // Stakeholder Interviews Section [KT:INTERVIEWS]
  interviewsSection: 'Stakeholder Interviews',
  interviewsSubtitle: 'AI-powered interviews to capture stakeholder perspectives',
  enableInterviews: 'Enable stakeholder interviews',
  interviewsExplanation: 'Add stakeholders and send them AI-generated surveys tailored to their role',
  addStakeholder: 'Add Stakeholder',
  stakeholderName: 'Name',
  stakeholderNamePlaceholder: 'Full name',
  stakeholderEmail: 'Email',
  stakeholderEmailPlaceholder: 'email@company.com',
  stakeholderRole: 'Role',
  stakeholderDept: 'Department',
  stakeholderDeptPlaceholder: 'e.g., Operations',
  stakeholders: 'Stakeholders',
  noStakeholders: 'No stakeholders added yet',
  generateSurveyLinks: 'Generate Survey Links',
  sendSurveyEmails: 'Send Survey Emails',
  surveyLinksGenerated: 'Survey links generated!',
  copyAllLinks: 'Copy All Links',
  viewResponses: 'View Responses',
  responsesReceived: 'responses received',
  removeStakeholder: 'Remove',
  roleExecutive: 'Executive / C-Suite',
  roleOperations: 'Operations / Management',
  roleIT: 'IT / Technology',
  roleFinance: 'Finance / Accounting',
  roleHR: 'HR / People',
  roleSales: 'Sales / Marketing',
  roleCustomerService: 'Customer Service',
  roleOther: 'Other',
  
  // Document Upload Section [KT:DOCUMENTS]
  documentsSection: 'Supporting Documents',
  documentsSubtitle: 'Upload documents for AI analysis and context',
  uploadDocuments: 'Upload Documents',
  supportedFormats: 'PDF, DOCX, XLSX, TXT, CSV (Max 10MB each)',
  uploadedDocuments: 'Uploaded Documents',
  noDocuments: 'No documents uploaded',
  removeDocument: 'Remove',
  analyzing: 'Analyzing...',
  
  // Buttons & Actions
  generateReport: 'Generate Transformation Report',
  generating: 'Generating 25,000+ Word Report...',
  editReport: 'Edit Report',
  submitForApproval: 'Submit for Approval',
  sendForApproval: 'Send for Approval',
  submitting: 'Submitting...',
  approvalEmailSentTo: 'Approval email will be sent to',
  notSet: 'not set',
  
  // Preview Step
  reviewReport: 'Review Your Generated Report',
  reportPreview: 'Report Preview',
  backToEdit: 'Back to Edit',
  
  // Decision Step
  approveOrRequestChanges: 'Approve or Request Changes',
  reportReadyForApproval: 'Report Ready for Approval',
  approvalEmailSent: 'Approval Email Sent!',
  emailSentMessage: 'An approval email has been sent. They will click Approve/Reject in the email.',
  reviewCompleteMessage: 'Review complete. Choose to approve and export, or reject to make changes.',
  createNewReport: 'Create New Report',
  previewExportAnyway: 'Preview/Export Anyway',
  rejectAndEdit: 'Reject & Edit',
  approveAndExport: 'Approve & Export',
  
  // Final Step
  exportApprovedReport: 'Export Your Approved Report',
  reportApproved: 'Report Approved!',
  reportReadyForExport: 'Your 25,000+ word transformation report is ready for export.',
  downloadHtml: 'Download HTML',
  printExportPdf: 'Print / Export PDF',
  
  // Workflow Steps
  step1Configure: 'Configure',
  step2Preview: 'Preview',
  step3Approve: 'Approve',
  step4Export: 'Export',
  
  // Misc
  required: 'required',
  error: 'Something went wrong',
  finalReport: 'Final Report',
};

// Company size and time frame options
const COMPANY_SIZES = [
  '1-50 employees', '51-200 employees', '201-500 employees', '501-1,000 employees',
  '1,001-5,000 employees', '5,001-10,000 employees', '10,001-50,000 employees', '50,001+ employees',
];

const TIME_FRAMES = ['6 months', '1 year', '18 months', '2 years', '3 years', '5 years'];

const REVENUE_RANGES = [
  'Not Applicable (Government/Non-Profit)',
  'Under $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M',
  '$100M - $500M', '$500M - $1B', '$1B - $5B', '$5B - $10B', '$10B+',
];

// [KT:AIRTABLE] Countries now loaded dynamically from Airtable via /api/reform/options
// Fallback list used while loading or if API fails
const FALLBACK_COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain',
  'Netherlands', 'Belgium', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Australia', 'New Zealand', 'Japan', 'China', 'South Korea', 'India', 'Singapore',
];

const DEFAULT_INDUSTRIES = {
  'General Business': {
    icon: '💼',
    subIndustries: ['Professional Services', 'Consulting', 'Other'],
  },
};

export default function UniversalIndustryForm({ 
  initialLang = 'English', 
  onReportGenerated,
  setGenDoneExternal,        // [KT:INLINE-EDIT] Passed from page.jsx
  setGeneratedHtmlExternal   // [KT:INLINE-EDIT] Passed from page.jsx
}) {
  // ============================================================================
  // URL Params & Translation Hook
  // [KT:I18N] Language is set during onboarding - comes from URL ?lang= parameter
  // ============================================================================
  const searchParams = useSearchParams();
  const lang = searchParams?.get('lang') || initialLang;

  // [KT:I18N] Translation hook - translates all form labels via GPT-5-nano
  const { t: ui, rtl, loading: loadingUI } = useTranslation(BASE_UI, lang);

  // ============================================================================
  // STATE - Industries (loaded from AI)
  // ============================================================================
  // ============================================================================
  const [industries, setIndustries] = useState(DEFAULT_INDUSTRIES);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  
  // [KT:AIRTABLE] Countries loaded from Airtable (265 countries)
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES);
  const [loadingCountries, setLoadingCountries] = useState(true);
  
  // [KT:ISCO-08] Occupations/Roles loaded from API (436 occupations)
  const [occupations, setOccupations] = useState({});
  const [loadingOccupations, setLoadingOccupations] = useState(true);
  const [occupationCategory, setOccupationCategory] = useState('');
  const [occupation, setOccupation] = useState('');
  const [occupationSearch, setOccupationSearch] = useState('');
  
  const [industryCategory, setIndustryCategory] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');

  // ============================================================================
  // STATE - Company Info
  // ============================================================================
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [companySize, setCompanySize] = useState('1,001-5,000 employees');
  const [revenue, setRevenue] = useState('$100M - $500M');
  const [timeFrame, setTimeFrame] = useState('2 years');
  const [targetSavings, setTargetSavings] = useState('2000000');
  const [strategicGoal, setStrategicGoal] = useState('');
  const [preparedFor, setPreparedFor] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // ============================================================================
  // STATE - Pain Points (loaded from AI based on selections)
  // ============================================================================
  const [painPoints, setPainPoints] = useState([]);
  const [selectedPainPoints, setSelectedPainPoints] = useState([]);
  const [loadingPainPoints, setLoadingPainPoints] = useState(false);
  const [customPainPoint, setCustomPainPoint] = useState('');
  const [useAIPainPoints, setUseAIPainPoints] = useState(true); // Toggle: true = AI-generated, false = custom entry
  const [customPainPointsList, setCustomPainPointsList] = useState([]); // User's own pain points list

  // ============================================================================
  // STATE - Approval Workflow
  // ============================================================================
  const [approverEmail, setApproverEmail] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [useEmailApproval, setUseEmailApproval] = useState(false); // Toggle between local/email approval

  // ============================================================================
  // STATE - Stakeholder Interviews [KT:INTERVIEWS]
  // ============================================================================
  const [enableInterviews, setEnableInterviews] = useState(false);
  const [stakeholders, setStakeholders] = useState([]);
  const [newStakeholder, setNewStakeholder] = useState({ name: '', email: '', role: 'Operations / Management', department: '' });
  const [surveyId, setSurveyId] = useState('');
  const [surveyLinks, setSurveyLinks] = useState([]);
  const [surveyLinksGenerated, setSurveyLinksGenerated] = useState(false);
  const [generatingSurvey, setGeneratingSurvey] = useState(false);
  const [interviewResponses, setInterviewResponses] = useState([]);

  // ============================================================================
  // STATE - Document Upload [KT:DOCUMENTS]
  // ============================================================================
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // ============================================================================
  // STATE - Generation & Workflow
  // ============================================================================
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [reportToken, setReportToken] = useState('');
  const [workflowStep, setWorkflowStep] = useState('form'); // form | preview | decision | final

  // ============================================================================
  // LOAD: Industries from AI API (returns translated based on lang)
  // ============================================================================
  useEffect(() => {
    async function loadIndustries() {
      try {
        const res = await fetch(`/api/universal-industry-plan/ai-industries?lang=${encodeURIComponent(lang)}`);
        const data = await res.json();
        if (data.ok && data.industries) {
          setIndustries(data.industries);
          console.log('[UniversalForm] ✅ Loaded', data.categoryCount, 'categories,', data.totalSubIndustries, 'sub-industries');
        }
      } catch (e) {
        console.warn('[UniversalForm] ⚠️ Industries load failed:', e.message);
      } finally {
        setLoadingIndustries(false);
      }
    }
    loadIndustries();
  }, [lang]);

  // ============================================================================
  // LOAD: Countries from Airtable (265 countries)
  // [KT:AIRTABLE] Fetches from /api/reform/options which pulls from Countries table
  // ============================================================================
  useEffect(() => {
    let cancelled = false;
    async function loadCountries() {
      try {
        const res = await fetch('/api/reform/options', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data?.countries) && data.countries.length > 0) {
          setCountries(data.countries);
          console.log('[UniversalForm] ✅ Loaded', data.countries.length, 'countries from Airtable');
        }
      } catch (e) {
        console.warn('[UniversalForm] ⚠️ Countries load failed, using fallback:', e.message);
        // Keep FALLBACK_COUNTRIES
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    }
    loadCountries();
    return () => { cancelled = true; };
  }, []);

  // ============================================================================
  // LOAD: Occupations/Roles from ISCO-08 API (436 occupations)
  // [KT:ISCO-08] Full ILO standard classification of occupations
  // ============================================================================
  useEffect(() => {
    let cancelled = false;
    async function loadOccupations() {
      try {
        const res = await fetch(`/api/universal-industry-plan/ai-occupations?lang=${encodeURIComponent(lang)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.occupations) {
          setOccupations(data.occupations);
          console.log('[UniversalForm] ✅ Loaded', data.majorGroupCount, 'major groups,', data.totalOccupations, 'occupations (ISCO-08)');
        }
      } catch (e) {
        console.warn('[UniversalForm] ⚠️ Occupations load failed:', e.message);
      } finally {
        if (!cancelled) setLoadingOccupations(false);
      }
    }
    loadOccupations();
    return () => { cancelled = true; };
  }, [lang]);

  // ============================================================================
  // LOAD: AI Pain Points based on industry selection (returns translated)
  // ============================================================================
  const fetchPainPoints = useCallback(async (selectedIndustry) => {
    if (!selectedIndustry) return;
    setLoadingPainPoints(true);
    setError('');
    try {
      const params = new URLSearchParams({
        industry: selectedIndustry,
        lang: lang,
        companySize: companySize,
        revenue: revenue,
      });
      const res = await fetch(`/api/universal-industry-plan/ai-painpoints?${params}`);
      const data = await res.json();
      if (data.ok && data.painPoints) {
        setPainPoints(data.painPoints);
        console.log('[UniversalForm] ✅ Loaded', data.painPoints.length, 'pain points for', selectedIndustry);
      }
    } catch (e) {
      console.error('[UniversalForm] ⚠️ Pain points error:', e);
    } finally {
      setLoadingPainPoints(false);
    }
  }, [lang, companySize, revenue]);

  useEffect(() => {
    const effectiveIndustry = customIndustry || industry;
    if (effectiveIndustry) {
      fetchPainPoints(effectiveIndustry);
      setSelectedPainPoints([]); // Reset selections when industry changes
    }
  }, [industry, customIndustry, fetchPainPoints]);

  // ============================================================================
  // [KT:INLINE-EDIT] Listen for HTML updates from page.jsx inline editing
  // ============================================================================
  useEffect(() => {
    const handleHtmlUpdated = (e) => {
      if (e?.detail?.html) {
        setGeneratedHtml(e.detail.html);
        console.log('[UniversalForm] HTML updated from inline edit');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('si-universal-html-updated', handleHtmlUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('si-universal-html-updated', handleHtmlUpdated);
      }
    };
  }, []);

  // ============================================================================
  // [KT:TYPESWITCH] Inject TypeSwitch script for chart type dropdowns
  // Enables line/bar/pie switching on charts with translated labels
  // ============================================================================
  useEffect(() => {
    if (!generatedHtml) return;

    // Dispatch event to page.jsx to update its report viewer
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('si-universal-generated', { 
        detail: { html: generatedHtml } 
      }));
    }

    // Inject TypeSwitch script after a brief delay for DOM to settle
    setTimeout(() => {
      try {
        const script = document.createElement('script');
        script.textContent = `(function(){if(typeof document==='undefined')return;console.log('[TypeSwitch] Executing');function applyType(card){try{if(!card)return;var sel=card.querySelector('select.chart-type-select')||card.querySelector('.chart-type-select')||card.querySelector('select');if(!sel)return;var value=(sel.value||'').trim();if(!value){value=card.getAttribute('data-type')||'line';sel.value=value;}card.setAttribute('data-type',value);var plots=card.querySelectorAll('.plot');plots.forEach(function(p){var match=p.classList.contains(value);p.style.display=match?'block':'none';});}catch(e){console.error('[applyType]',e);}}function initTypes(){var cards=document.querySelectorAll('.chart-card, figure[data-type]');console.log('[TypeSwitch] Found '+cards.length+' cards');cards.forEach(function(c){applyType(c);});}document.addEventListener('change',function(e){if(e.target.tagName!=='SELECT')return;var card=e.target.closest('.chart-card')||e.target.closest('figure[data-type]');if(card)applyType(card);},true);initTypes();if(typeof window!=='undefined'){window.reportGraphs={_applyType:applyType,_initTypes:initTypes};console.log('[TypeSwitch] Ready');}})();`;
        document.body.appendChild(script);
        console.log('[UniversalForm] TypeSwitch injected');
      } catch (e) {
        console.error('[UniversalForm] TypeSwitch failed:', e);
      }
    }, 100);
  }, [generatedHtml]);

  // ============================================================================
  // Filter helpers
  // [KT:I18N] Language filtering removed - language is set via URL param from onboarding
  // ============================================================================
  const filteredIndustryCategories = industrySearch
    ? Object.keys(industries).filter(cat =>
        cat.toLowerCase().includes(industrySearch.toLowerCase()) ||
        industries[cat].subIndustries.some(sub => sub.toLowerCase().includes(industrySearch.toLowerCase()))
      )
    : Object.keys(industries);

  const subIndustries = industryCategory ? (industries[industryCategory]?.subIndustries || []) : [];
  const filteredSubIndustries = industrySearch
    ? subIndustries.filter(sub => sub.toLowerCase().includes(industrySearch.toLowerCase()))
    : subIndustries;

  // ============================================================================
  // Filter helpers - Occupations/Roles (ISCO-08)
  // ============================================================================
  const filteredOccupationCategories = occupationSearch
    ? Object.keys(occupations).filter(cat =>
        cat.toLowerCase().includes(occupationSearch.toLowerCase()) ||
        occupations[cat].subOccupations?.some(sub => sub.toLowerCase().includes(occupationSearch.toLowerCase()))
      )
    : Object.keys(occupations);

  const subOccupations = occupationCategory ? (occupations[occupationCategory]?.subOccupations || []) : [];
  const filteredSubOccupations = occupationSearch
    ? subOccupations.filter(sub => sub.toLowerCase().includes(occupationSearch.toLowerCase()))
    : subOccupations;

  // Get current occupation metadata for display
  const currentOccupationMeta = occupationCategory ? occupations[occupationCategory] : null;

  // ============================================================================
  // Pain point handlers
  // ============================================================================
  const togglePainPoint = (name) => {
    setSelectedPainPoints(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const addCustomPainPoint = () => {
    if (customPainPoint.trim() && !selectedPainPoints.includes(customPainPoint.trim())) {
      setSelectedPainPoints(prev => [...prev, customPainPoint.trim()]);
      setCustomPainPoint('');
    }
  };

  // ============================================================================
  // STEP 1: Generate Report
  // ============================================================================
  const handleGenerateReport = async (e) => {
    e?.preventDefault();
    const effectiveIndustry = customIndustry || industry;
    if (!effectiveIndustry || !companyName) {
      setError('Please fill in Company Name and select an Industry');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setProgressMessage('Initializing AI analysis...');
    setError('');
    setGeneratedHtml('');

    const progressSteps = [
      { pct: 10, msg: 'Analyzing industry landscape...' },
      { pct: 25, msg: 'Researching benchmarks & best practices...' },
      { pct: 40, msg: 'Diagnosing challenges & root causes...' },
      { pct: 55, msg: 'Developing strategic solutions...' },
      { pct: 70, msg: 'Building financial projections...' },
      { pct: 85, msg: 'Creating implementation roadmap...' },
      { pct: 95, msg: 'Finalizing 25,000+ word report...' },
    ];

    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < progressSteps.length) {
        setProgress(progressSteps[stepIdx].pct);
        setProgressMessage(progressSteps[stepIdx].msg);
        stepIdx++;
      }
    }, 3000);

    try {
      // [KT:INTERVIEWS] Fetch interview responses if surveys were conducted
      let interviewData = null;
      if (enableInterviews && surveyId) {
        try {
          const intRes = await fetch(`/api/universal-industry-plan/interviews/get-responses?surveyId=${surveyId}&format=report`);
          const intData = await intRes.json();
          if (intData.ok && intData.reportData) {
            interviewData = intData.reportData;
          }
        } catch (intErr) {
          console.warn('[UniversalForm] Interview data fetch failed:', intErr);
        }
      }

      // [KT:DOCUMENTS] Prepare document summaries for AI context
      const documentSummaries = uploadedDocuments.map(doc => ({
        name: doc.name,
        type: doc.type,
        // Include text content for text files (first 5000 chars)
        excerpt: doc.content && typeof doc.content === 'string' && !doc.content.startsWith('data:') 
          ? doc.content.substring(0, 5000) 
          : null,
      })).filter(d => d.excerpt); // Only include documents with extractable text

      const res = await fetch('/api/universal-industry-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          industry: effectiveIndustry,
          orgName: companyName,
          companyName,
          country,
          companySize,
          revenue,
          timeFrame,
          costSavingsGoal: parseInt(targetSavings.replace(/[^0-9]/g, ''), 10) || 2000000,
          strategicGoal,
          selectedPainPoints,
          preparedFor: preparedFor || companyName,
          preparedBy: preparedBy || 'Sovereign Intelligence',
          logoUrl,
          // [KT:ISCO-08] Role-based personalization
          occupation: occupation || null,
          occupationCategory: occupationCategory || null,
          occupationMeta: currentOccupationMeta ? {
            code: currentOccupationMeta.code,
            level: currentOccupationMeta.level,
            reportFocus: currentOccupationMeta.reportFocus || []
          } : null,
          // [KT:INTERVIEWS] Include stakeholder interview insights
          interviewData,
          // [KT:DOCUMENTS] Include document context
          documentSummaries: documentSummaries.length > 0 ? documentSummaries : null,
        }),
      });

      clearInterval(progressInterval);
      const data = await res.json();

      if (data.ok && data.html) {
        setProgress(100);
        setProgressMessage('Report generated successfully!');
        setGeneratedHtml(data.html);
        setReportToken(data.token || '');
        setWorkflowStep('preview');
        
        // [KT:INLINE-EDIT] Update external state for page.jsx report viewer
        if (setGenDoneExternal) setGenDoneExternal(true);
        if (setGeneratedHtmlExternal) setGeneratedHtmlExternal(data.html);
        
        if (onReportGenerated) onReportGenerated(data);
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (e) {
      clearInterval(progressInterval);
      setError(`Generation error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================================
  // STEP 2: Submit for Review (Email or Local)
  // ============================================================================
  const handleSubmitForReview = async () => {
    if (useEmailApproval && !approverEmail) {
      setError('Please enter approver email address');
      return;
    }

    // If using local approval (no email), skip to decision step directly
    if (!useEmailApproval) {
      setWorkflowStep('decision');
      return;
    }

    // Email-based approval workflow
    setGenerating(true);
    setProgressMessage('Submitting for review...');
    setError('');
    try {
      const res = await fetch('/api/universal-industry-plan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedHtml,
          orgName: companyName,
          industry: customIndustry || industry,
          lang,
          approverEmail,
          requesterEmail: requesterEmail || '',
          preparedFor: preparedFor || companyName,
          preparedBy: preparedBy || 'Sovereign Intelligence',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReportToken(data.recordId || data.token);
        setWorkflowStep('decision');
      } else {
        setError(data.error || 'Submit failed');
      }
    } catch (e) {
      setError(`Submit error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================================
  // STEP 3: Decision (Approve/Reject) - Local only; email decisions handled by decision route
  // ============================================================================
  const handleDecision = async (decision) => {
    // For local approval, just update state
    if (!useEmailApproval) {
      if (decision === 'approve') {
        setWorkflowStep('final');
      } else {
        setWorkflowStep('form');
        setGeneratedHtml('');
      }
      return;
    }

    // For email workflow, this would be handled by the decision route via email links
    // Here we just simulate for demo purposes
    setGenerating(true);
    setProgressMessage(`Processing ${decision}...`);
    try {
      if (decision === 'approve') {
        setWorkflowStep('final');
      } else {
        setWorkflowStep('form');
        setGeneratedHtml('');
      }
    } catch (e) {
      setError(`Decision error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================================
  // Export handlers
  // ============================================================================
  const handleExportHTML = () => {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName}_Transformation_Report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generatedHtml);
    printWindow.document.close();
    printWindow.print();
  };

  // ============================================================================
  // STYLES - Premium Enterprise Design
  // ============================================================================
  const styles = {
    // Page container with subtle gradient background
    container: { 
      maxWidth: 1100, 
      margin: '0 auto', 
      padding: '2.5rem 2rem', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
    },
    
    // Hero header with gradient text
    header: { 
      textAlign: 'center', 
      marginBottom: '3rem',
      position: 'relative',
    },
    headerTitle: { 
      fontSize: 'clamp(2rem, 4vw, 3rem)', 
      fontWeight: 800,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
    },
    headerSubtitle: { 
      color: '#94a3b8', 
      fontSize: '1.15rem',
      fontWeight: 500,
      maxWidth: 600,
      margin: '0 auto',
      lineHeight: 1.6,
    },
    
    // Premium glassmorphism card sections
    section: { 
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 20, 
      padding: '2rem', 
      marginBottom: '1.75rem', 
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(148, 163, 184, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      position: 'relative',
      overflow: 'hidden',
    },
    sectionGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
    },
    sectionTitle: { 
      fontSize: '1.35rem', 
      fontWeight: 700,
      color: '#f1f5f9',
      marginBottom: '1.5rem', 
      paddingBottom: '1rem', 
      borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem',
      letterSpacing: '-0.01em',
    },
    
    // Grid layouts
    grid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '1.25rem' 
    },
    formGroup: { marginBottom: '1.25rem' },
    
    // Labels
    label: { 
      display: 'block', 
      fontWeight: 600, 
      color: '#e2e8f0', 
      marginBottom: '0.6rem', 
      fontSize: '0.9rem',
      letterSpacing: '0.01em',
    },
    labelHint: { 
      fontSize: '0.75rem', 
      color: '#64748b', 
      fontWeight: 500,
      marginLeft: '0.5rem',
    },
    
    // Premium inputs with glow effect
    input: { 
      width: '100%', 
      padding: '0.875rem 1.125rem', 
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: 12, 
      fontSize: '1rem', 
      color: '#f1f5f9',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
    },
    inputFocus: {
      borderColor: 'rgba(139, 92, 246, 0.6)',
      boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 20px rgba(139, 92, 246, 0.1)',
    },
    textarea: { 
      width: '100%', 
      padding: '0.875rem 1.125rem', 
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: 12, 
      fontSize: '1rem', 
      color: '#f1f5f9',
      minHeight: 120, 
      resize: 'vertical',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
    },
    select: { 
      width: '100%', 
      padding: '0.875rem 1.125rem', 
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: 12, 
      fontSize: '1rem', 
      color: '#f1f5f9',
      cursor: 'pointer',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
    },
    selectMulti: { 
      width: '100%', 
      padding: '0.75rem', 
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: 12, 
      fontSize: '0.95rem', 
      color: '#f1f5f9',
      height: 180,
      outline: 'none',
    },
    
    // Pain points cards
    painPointsGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
      gap: '1rem' 
    },
    painPointCard: { 
      background: 'rgba(15, 23, 42, 0.5)',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      borderRadius: 14, 
      padding: '1.25rem', 
      cursor: 'pointer', 
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    painPointCardSelected: { 
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)',
      borderColor: 'rgba(139, 92, 246, 0.5)',
      boxShadow: '0 0 30px rgba(139, 92, 246, 0.15), inset 0 0 20px rgba(139, 92, 246, 0.05)',
    },
    
    // Premium buttons
    btn: { 
      padding: '0.875rem 1.75rem', 
      borderRadius: 12, 
      fontWeight: 600, 
      fontSize: '1rem', 
      cursor: 'pointer', 
      border: 'none', 
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
    },
    btnPrimary: { 
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
      color: 'white',
      boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.2)',
    },
    btnSecondary: { 
      background: 'rgba(51, 65, 85, 0.8)',
      color: '#e2e8f0',
      border: '1px solid rgba(148, 163, 184, 0.2)',
    },
    btnSuccess: { 
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)',
    },
    btnDanger: { 
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.5)',
    },
    btnDisabled: { 
      opacity: 0.5, 
      cursor: 'not-allowed',
      transform: 'none',
    },
    
    // Badge/tag styles
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.35rem 0.85rem',
      borderRadius: 20,
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    },
    
    // Error state
    error: { 
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#fca5a5', 
      padding: '1.25rem', 
      borderRadius: 14, 
      marginBottom: '1.5rem',
      backdropFilter: 'blur(10px)',
    },
    
    // Progress bar
    progressBar: { 
      height: 8, 
      background: 'rgba(51, 65, 85, 0.5)',
      borderRadius: 10, 
      overflow: 'hidden', 
      margin: '1.25rem 0',
    },
    progressFill: { 
      height: '100%', 
      background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)',
      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
    },
    progressText: { 
      textAlign: 'center', 
      color: '#94a3b8', 
      fontSize: '0.9rem', 
      marginTop: '0.75rem',
      fontWeight: 500,
    },
    
    // Tags
    tag: { 
      background: 'rgba(139, 92, 246, 0.15)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: 20, 
      padding: '0.35rem 0.85rem', 
      fontSize: '0.85rem', 
      color: '#c4b5fd', 
      cursor: 'pointer', 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.35rem',
      transition: 'all 0.2s ease',
    },
    
    // Workflow bar - premium glass effect
    workflowBar: { 
      display: 'flex', 
      justifyContent: 'center', 
      gap: '1rem', 
      padding: '1.5rem 2rem', 
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: 16, 
      marginBottom: '2rem', 
      flexWrap: 'wrap',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
    },
    workflowStep: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem', 
      color: '#64748b',
      fontSize: '0.95rem',
      fontWeight: 500,
      padding: '0.5rem 1rem',
      borderRadius: 10,
      transition: 'all 0.3s ease',
    },
    workflowStepActive: { 
      color: '#f1f5f9',
      fontWeight: 700,
      background: 'rgba(139, 92, 246, 0.2)',
    },
    workflowStepComplete: { 
      color: '#a78bfa',
    },
    
    // Preview styles
    previewHeader: { 
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
      color: '#f1f5f9', 
      padding: '1.25rem 1.75rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      borderRadius: '16px 16px 0 0', 
      flexWrap: 'wrap', 
      gap: '0.75rem',
      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    },
    previewFrame: { 
      width: '100%', 
      height: 750, 
      border: 'none', 
      borderRadius: '0 0 16px 16px',
      background: '#fff',
    },
    
    // Loading spinner
    loadingSpinner: { 
      display: 'inline-block', 
      width: 24, 
      height: 24, 
      border: '3px solid rgba(139, 92, 246, 0.2)',
      borderTop: '3px solid #8b5cf6', 
      borderRadius: '50%', 
      animation: 'spin 0.8s linear infinite',
    },
  };

  // ============================================================================
  // RENDER: Workflow Progress Bar
  // ============================================================================
  const renderWorkflowBar = () => (
    <div style={{ ...styles.workflowBar, direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ ...styles.workflowStep, ...(workflowStep === 'form' ? styles.workflowStepActive : styles.workflowStepComplete) }}>
        <span style={{ fontSize: '1.5rem' }}>📝</span>
        <span>1. {ui.step1Configure}</span>
      </div>
      <div style={{ color: 'white', opacity: 0.3 }}>{rtl ? '←' : '→'}</div>
      <div style={{ ...styles.workflowStep, ...(workflowStep === 'preview' ? styles.workflowStepActive : workflowStep === 'decision' || workflowStep === 'final' ? styles.workflowStepComplete : {}) }}>
        <span style={{ fontSize: '1.5rem' }}>🔍</span>
        <span>2. {ui.step2Preview}</span>
      </div>
      <div style={{ color: 'white', opacity: 0.3 }}>{rtl ? '←' : '→'}</div>
      <div style={{ ...styles.workflowStep, ...(workflowStep === 'decision' ? styles.workflowStepActive : workflowStep === 'final' ? styles.workflowStepComplete : {}) }}>
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <span>3. {ui.step3Approve}</span>
      </div>
      <div style={{ color: 'white', opacity: 0.3 }}>{rtl ? '←' : '→'}</div>
      <div style={{ ...styles.workflowStep, ...(workflowStep === 'final' ? styles.workflowStepActive : {}) }}>
        <span style={{ fontSize: '1.5rem' }}>📤</span>
        <span>4. {ui.step4Export}</span>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Main Form
  // ============================================================================
  if (workflowStep === 'form') {
    return (
      <div style={{ ...styles.container, direction: rtl ? 'rtl' : 'ltr' }}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🌐 {ui.pageTitle}</h1>
          <p style={styles.headerSubtitle}>{ui.pageSubtitle}</p>
        </div>

        {renderWorkflowBar()}

        {error && <div style={styles.error}>❌ {error}</div>}

        <form onSubmit={handleGenerateReport}>
          {/* Company Information */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏢 {ui.companySection}</h2>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.companyName} <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={styles.input}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={ui.companyNamePlaceholder}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.countryRegion} {loadingCountries && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(loading...)</span>}</label>
                <select style={styles.select} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">— Select Country —</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.companySize}</label>
                <select style={styles.select} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                  {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.annualRevenue}</label>
                <select style={styles.select} value={revenue} onChange={(e) => setRevenue(e.target.value)}>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Industry Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏭 {ui.industrySection} <span style={styles.labelHint}>({ui.aiPowered})</span></h2>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                style={styles.input}
                placeholder={`🔍 ${ui.searchIndustries}`}
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
              />
            </div>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.industryCategory} <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  style={styles.selectMulti}
                  value={industryCategory}
                  onChange={(e) => { setIndustryCategory(e.target.value); setIndustry(''); setCustomIndustry(''); }}
                  size={8}
                >
                  {loadingIndustries ? (
                    <option disabled>Loading industries...</option>
                  ) : (
                    filteredIndustryCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {industries[cat]?.icon || '📁'} {cat}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.subIndustry}</label>
                <select
                  style={styles.selectMulti}
                  value={industry}
                  onChange={(e) => { setIndustry(e.target.value); setCustomIndustry(''); }}
                  disabled={!industryCategory}
                  size={8}
                >
                  <option value="">Select sub-industry...</option>
                  {filteredSubIndustries.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ ...styles.formGroup, marginTop: '1rem' }}>
              <label style={styles.label}>Or Enter Custom Industry</label>
              <input
                style={styles.input}
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                placeholder="e.g., Vertical Farming, Space Tourism, Quantum Computing..."
              />
            </div>
          </div>

          {/* Role/Occupation Selection (ISCO-08) */}
          <div style={styles.section}>
            <div style={styles.sectionGlow}></div>
            <h2 style={styles.sectionTitle}>
              👤 {ui.roleSection} 
              <span style={styles.labelHint}>({ui.aiPowered})</span>
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {ui.roleDescription}
            </p>
            
            {/* Search Input */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                style={styles.input}
                placeholder={`🔍 ${ui.searchRoles}`}
                value={occupationSearch}
                onChange={(e) => setOccupationSearch(e.target.value)}
              />
            </div>
            
            {/* Two-Column Role Selection */}
            <div style={styles.grid}>
              {/* Major Group (Left Column) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.roleCategory}</label>
                <select
                  style={styles.selectMulti}
                  value={occupationCategory}
                  onChange={(e) => { setOccupationCategory(e.target.value); setOccupation(''); }}
                  size={8}
                >
                  {loadingOccupations ? (
                    <option disabled>Loading roles...</option>
                  ) : (
                    filteredOccupationCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {occupations[cat]?.icon || '👤'} {cat}
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              {/* Specific Role (Right Column) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{ui.specificRole}</label>
                <select
                  style={styles.selectMulti}
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  disabled={!occupationCategory}
                  size={8}
                >
                  <option value="">{ui.selectRole}</option>
                  {filteredSubOccupations.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Show role metadata when selected */}
            {currentOccupationMeta && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem 1.25rem', 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)', 
                borderRadius: 12, 
                border: '1px solid rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ 
                  fontSize: '2rem', 
                  width: 50, 
                  height: 50, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(139, 92, 246, 0.2)',
                  borderRadius: 12
                }}>
                  {currentOccupationMeta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {occupationCategory}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    ISCO Code: {currentOccupationMeta.code} • Level: <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{currentOccupationMeta.level}</span>
                  </div>
                  {occupation && (
                    <div style={{ color: '#34d399', fontSize: '0.9rem', marginTop: '0.35rem', fontWeight: 500 }}>
                      ✓ Selected: {occupation}
                    </div>
                  )}
                </div>
                {currentOccupationMeta.reportFocus && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.4rem',
                    maxWidth: 300
                  }}>
                    {currentOccupationMeta.reportFocus.slice(0, 4).map((focus, idx) => (
                      <span key={idx} style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.25rem 0.6rem', 
                        background: 'rgba(139, 92, 246, 0.2)', 
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: 20, 
                        color: '#c4b5fd',
                        textTransform: 'capitalize'
                      }}>
                        {focus}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pain Points */}
          <div style={styles.section}>
            <div style={styles.sectionGlow}></div>
            <h2 style={styles.sectionTitle}>⚠️ Key Challenges & Pain Points</h2>
            
            {/* Toggle: AI-Generated vs Custom Entry */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 14, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1, minWidth: 250, padding: '1.25rem', borderRadius: 12, border: useAIPainPoints ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)', background: useAIPainPoints ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)' : 'rgba(15, 23, 42, 0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: useAIPainPoints ? '0 0 30px rgba(139, 92, 246, 0.15)' : 'none' }}>
                <input type="radio" name="painPointMode" checked={useAIPainPoints} onChange={() => { setUseAIPainPoints(true); setSelectedPainPoints([]); }} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1rem' }}>🤖 AI-Generated Pain Points</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Let AI identify challenges based on your industry</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1, minWidth: 250, padding: '1.25rem', borderRadius: 12, border: !useAIPainPoints ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)', background: !useAIPainPoints ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)' : 'rgba(15, 23, 42, 0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: !useAIPainPoints ? '0 0 30px rgba(139, 92, 246, 0.15)' : 'none' }}>
                <input type="radio" name="painPointMode" checked={!useAIPainPoints} onChange={() => { setUseAIPainPoints(false); setSelectedPainPoints([]); }} style={{ width: 20, height: 20, accentColor: '#8b5cf6' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1rem' }}>✍️ Custom Pain Points</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Enter your own specific challenges</div>
                </div>
              </label>
            </div>

            {useAIPainPoints ? (
              /* AI-Generated Pain Points Mode */
              <>
                <p style={{ color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Based on your industry selection, AI has identified these critical challenges. Select the ones most relevant:
                </p>
                {loadingPainPoints ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <div style={styles.loadingSpinner}></div>
                    <p style={{ marginTop: '1rem', fontWeight: 500 }}>Analyzing {customIndustry || industry || 'industry'} challenges...</p>
                  </div>
                ) : painPoints.length > 0 ? (
                  <div style={styles.painPointsGrid}>
                    {painPoints.map((pp, idx) => (
                      <div
                        key={idx}
                        style={{
                          ...styles.painPointCard,
                          ...(selectedPainPoints.includes(pp.name) ? styles.painPointCardSelected : {}),
                        }}
                        onClick={() => togglePainPoint(pp.name)}
                      >
                        <h4 style={{ color: '#f1f5f9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: 22, height: 22, border: '2px solid rgba(148, 163, 184, 0.3)', borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
                            transition: 'all 0.2s ease',
                            ...(selectedPainPoints.includes(pp.name) ? { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderColor: '#8b5cf6', color: 'white' } : {}),
                          }}>
                            {selectedPainPoints.includes(pp.name) && '✓'}
                          </span>
                          {pp.name}
                        </h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>{pp.description}</p>
                        <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>💰 {pp.financialImpact}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                    👆 Select an industry above to see AI-generated pain points
                  </p>
                )}

                {selectedPainPoints.length > 0 && (
                  <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    <strong style={{ color: '#34d399' }}>✓ Selected AI Challenges ({selectedPainPoints.length}):</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {selectedPainPoints.map((pp, idx) => (
                        <span key={idx} style={styles.tag} onClick={() => togglePainPoint(pp)}>
                          {pp} <span style={{ marginLeft: '0.25rem' }}>✕</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Custom Pain Points Mode */
              <>
                <p style={{ color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Enter your organization's specific challenges. Add as many as needed:
                </p>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={customPainPoint}
                    onChange={(e) => setCustomPainPoint(e.target.value)}
                    placeholder="e.g., Legacy system integration challenges..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customPainPoint.trim() && !customPainPointsList.includes(customPainPoint.trim())) {
                          setCustomPainPointsList(prev => [...prev, customPainPoint.trim()]);
                          setSelectedPainPoints(prev => [...prev, customPainPoint.trim()]);
                          setCustomPainPoint('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    style={{ ...styles.btn, ...styles.btnPrimary }} 
                    onClick={() => {
                      if (customPainPoint.trim() && !customPainPointsList.includes(customPainPoint.trim())) {
                        setCustomPainPointsList(prev => [...prev, customPainPoint.trim()]);
                        setSelectedPainPoints(prev => [...prev, customPainPoint.trim()]);
                        setCustomPainPoint('');
                      }
                    }}
                  >
                    + Add Challenge
                  </button>
                </div>

                {customPainPointsList.length > 0 ? (
                  <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    <strong style={{ color: '#15803d' }}>✓ Your Custom Challenges ({customPainPointsList.length}):</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {customPainPointsList.map((pp, idx) => (
                        <span 
                          key={idx} 
                          style={styles.tag} 
                          onClick={() => {
                            setCustomPainPointsList(prev => prev.filter(p => p !== pp));
                            setSelectedPainPoints(prev => prev.filter(p => p !== pp));
                          }}
                        >
                          {pp} <span style={{ marginLeft: '0.25rem', cursor: 'pointer' }}>✕</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: 8, border: '2px dashed #d1d5db' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                    <p style={{ color: '#64748b' }}>No custom challenges added yet.<br />Enter your challenges above and click "Add Challenge".</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Strategic Goals */}
          <div style={styles.section}>
            <div style={styles.sectionGlow}></div>
            <h2 style={styles.sectionTitle}>🎯 Strategic Goals & Timeline</h2>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Target Savings / Value Creation</label>
                <input
                  style={styles.input}
                  value={targetSavings ? `$${Number(targetSavings).toLocaleString()}` : ''}
                  onChange={(e) => setTargetSavings(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="$2,000,000"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Implementation Timeline</label>
                <select style={styles.select} value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)}>
                  {TIME_FRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Primary Strategic Objective</label>
                <textarea
                  style={styles.textarea}
                  value={strategicGoal}
                  onChange={(e) => setStrategicGoal(e.target.value)}
                  placeholder="Describe your main transformation objective... (e.g., 'Achieve operational excellence through digital transformation while reducing costs by 20%')"
                />
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div style={styles.section}>
            <div style={styles.sectionGlow}></div>
            <h2 style={styles.sectionTitle}>📄 Report Details</h2>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Prepared For</label>
                <input style={styles.input} value={preparedFor} onChange={(e) => setPreparedFor(e.target.value)} placeholder="Client name or executive" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Prepared By</label>
                <input style={styles.input} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Your name or organization" />
              </div>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Company Logo URL <span style={styles.labelHint}>(optional)</span></label>
                <input style={styles.input} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
              </div>
            </div>
          </div>

          {/* Approval Workflow Settings */}
          <div style={styles.section}>
            <div style={styles.sectionGlow}></div>
            <h2 style={styles.sectionTitle}>✉️ Approval Workflow</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useEmailApproval}
                  onChange={(e) => setUseEmailApproval(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: '#8b5cf6' }}
                />
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>Send approval request via email</span>
              </label>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.6rem', marginLeft: '2rem', lineHeight: 1.6 }}>
                {useEmailApproval 
                  ? 'Report will be emailed to approver with Approve/Reject/Request Changes buttons' 
                  : 'You will approve the report directly in the browser (no email sent)'}
              </p>
            </div>
            
            {useEmailApproval && (
              <div style={styles.grid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Approver Email <span style={{ color: '#f87171' }}>*</span></label>
                  <input 
                    style={styles.input} 
                    type="email"
                    value={approverEmail} 
                    onChange={(e) => setApproverEmail(e.target.value)} 
                    placeholder="approver@company.com"
                    required={useEmailApproval}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Your Email <span style={styles.labelHint}>(for notifications)</span></label>
                  <input 
                    style={styles.input} 
                    type="email"
                    value={requesterEmail} 
                    onChange={(e) => setRequesterEmail(e.target.value)} 
                    placeholder="your.email@company.com"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              Stakeholder Interviews Section [KT:INTERVIEWS]
              AI-driven surveys sent to stakeholders based on their role
              ================================================================ */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              🎤 {ui.interviewsSection || 'Stakeholder Interviews'}
              <span style={{ ...styles.badge, background: '#8b5cf6', color: 'white', marginLeft: '0.5rem' }}>
                {ui.aiPowered || 'AI-Powered'}
              </span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {ui.interviewsSubtitle || 'AI-powered interviews to capture stakeholder perspectives'}
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableInterviews}
                  onChange={(e) => setEnableInterviews(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#8b5cf6' }}
                />
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {ui.enableInterviews || 'Enable stakeholder interviews'}
                </span>
              </label>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem', marginLeft: '1.75rem' }}>
                {ui.interviewsExplanation || 'Add stakeholders and send them AI-generated surveys tailored to their role'}
              </p>
            </div>

            {enableInterviews && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '1rem', border: '1px solid #e5e7eb' }}>
                {/* Add Stakeholder Form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      {ui.stakeholderName || 'Name'}
                    </label>
                    <input
                      type="text"
                      value={newStakeholder.name}
                      onChange={(e) => setNewStakeholder(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={ui.stakeholderNamePlaceholder || 'Full name'}
                      style={{ ...styles.input, padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      {ui.stakeholderEmail || 'Email'}
                    </label>
                    <input
                      type="email"
                      value={newStakeholder.email}
                      onChange={(e) => setNewStakeholder(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={ui.stakeholderEmailPlaceholder || 'email@company.com'}
                      style={{ ...styles.input, padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      {ui.stakeholderRole || 'Role'}
                    </label>
                    <select
                      value={newStakeholder.role}
                      onChange={(e) => setNewStakeholder(prev => ({ ...prev, role: e.target.value }))}
                      style={{ ...styles.input, padding: '0.5rem 0.75rem' }}
                    >
                      <option value="Executive / C-Suite">{ui.roleExecutive || 'Executive / C-Suite'}</option>
                      <option value="Operations / Management">{ui.roleOperations || 'Operations / Management'}</option>
                      <option value="IT / Technology">{ui.roleIT || 'IT / Technology'}</option>
                      <option value="Finance / Accounting">{ui.roleFinance || 'Finance / Accounting'}</option>
                      <option value="HR / People">{ui.roleHR || 'HR / People'}</option>
                      <option value="Sales / Marketing">{ui.roleSales || 'Sales / Marketing'}</option>
                      <option value="Customer Service">{ui.roleCustomerService || 'Customer Service'}</option>
                      <option value="Other">{ui.roleOther || 'Other'}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                      {ui.stakeholderDept || 'Department'}
                    </label>
                    <input
                      type="text"
                      value={newStakeholder.department}
                      onChange={(e) => setNewStakeholder(prev => ({ ...prev, department: e.target.value }))}
                      placeholder={ui.stakeholderDeptPlaceholder || 'e.g., Operations'}
                      style={{ ...styles.input, padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newStakeholder.name && newStakeholder.email) {
                        setStakeholders(prev => [...prev, { ...newStakeholder, id: Date.now() }]);
                        setNewStakeholder({ name: '', email: '', role: 'Operations / Management', department: '' });
                        setSurveyLinksGenerated(false); // Reset if stakeholders change
                      }
                    }}
                    style={{ ...styles.btn, background: '#8b5cf6', color: 'white', padding: '0.5rem 1rem' }}
                    disabled={!newStakeholder.name || !newStakeholder.email}
                  >
                    + {ui.addStakeholder || 'Add'}
                  </button>
                </div>

                {/* Stakeholders List */}
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                    {ui.stakeholders || 'Stakeholders'} ({stakeholders.length})
                  </h4>
                  {stakeholders.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      {ui.noStakeholders || 'No stakeholders added yet'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {stakeholders.map((sh, idx) => (
                        <div key={sh.id || idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'white', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>{sh.name}</span>
                            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{sh.email}</span>
                            <span style={{
                              background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem',
                              borderRadius: 4, fontSize: '0.75rem'
                            }}>
                              {sh.role}
                            </span>
                            {surveyLinksGenerated && surveyLinks.find(l => l.email === sh.email) && (
                              <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Link ready</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStakeholders(prev => prev.filter((_, i) => i !== idx));
                              setSurveyLinksGenerated(false);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ✕ {ui.removeStakeholder || 'Remove'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generate Survey Links Button */}
                {stakeholders.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        setGeneratingSurvey(true);
                        try {
                          const res = await fetch('/api/universal-industry-plan/interviews/create-survey', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              companyName,
                              industry: customIndustry || industry,
                              painPoints: selectedPainPoints,
                              lang,
                              stakeholders,
                              createdBy: requesterEmail || 'system',
                            }),
                          });
                          const data = await res.json();
                          if (data.ok) {
                            setSurveyId(data.surveyId);
                            setSurveyLinks(data.surveyLinks || []);
                            setSurveyLinksGenerated(true);
                          } else {
                            alert(data.error || 'Failed to create survey');
                          }
                        } catch (e) {
                          alert('Error creating survey: ' + e.message);
                        } finally {
                          setGeneratingSurvey(false);
                        }
                      }}
                      disabled={generatingSurvey || surveyLinksGenerated}
                      style={{
                        ...styles.btn,
                        background: surveyLinksGenerated ? '#10b981' : '#8b5cf6',
                        color: 'white',
                        opacity: generatingSurvey ? 0.7 : 1,
                      }}
                    >
                      {generatingSurvey ? '⏳ Generating...' : surveyLinksGenerated ? '✓ Links Ready' : '🔗 ' + (ui.generateSurveyLinks || 'Generate Survey Links')}
                    </button>

                    {surveyLinksGenerated && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const text = surveyLinks.map(l => `${l.name} (${l.role}): ${l.url}`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Links copied to clipboard!');
                          }}
                          style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                        >
                          📋 {ui.copyAllLinks || 'Copy All Links'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/universal-industry-plan/interviews/send-invites', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ surveyId, sendMethod: 'email', lang }),
                              });
                              const data = await res.json();
                              if (data.ok) {
                                alert(`Emails sent to ${data.emailsSent} stakeholders!`);
                              } else {
                                alert(data.error || 'Some emails may not have been sent');
                              }
                            } catch (e) {
                              alert('Error sending emails: ' + e.message);
                            }
                          }}
                          style={{ ...styles.btn, background: '#059669', color: 'white' }}
                        >
                          ✉️ {ui.sendSurveyEmails || 'Send Survey Emails'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Survey Links Display */}
                {surveyLinksGenerated && surveyLinks.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <h4 style={{ color: '#065f46', marginBottom: '0.5rem' }}>
                      ✅ {ui.surveyLinksGenerated || 'Survey links generated!'}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                      {surveyLinks.map((link, idx) => (
                        <div key={idx} style={{ marginBottom: '0.5rem' }}>
                          <strong>{link.name}</strong> ({link.role}):{' '}
                          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>
                            {link.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================
              Document Upload Section [KT:DOCUMENTS]
              Upload supporting documents for AI context
              ================================================================ */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              📎 {ui.documentsSection || 'Supporting Documents'}
              <span style={styles.labelHint}>({ui.optional || 'optional'})</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {ui.documentsSubtitle || 'Upload documents for AI analysis and context'}
            </p>

            <div style={{ 
              border: '2px dashed #d1d5db', 
              borderRadius: 8, 
              padding: '2rem', 
              textAlign: 'center',
              background: '#f9fafb',
              marginBottom: '1rem'
            }}>
              <input
                type="file"
                id="document-upload"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  
                  setUploadingDocument(true);
                  
                  for (const file of files) {
                    // For now, store file info locally (in production, upload to storage)
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const docInfo = {
                        id: Date.now() + '_' + file.name,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        content: evt.target.result, // Base64 for text files
                        uploadedAt: new Date().toISOString(),
                      };
                      setUploadedDocuments(prev => [...prev, docInfo]);
                    };
                    
                    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
                      reader.readAsText(file);
                    } else {
                      reader.readAsDataURL(file);
                    }
                  }
                  
                  setUploadingDocument(false);
                  e.target.value = ''; // Reset input
                }}
              />
              <label htmlFor="document-upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
                <p style={{ color: '#374151', fontWeight: 600 }}>
                  {uploadingDocument ? (ui.analyzing || 'Analyzing...') : (ui.uploadDocuments || 'Upload Documents')}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                  {ui.supportedFormats || 'PDF, DOCX, XLSX, TXT, CSV (Max 10MB each)'}
                </p>
              </label>
            </div>

            {/* Uploaded Documents List */}
            {uploadedDocuments.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                  {ui.uploadedDocuments || 'Uploaded Documents'} ({uploadedDocuments.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {uploadedDocuments.map((doc, idx) => (
                    <div key={doc.id || idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'white', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {doc.name.endsWith('.pdf') ? '📕' : 
                           doc.name.endsWith('.docx') || doc.name.endsWith('.doc') ? '📘' :
                           doc.name.endsWith('.xlsx') || doc.name.endsWith('.xls') ? '📗' : '📄'}
                        </span>
                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{doc.name}</span>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                          ({(doc.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedDocuments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕ {ui.removeDocument || 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate Button - Premium CTA */}
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.02) 100%)',
            borderRadius: 20,
            marginTop: '2rem',
            border: '1px solid rgba(139, 92, 246, 0.15)',
          }}>
            <button
              type="submit"
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                ...(generating || !companyName || (!industry && !customIndustry) ? styles.btnDisabled : {}),
                fontSize: '1.25rem',
                padding: '1.35rem 3.5rem',
                letterSpacing: '-0.01em',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                boxShadow: '0 20px 50px -15px rgba(139, 92, 246, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.3)',
                transform: generating || !companyName || (!industry && !customIndustry) ? 'none' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              disabled={generating || !companyName || (!industry && !customIndustry)}
              onMouseEnter={(e) => {
                if (!generating && companyName && (industry || customIndustry)) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 25px 60px -15px rgba(139, 92, 246, 0.7), 0 0 0 1px rgba(139, 92, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 20px 50px -15px rgba(139, 92, 246, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.3)';
              }}
            >
              {generating ? '⏳ Generating 25,000+ Word Report...' : '🚀 Generate Transformation Report'}
            </button>
            
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '1rem' }}>
              {generating ? '' : 'Comprehensive AI analysis ready in ~2-3 minutes'}
            </p>

            {generating && (
              <div style={{ marginTop: '2rem', maxWidth: 500, margin: '2rem auto 0' }}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
                </div>
                <p style={styles.progressText}>{progressMessage} ({progress}%)</p>
              </div>
            )}
          </div>
        </form>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          input::placeholder, textarea::placeholder {
            color: #64748b;
          }
          select option {
            background: #1e293b;
            color: #f1f5f9;
          }
          input:focus, select:focus, textarea:focus {
            border-color: rgba(139, 92, 246, 0.6) !important;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 20px rgba(139, 92, 246, 0.1) !important;
          }
        `}</style>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Preview Step
  // ============================================================================
  if (workflowStep === 'preview') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🌐 Universal Industry Transformation</h1>
          <p style={styles.headerSubtitle}>Review Your Generated Report</p>
        </div>

        {renderWorkflowBar()}

        <div style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 16, overflow: 'hidden', marginBottom: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' }}>
          <div style={styles.previewHeader}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>📊 Report Preview - {companyName}</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{ ...styles.btn, ...styles.btnSecondary, fontSize: '0.9rem' }} onClick={() => setWorkflowStep('form')}>
                ← Back to Edit
              </button>
            </div>
          </div>
          <iframe srcDoc={generatedHtml} title="Report Preview" style={styles.previewFrame} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setWorkflowStep('form')}>
            ← Edit Report
          </button>
          <button 
            style={{ 
              ...styles.btn, 
              ...styles.btnSuccess, 
              fontSize: '1.1rem', 
              padding: '1rem 2.5rem', 
              ...(generating ? styles.btnDisabled : {}),
              boxShadow: '0 15px 40px -10px rgba(34, 197, 94, 0.5)',
            }} 
            onClick={handleSubmitForReview}
            disabled={generating}
          >
            {generating ? '⏳ Submitting...' : useEmailApproval ? '📧 Send for Approval →' : '✅ Submit for Approval →'}
          </button>
        </div>

        {useEmailApproval && (
          <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '1.25rem', fontSize: '0.9rem' }}>
            📧 Approval email will be sent to: <strong style={{ color: '#f1f5f9' }}>{approverEmail || '(not set)'}</strong>
          </p>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: Decision Step
  // ============================================================================
  if (workflowStep === 'decision') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🌐 Universal Industry Transformation</h1>
          <p style={styles.headerSubtitle}>Approve or Request Changes</p>
        </div>

        {renderWorkflowBar()}

        <div style={{ 
          ...styles.section, 
          textAlign: 'center', 
          padding: '3rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.03) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
        }}>
          <h2 style={{ fontSize: '1.6rem', color: '#f1f5f9', marginBottom: '1rem', fontWeight: 600 }}>
            {useEmailApproval ? '📧 Approval Email Sent!' : 'Report Ready for Approval'}
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
            {useEmailApproval 
              ? `An approval email has been sent to ${approverEmail}. They will click Approve/Reject in the email.`
              : 'Review complete. Choose to approve and export, or reject to make changes.'}
          </p>

          {useEmailApproval ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, fontSize: '1.1rem', padding: '1rem 2rem' }}
                onClick={() => setWorkflowStep('form')}
              >
                ← Create New Report
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, fontSize: '1.1rem', padding: '1rem 2rem' }}
                onClick={() => setWorkflowStep('final')}
              >
                📄 Preview/Export Anyway →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <button
                style={{ ...styles.btn, ...styles.btnDanger, fontSize: '1.1rem', padding: '1rem 2rem', ...(generating ? styles.btnDisabled : {}) }}
                onClick={() => handleDecision('reject')}
                disabled={generating}
              >
                ✕ Reject & Edit
              </button>
              <button
                style={{ 
                  ...styles.btn, 
                  ...styles.btnSuccess, 
                  fontSize: '1.1rem', 
                  padding: '1rem 2rem', 
                  ...(generating ? styles.btnDisabled : {}),
                  boxShadow: '0 15px 40px -10px rgba(34, 197, 94, 0.5)',
                }}
                onClick={() => handleDecision('approve')}
                disabled={generating}
              >
                ✓ Approve & Export
              </button>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 16, overflow: 'hidden', marginTop: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' }}>
          <iframe srcDoc={generatedHtml} title="Report Preview" style={styles.previewFrame} />
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Final Export Step
  // ============================================================================
  if (workflowStep === 'final') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🌐 Universal Industry Transformation</h1>
          <p style={styles.headerSubtitle}>Export Your Approved Report</p>
        </div>

        {renderWorkflowBar()}

        <div style={{ 
          ...styles.section, 
          textAlign: 'center', 
          padding: '3rem', 
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.08) 100%)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(0 4px 12px rgba(34, 197, 94, 0.4))' }}>✅</div>
          <h2 style={{ fontSize: '1.75rem', color: '#4ade80', marginBottom: '0.5rem', fontWeight: 600 }}>Report Approved!</h2>
          <p style={{ color: '#86efac', marginBottom: '2rem' }}>
            Your 25,000+ word transformation report is ready for export.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              style={{ 
                ...styles.btn, 
                ...styles.btnPrimary, 
                fontSize: '1.1rem', 
                padding: '1rem 2rem',
                boxShadow: '0 15px 40px -10px rgba(139, 92, 246, 0.5)',
              }} 
              onClick={handleExportHTML}
            >
              📥 Download HTML
            </button>
            <button 
              style={{ 
                ...styles.btn, 
                ...styles.btnSuccess, 
                fontSize: '1.1rem', 
                padding: '1rem 2rem',
                boxShadow: '0 15px 40px -10px rgba(34, 197, 94, 0.5)',
              }} 
              onClick={handleExportPDF}
            >
              🖨️ Print / Export PDF
            </button>
            <button style={{ ...styles.btn, ...styles.btnSecondary, fontSize: '1.1rem', padding: '1rem 2rem' }} onClick={() => { setWorkflowStep('form'); setGeneratedHtml(''); }}>
              📝 Create New Report
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 16, overflow: 'hidden', marginTop: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' }}>
          <div style={styles.previewHeader}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>📊 Final Report - {companyName}</h3>
          </div>
          <iframe srcDoc={generatedHtml} title="Final Report" style={styles.previewFrame} />
        </div>
      </div>
    );
  }

  return null;
}
