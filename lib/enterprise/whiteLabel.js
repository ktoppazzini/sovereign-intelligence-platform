// lib/enterprise/whiteLabel.js
// [KT:WHITE-LABEL-v1.0] White-Label & Reseller System
// Revenue multiplier through channel partners
// Enables: OEM licensing, reseller networks, embedded solutions

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:WHITE-LABEL]';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Partner Types
// ============================================================================
export const PARTNER_TYPES = {
  RESELLER: {
    name: 'Reseller',
    description: 'Sells Sovereign-branded solutions',
    revenueShare: 20, // Partner gets 20%
    minCommitment: 10000, // $10K/year minimum
    features: ['sales', 'support_l1', 'branding_minimal'],
  },
  VALUE_ADDED_RESELLER: {
    name: 'Value-Added Reseller (VAR)',
    description: 'Sells customized solutions with added services',
    revenueShare: 30,
    minCommitment: 50000,
    features: ['sales', 'support_l1', 'support_l2', 'customization', 'training'],
  },
  WHITE_LABEL: {
    name: 'White-Label Partner',
    description: 'Full rebrand with own branding',
    revenueShare: 40,
    minCommitment: 100000,
    features: ['full_rebrand', 'custom_domain', 'api_access', 'priority_support'],
  },
  OEM: {
    name: 'OEM Partner',
    description: 'Embeds Sovereign in their product',
    revenueShare: 50,
    minCommitment: 250000,
    features: ['embedded_sdk', 'api_unlimited', 'source_access', 'dedicated_support'],
  },
  STRATEGIC: {
    name: 'Strategic Partner',
    description: 'Deep integration with co-development',
    revenueShare: 'custom',
    minCommitment: 500000,
    features: ['everything', 'co_development', 'board_seat', 'exclusivity_options'],
  },
};

// ============================================================================
// Partner Registration
// ============================================================================

/**
 * Register a new partner
 */
export async function registerPartner({
  companyName,
  contactName,
  contactEmail,
  partnerType,
  territory,
  website,
  estimatedAnnualRevenue,
  applicationNotes,
}) {
  const partnerId = `partner_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    await base('Partners').create({
      'Partner ID': partnerId,
      'Company Name': companyName,
      'Contact Name': contactName,
      'Contact Email': contactEmail,
      'Partner Type': partnerType,
      'Territory': territory || 'Global',
      'Website': website || '',
      'Estimated Annual Revenue': estimatedAnnualRevenue || 0,
      'Application Notes': applicationNotes || '',
      'Status': 'pending',
      'Applied At': new Date().toISOString(),
    });
    
    return {
      partnerId,
      status: 'pending',
      message: 'Application submitted for review',
    };
  } catch (error) {
    console.error(TAG, 'registerPartner.error', error);
    throw error;
  }
}

/**
 * Approve partner application
 */
export async function approvePartner(partnerId, approvedBy, terms = {}) {
  try {
    const records = await base('Partners')
      .select({ filterByFormula: `{Partner ID} = "${partnerId}"`, maxRecords: 1 })
      .firstPage();
    
    if (records.length === 0) throw new Error('Partner not found');
    
    const partnerType = PARTNER_TYPES[records[0].fields['Partner Type']];
    
    await base('Partners').update(records[0].id, {
      'Status': 'active',
      'Approved By': approvedBy,
      'Approved At': new Date().toISOString(),
      'Revenue Share': terms.revenueShare || partnerType?.revenueShare || 20,
      'Contract Start': terms.contractStart || new Date().toISOString(),
      'Contract End': terms.contractEnd || '',
    });
    
    return { partnerId, status: 'active' };
  } catch (error) {
    console.error(TAG, 'approvePartner.error', error);
    throw error;
  }
}

/**
 * Get partner details
 */
export async function getPartner(partnerId) {
  try {
    const records = await base('Partners')
      .select({ filterByFormula: `{Partner ID} = "${partnerId}"`, maxRecords: 1 })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const r = records[0];
    return {
      partnerId: r.fields['Partner ID'],
      recordId: r.id,
      companyName: r.fields['Company Name'],
      contactName: r.fields['Contact Name'],
      contactEmail: r.fields['Contact Email'],
      partnerType: r.fields['Partner Type'],
      territory: r.fields['Territory'],
      status: r.fields['Status'],
      revenueShare: r.fields['Revenue Share'],
      totalRevenue: r.fields['Total Revenue'] || 0,
      totalCustomers: r.fields['Total Customers'] || 0,
    };
  } catch (error) {
    console.error(TAG, 'getPartner.error', error);
    throw error;
  }
}

// ============================================================================
// White-Label Configuration
// ============================================================================

/**
 * Configure white-label branding
 */
export async function configureWhiteLabel(partnerId, config) {
  const {
    brandName,
    logo,
    favicon,
    primaryColor,
    secondaryColor,
    customDomain,
    supportEmail,
    termsUrl,
    privacyUrl,
    customCss,
  } = config;
  
  try {
    const partner = await getPartner(partnerId);
    if (!partner) throw new Error('Partner not found');
    
    await base('White Label Configs').create({
      'Partner ID': partnerId,
      'Brand Name': brandName,
      'Logo URL': logo || '',
      'Favicon URL': favicon || '',
      'Primary Color': primaryColor || '#3b82f6',
      'Secondary Color': secondaryColor || '#8b5cf6',
      'Custom Domain': customDomain || '',
      'Support Email': supportEmail || '',
      'Terms URL': termsUrl || '',
      'Privacy URL': privacyUrl || '',
      'Custom CSS': customCss || '',
      'Created At': new Date().toISOString(),
    });
    
    return {
      partnerId,
      brandName,
      customDomain,
      status: 'configured',
    };
  } catch (error) {
    console.error(TAG, 'configureWhiteLabel.error', error);
    throw error;
  }
}

/**
 * Get white-label config by domain
 */
export async function getWhiteLabelByDomain(domain) {
  try {
    const records = await base('White Label Configs')
      .select({ filterByFormula: `{Custom Domain} = "${domain}"`, maxRecords: 1 })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const r = records[0];
    return {
      partnerId: r.fields['Partner ID'],
      brandName: r.fields['Brand Name'],
      logo: r.fields['Logo URL'],
      favicon: r.fields['Favicon URL'],
      primaryColor: r.fields['Primary Color'],
      secondaryColor: r.fields['Secondary Color'],
      supportEmail: r.fields['Support Email'],
      customCss: r.fields['Custom CSS'],
    };
  } catch (error) {
    console.error(TAG, 'getWhiteLabelByDomain.error', error);
    return null;
  }
}

// ============================================================================
// Partner Revenue & Commissions
// ============================================================================

/**
 * Record partner sale
 */
export async function recordPartnerSale({
  partnerId,
  customerId,
  customerName,
  planTier,
  amount,
  currency = 'USD',
  isRecurring = true,
}) {
  try {
    const partner = await getPartner(partnerId);
    if (!partner) throw new Error('Partner not found');
    
    const commission = Math.round(amount * (partner.revenueShare / 100) * 100) / 100;
    const saleId = `sale_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    await base('Partner Sales').create({
      'Sale ID': saleId,
      'Partner ID': partnerId,
      'Customer ID': customerId,
      'Customer Name': customerName,
      'Plan Tier': planTier,
      'Amount': amount,
      'Currency': currency,
      'Commission': commission,
      'Is Recurring': isRecurring,
      'Status': 'pending',
      'Sale Date': new Date().toISOString(),
    });
    
    // Update partner totals
    await base('Partners').update(partner.recordId, {
      'Total Revenue': (partner.totalRevenue || 0) + amount,
      'Total Customers': (partner.totalCustomers || 0) + 1,
    });
    
    return {
      saleId,
      amount,
      commission,
      status: 'recorded',
    };
  } catch (error) {
    console.error(TAG, 'recordPartnerSale.error', error);
    throw error;
  }
}

/**
 * Get partner earnings
 */
export async function getPartnerEarnings(partnerId, period = 'all') {
  try {
    let formula = `{Partner ID} = "${partnerId}"`;
    
    if (period !== 'all') {
      const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      formula = `AND(${formula}, {Sale Date} >= "${since}")`;
    }
    
    const records = await base('Partner Sales')
      .select({ filterByFormula: formula })
      .all();
    
    const earnings = {
      totalSales: 0,
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0,
      salesCount: records.length,
      byMonth: {},
    };
    
    records.forEach(r => {
      const amount = r.fields['Amount'] || 0;
      const commission = r.fields['Commission'] || 0;
      const status = r.fields['Status'];
      const month = r.fields['Sale Date']?.substring(0, 7);
      
      earnings.totalSales += amount;
      earnings.totalCommission += commission;
      
      if (status === 'pending') earnings.pendingCommission += commission;
      if (status === 'paid') earnings.paidCommission += commission;
      
      if (month) {
        if (!earnings.byMonth[month]) {
          earnings.byMonth[month] = { sales: 0, commission: 0 };
        }
        earnings.byMonth[month].sales += amount;
        earnings.byMonth[month].commission += commission;
      }
    });
    
    return earnings;
  } catch (error) {
    console.error(TAG, 'getPartnerEarnings.error', error);
    throw error;
  }
}

/**
 * Process commission payout
 */
export async function processCommissionPayout(partnerId, amount, paymentMethod) {
  const payoutId = `payout_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  try {
    await base('Partner Payouts').create({
      'Payout ID': payoutId,
      'Partner ID': partnerId,
      'Amount': amount,
      'Payment Method': paymentMethod,
      'Status': 'processing',
      'Initiated At': new Date().toISOString(),
    });
    
    return {
      payoutId,
      amount,
      status: 'processing',
      estimatedArrival: '3-5 business days',
    };
  } catch (error) {
    console.error(TAG, 'processCommissionPayout.error', error);
    throw error;
  }
}

// ============================================================================
// Partner Portal Data
// ============================================================================

/**
 * Get partner dashboard data
 */
export async function getPartnerDashboard(partnerId) {
  const partner = await getPartner(partnerId);
  if (!partner) throw new Error('Partner not found');
  
  const earnings = await getPartnerEarnings(partnerId);
  const monthlyEarnings = await getPartnerEarnings(partnerId, 'month');
  
  return {
    partner: {
      companyName: partner.companyName,
      partnerType: partner.partnerType,
      status: partner.status,
      revenueShare: partner.revenueShare,
    },
    stats: {
      totalCustomers: partner.totalCustomers,
      totalRevenue: earnings.totalSales,
      totalCommission: earnings.totalCommission,
      pendingPayout: earnings.pendingCommission,
    },
    thisMonth: {
      sales: monthlyEarnings.totalSales,
      commission: monthlyEarnings.totalCommission,
      newCustomers: monthlyEarnings.salesCount,
    },
    revenueByMonth: earnings.byMonth,
  };
}

export default {
  PARTNER_TYPES,
  registerPartner,
  approvePartner,
  getPartner,
  configureWhiteLabel,
  getWhiteLabelByDomain,
  recordPartnerSale,
  getPartnerEarnings,
  processCommissionPayout,
  getPartnerDashboard,
};
