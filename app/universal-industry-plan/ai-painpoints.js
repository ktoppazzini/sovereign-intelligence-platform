// app/universal-industry-plan/ai-painpoints.js
// [DEPRECATED] This file is kept for backward compatibility
// The actual AI pain points endpoint is at /api/universal-industry-plan/ai-painpoints/route.js
// This stub redirects to the new API route

export async function POST(req) {
  const body = await req.json();
  
  // Redirect to the new API endpoint
  const apiUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/universal-industry-plan/ai-painpoints`;
  
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    // Fallback to basic response
    return Response.json({
      ok: false,
      error: 'API redirect failed',
      painPoints: [
        { name: 'Operational Efficiency', description: 'Manual processes causing delays', financialImpact: '5-15%', stakeholders: ['Operations'] },
        { name: 'Technology Gaps', description: 'Outdated systems', financialImpact: '10-20%', stakeholders: ['IT'] },
        { name: 'Talent Retention', description: 'High turnover', financialImpact: '50-200% per hire', stakeholders: ['HR'] },
        { name: 'Customer Experience', description: 'Inconsistent service', financialImpact: '25% churn risk', stakeholders: ['Sales'] },
        { name: 'Compliance', description: 'Regulatory requirements', financialImpact: '2-5%', stakeholders: ['Legal'] },
      ],
    });
  }
}
