/**
 * Role Hierarchy System for Sovereign Intelligence
 * Defines roles at every organizational level with permissions and survey contexts
 */

// Universal role levels (apply across all verticals)
export const ROLE_LEVELS = {
  EXECUTIVE: 'executive',      // C-Suite, Board
  SENIOR_LEADERSHIP: 'senior', // VPs, Directors
  MANAGEMENT: 'management',    // Managers, Team Leads
  SPECIALIST: 'specialist',    // Senior ICs, Subject Matter Experts
  OPERATIONAL: 'operational',  // Analysts, Operators
  FRONTLINE: 'frontline',      // Entry level, Field workers
};

// Role definitions per vertical
export const VERTICAL_ROLES = {
  // Government Reform
  'universal-reform': {
    name: 'Government Reform',
    roles: [
      { id: 'secretary', level: ROLE_LEVELS.EXECUTIVE, title: 'Cabinet Secretary', permissions: ['full_access', 'approve', 'finalize', 'budget'], surveyFocus: 'strategic_priorities' },
      { id: 'deputy_secretary', level: ROLE_LEVELS.EXECUTIVE, title: 'Deputy Secretary', permissions: ['full_access', 'approve', 'budget'], surveyFocus: 'policy_implementation' },
      { id: 'assistant_secretary', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Assistant Secretary', permissions: ['department_access', 'approve'], surveyFocus: 'department_operations' },
      { id: 'director', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Office Director', permissions: ['office_access', 'submit'], surveyFocus: 'program_effectiveness' },
      { id: 'division_chief', level: ROLE_LEVELS.MANAGEMENT, title: 'Division Chief', permissions: ['division_access', 'submit'], surveyFocus: 'team_performance' },
      { id: 'branch_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Branch Manager', permissions: ['branch_access', 'draft'], surveyFocus: 'process_improvement' },
      { id: 'program_analyst', level: ROLE_LEVELS.SPECIALIST, title: 'Program Analyst', permissions: ['read', 'draft', 'comment'], surveyFocus: 'data_quality' },
      { id: 'policy_analyst', level: ROLE_LEVELS.SPECIALIST, title: 'Policy Analyst', permissions: ['read', 'draft', 'comment'], surveyFocus: 'regulatory_compliance' },
      { id: 'budget_analyst', level: ROLE_LEVELS.OPERATIONAL, title: 'Budget Analyst', permissions: ['read', 'draft'], surveyFocus: 'fiscal_efficiency' },
      { id: 'admin_specialist', level: ROLE_LEVELS.FRONTLINE, title: 'Administrative Specialist', permissions: ['read'], surveyFocus: 'workflow_bottlenecks' },
    ],
  },
  
  // Defense Intelligence
  'defense': {
    name: 'Defense Intelligence',
    roles: [
      { id: 'commanding_general', level: ROLE_LEVELS.EXECUTIVE, title: 'Commanding General', permissions: ['full_access', 'approve', 'finalize', 'classified'], surveyFocus: 'strategic_readiness' },
      { id: 'deputy_commander', level: ROLE_LEVELS.EXECUTIVE, title: 'Deputy Commander', permissions: ['full_access', 'approve', 'classified'], surveyFocus: 'operational_capability' },
      { id: 'chief_of_staff', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Chief of Staff', permissions: ['staff_access', 'approve'], surveyFocus: 'resource_allocation' },
      { id: 'division_commander', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Division Commander', permissions: ['division_access', 'submit'], surveyFocus: 'unit_readiness' },
      { id: 'battalion_commander', level: ROLE_LEVELS.MANAGEMENT, title: 'Battalion Commander', permissions: ['battalion_access', 'submit'], surveyFocus: 'training_effectiveness' },
      { id: 'company_commander', level: ROLE_LEVELS.MANAGEMENT, title: 'Company Commander', permissions: ['company_access', 'draft'], surveyFocus: 'personnel_morale' },
      { id: 'intel_officer', level: ROLE_LEVELS.SPECIALIST, title: 'Intelligence Officer', permissions: ['intel_access', 'draft', 'comment'], surveyFocus: 'threat_assessment' },
      { id: 'logistics_officer', level: ROLE_LEVELS.SPECIALIST, title: 'Logistics Officer', permissions: ['logistics_access', 'draft'], surveyFocus: 'supply_chain' },
      { id: 'nco', level: ROLE_LEVELS.OPERATIONAL, title: 'Senior NCO', permissions: ['read', 'draft'], surveyFocus: 'ground_operations' },
      { id: 'specialist', level: ROLE_LEVELS.FRONTLINE, title: 'Specialist', permissions: ['read'], surveyFocus: 'equipment_readiness' },
    ],
  },
  
  // Pharmaceutical
  'pharma': {
    name: 'Pharmaceutical',
    roles: [
      { id: 'ceo', level: ROLE_LEVELS.EXECUTIVE, title: 'CEO', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'market_strategy' },
      { id: 'cso', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Scientific Officer', permissions: ['full_access', 'approve'], surveyFocus: 'pipeline_health' },
      { id: 'cmo', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Medical Officer', permissions: ['medical_access', 'approve'], surveyFocus: 'clinical_outcomes' },
      { id: 'vp_rd', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Research & Development', permissions: ['rd_access', 'submit'], surveyFocus: 'innovation_pipeline' },
      { id: 'vp_regulatory', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Regulatory Affairs', permissions: ['regulatory_access', 'submit'], surveyFocus: 'compliance_status' },
      { id: 'clinical_director', level: ROLE_LEVELS.MANAGEMENT, title: 'Clinical Trial Director', permissions: ['clinical_access', 'draft'], surveyFocus: 'trial_progress' },
      { id: 'lab_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Laboratory Manager', permissions: ['lab_access', 'draft'], surveyFocus: 'research_quality' },
      { id: 'medical_scientist', level: ROLE_LEVELS.SPECIALIST, title: 'Medical Scientist', permissions: ['read', 'draft', 'comment'], surveyFocus: 'study_design' },
      { id: 'regulatory_specialist', level: ROLE_LEVELS.SPECIALIST, title: 'Regulatory Specialist', permissions: ['read', 'draft'], surveyFocus: 'submission_readiness' },
      { id: 'lab_technician', level: ROLE_LEVELS.FRONTLINE, title: 'Lab Technician', permissions: ['read'], surveyFocus: 'equipment_calibration' },
    ],
  },
  
  // Finance
  'finance': {
    name: 'Finance',
    roles: [
      { id: 'cfo', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Financial Officer', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'financial_strategy' },
      { id: 'cro', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Risk Officer', permissions: ['full_access', 'approve'], surveyFocus: 'risk_appetite' },
      { id: 'treasurer', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Treasurer', permissions: ['treasury_access', 'submit'], surveyFocus: 'liquidity_management' },
      { id: 'controller', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Controller', permissions: ['accounting_access', 'submit'], surveyFocus: 'reporting_accuracy' },
      { id: 'audit_director', level: ROLE_LEVELS.MANAGEMENT, title: 'Audit Director', permissions: ['audit_access', 'draft'], surveyFocus: 'control_effectiveness' },
      { id: 'fp_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'FP&A Manager', permissions: ['planning_access', 'draft'], surveyFocus: 'forecast_accuracy' },
      { id: 'risk_analyst', level: ROLE_LEVELS.SPECIALIST, title: 'Risk Analyst', permissions: ['read', 'draft', 'comment'], surveyFocus: 'model_validation' },
      { id: 'compliance_officer', level: ROLE_LEVELS.SPECIALIST, title: 'Compliance Officer', permissions: ['read', 'draft'], surveyFocus: 'regulatory_changes' },
      { id: 'accountant', level: ROLE_LEVELS.OPERATIONAL, title: 'Senior Accountant', permissions: ['read', 'draft'], surveyFocus: 'reconciliation_issues' },
      { id: 'analyst', level: ROLE_LEVELS.FRONTLINE, title: 'Financial Analyst', permissions: ['read'], surveyFocus: 'data_quality' },
    ],
  },
  
  // Manufacturing
  'manufacturing': {
    name: 'Manufacturing',
    roles: [
      { id: 'coo', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Operations Officer', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'operational_excellence' },
      { id: 'plant_vp', level: ROLE_LEVELS.EXECUTIVE, title: 'VP Manufacturing', permissions: ['full_access', 'approve'], surveyFocus: 'capacity_planning' },
      { id: 'plant_manager', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Plant Manager', permissions: ['plant_access', 'submit'], surveyFocus: 'facility_performance' },
      { id: 'ops_director', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Operations Director', permissions: ['ops_access', 'submit'], surveyFocus: 'production_targets' },
      { id: 'production_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Production Manager', permissions: ['production_access', 'draft'], surveyFocus: 'line_efficiency' },
      { id: 'quality_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Quality Manager', permissions: ['quality_access', 'draft'], surveyFocus: 'defect_trends' },
      { id: 'maintenance_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Maintenance Manager', permissions: ['maintenance_access', 'draft'], surveyFocus: 'equipment_reliability' },
      { id: 'process_engineer', level: ROLE_LEVELS.SPECIALIST, title: 'Process Engineer', permissions: ['read', 'draft', 'comment'], surveyFocus: 'optimization_opportunities' },
      { id: 'shift_supervisor', level: ROLE_LEVELS.OPERATIONAL, title: 'Shift Supervisor', permissions: ['read', 'draft'], surveyFocus: 'shift_challenges' },
      { id: 'operator', level: ROLE_LEVELS.FRONTLINE, title: 'Machine Operator', permissions: ['read'], surveyFocus: 'equipment_issues' },
    ],
  },
  
  // Energy
  'energy': {
    name: 'Energy & Utilities',
    roles: [
      { id: 'ceo', level: ROLE_LEVELS.EXECUTIVE, title: 'CEO', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'energy_transition' },
      { id: 'cto', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Technology Officer', permissions: ['full_access', 'approve'], surveyFocus: 'grid_modernization' },
      { id: 'vp_operations', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Operations', permissions: ['ops_access', 'submit'], surveyFocus: 'reliability_targets' },
      { id: 'grid_director', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'Grid Operations Director', permissions: ['grid_access', 'submit'], surveyFocus: 'demand_management' },
      { id: 'generation_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Generation Manager', permissions: ['generation_access', 'draft'], surveyFocus: 'plant_availability' },
      { id: 'transmission_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Transmission Manager', permissions: ['transmission_access', 'draft'], surveyFocus: 'line_capacity' },
      { id: 'renewable_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Renewable Energy Manager', permissions: ['renewable_access', 'draft'], surveyFocus: 'clean_energy_goals' },
      { id: 'grid_engineer', level: ROLE_LEVELS.SPECIALIST, title: 'Grid Engineer', permissions: ['read', 'draft', 'comment'], surveyFocus: 'stability_concerns' },
      { id: 'control_operator', level: ROLE_LEVELS.OPERATIONAL, title: 'Control Room Operator', permissions: ['read', 'draft'], surveyFocus: 'real_time_issues' },
      { id: 'field_tech', level: ROLE_LEVELS.FRONTLINE, title: 'Field Technician', permissions: ['read'], surveyFocus: 'equipment_condition' },
    ],
  },
  
  // Insurance
  'insurance': {
    name: 'Insurance',
    roles: [
      { id: 'ceo', level: ROLE_LEVELS.EXECUTIVE, title: 'CEO', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'market_position' },
      { id: 'cro', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Risk Officer', permissions: ['full_access', 'approve'], surveyFocus: 'risk_appetite' },
      { id: 'chief_actuary', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Actuary', permissions: ['actuarial_access', 'approve'], surveyFocus: 'reserve_adequacy' },
      { id: 'vp_underwriting', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Underwriting', permissions: ['underwriting_access', 'submit'], surveyFocus: 'pricing_accuracy' },
      { id: 'vp_claims', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Claims', permissions: ['claims_access', 'submit'], surveyFocus: 'claims_efficiency' },
      { id: 'underwriting_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Underwriting Manager', permissions: ['team_access', 'draft'], surveyFocus: 'risk_selection' },
      { id: 'claims_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Claims Manager', permissions: ['team_access', 'draft'], surveyFocus: 'settlement_patterns' },
      { id: 'actuary', level: ROLE_LEVELS.SPECIALIST, title: 'Actuary', permissions: ['read', 'draft', 'comment'], surveyFocus: 'model_performance' },
      { id: 'underwriter', level: ROLE_LEVELS.OPERATIONAL, title: 'Senior Underwriter', permissions: ['read', 'draft'], surveyFocus: 'application_quality' },
      { id: 'claims_adjuster', level: ROLE_LEVELS.FRONTLINE, title: 'Claims Adjuster', permissions: ['read'], surveyFocus: 'fraud_indicators' },
    ],
  },
  
  // Logistics
  'logistics': {
    name: 'Logistics & Supply Chain',
    roles: [
      { id: 'coo', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Operations Officer', permissions: ['full_access', 'approve', 'finalize'], surveyFocus: 'network_strategy' },
      { id: 'csco', level: ROLE_LEVELS.EXECUTIVE, title: 'Chief Supply Chain Officer', permissions: ['full_access', 'approve'], surveyFocus: 'supplier_resilience' },
      { id: 'vp_logistics', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Logistics', permissions: ['logistics_access', 'submit'], surveyFocus: 'cost_optimization' },
      { id: 'vp_warehousing', level: ROLE_LEVELS.SENIOR_LEADERSHIP, title: 'VP Warehousing', permissions: ['warehouse_access', 'submit'], surveyFocus: 'capacity_utilization' },
      { id: 'fleet_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Fleet Manager', permissions: ['fleet_access', 'draft'], surveyFocus: 'vehicle_efficiency' },
      { id: 'warehouse_manager', level: ROLE_LEVELS.MANAGEMENT, title: 'Warehouse Manager', permissions: ['site_access', 'draft'], surveyFocus: 'inventory_accuracy' },
      { id: 'route_planner', level: ROLE_LEVELS.SPECIALIST, title: 'Route Planning Specialist', permissions: ['read', 'draft', 'comment'], surveyFocus: 'delivery_optimization' },
      { id: 'procurement_specialist', level: ROLE_LEVELS.SPECIALIST, title: 'Procurement Specialist', permissions: ['read', 'draft'], surveyFocus: 'vendor_performance' },
      { id: 'dispatcher', level: ROLE_LEVELS.OPERATIONAL, title: 'Dispatcher', permissions: ['read', 'draft'], surveyFocus: 'real_time_issues' },
      { id: 'driver', level: ROLE_LEVELS.FRONTLINE, title: 'Driver', permissions: ['read'], surveyFocus: 'route_challenges' },
    ],
  },
};

// Get roles for a specific vertical
export function getVerticalRoles(verticalId) {
  // Handle aliases
  const aliases = { 'reform': 'universal-reform' };
  const resolvedId = aliases[verticalId] || verticalId;
  return VERTICAL_ROLES[resolvedId] || VERTICAL_ROLES['universal-reform'];
}

// Get role by ID
export function getRoleById(verticalId, roleId) {
  const vertical = getVerticalRoles(verticalId);
  return vertical.roles.find(r => r.id === roleId);
}

// Get roles by level
export function getRolesByLevel(verticalId, level) {
  const vertical = getVerticalRoles(verticalId);
  return vertical.roles.filter(r => r.level === level);
}

// Check if role has permission
export function hasPermission(verticalId, roleId, permission) {
  const role = getRoleById(verticalId, roleId);
  if (!role) return false;
  return role.permissions.includes(permission) || role.permissions.includes('full_access');
}

// Get roles that can approve
export function getApproverRoles(verticalId) {
  const vertical = getVerticalRoles(verticalId);
  return vertical.roles.filter(r => r.permissions.includes('approve') || r.permissions.includes('full_access'));
}

// Get report visibility for role
export function getReportSections(verticalId, roleId) {
  const role = getRoleById(verticalId, roleId);
  if (!role) return { full: false, sections: [] };
  
  const level = role.level;
  
  // Executive sees everything
  if (level === ROLE_LEVELS.EXECUTIVE) {
    return { full: true, sections: ['executive_summary', 'strategic_analysis', 'financial_impact', 'risk_assessment', 'detailed_metrics', 'recommendations', 'appendix'] };
  }
  
  // Senior leadership sees most
  if (level === ROLE_LEVELS.SENIOR_LEADERSHIP) {
    return { full: false, sections: ['executive_summary', 'strategic_analysis', 'detailed_metrics', 'recommendations'] };
  }
  
  // Management sees operational details
  if (level === ROLE_LEVELS.MANAGEMENT) {
    return { full: false, sections: ['executive_summary', 'detailed_metrics', 'team_performance', 'recommendations'] };
  }
  
  // Specialists see their domain
  if (level === ROLE_LEVELS.SPECIALIST) {
    return { full: false, sections: ['detailed_metrics', 'technical_analysis', 'recommendations'] };
  }
  
  // Operational and Frontline see relevant summaries
  return { full: false, sections: ['summary', 'action_items'] };
}

export default {
  ROLE_LEVELS,
  VERTICAL_ROLES,
  getVerticalRoles,
  getRoleById,
  getRolesByLevel,
  hasPermission,
  getApproverRoles,
  getReportSections,
};
