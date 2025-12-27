# Vertical Report Generation Tables - Airtable Schema Summary

## Overview

This document describes all Airtable tables created for the Sovereign Intelligence MVP report generation workflow, organized by vertical/industry.

**Base ID:** `app66DTFvdxGQKy4I`  
**Created:** December 25, 2025

---

## Verticals Summary

| Vertical | Table Name | Prefix | Key Fields |
|----------|------------|--------|------------|
| Government Reform | Reform Requests | RF | Reform Topic, Current Situation, Desired Outcome |
| Defense | Defense Plans | DEF | Classification, Mission Type, Threat Category |
| Pharma/Clinical | Clinical Plans | CP | Drug Name, Therapeutic Area, Development Phase |
| Finance | Finance Plans | FIN | Institution Type, Analysis Type, Regulatory Framework |
| Manufacturing | Manufacturing Plans | MFG | Industry Sector, OEE, Compliance Framework |
| Energy | Energy Plans | ENR | Utility Type, Energy Source, Grid Capacity |
| Insurance | Insurance Plans | INS | Insurance Type, Line of Business, Loss Ratio |
| Logistics | Logistics Plans | LOG | Business Type, Transport Mode, On-Time Delivery |

---

## Common Fields (All Tables)

All vertical tables share these core fields for consistent workflow:

### Identification
- `id` - Auto Number (Primary Key)
- `RequestId` - Unique identifier (Prefix + timestamp)
- `ClientEmail` - Requester email
- `ClientName` - Requester name
- `Organization` - Company/agency name
- `Country` - Link to Countries lookup

### Report Content
- `Report HTML` - Generated HTML content
- `Report JSON` - Regeneration data
- `AI Summary` - Executive summary
- `Recommendations` - AI recommendations
- `Risk Assessment` - Risk analysis JSON

### Workflow
- `Status` - Draft/Review/Approved/Active/Completed
- `Approval State` - Not Submitted/Pending/Approved/Rejected
- `Priority` - Critical/High/Medium/Low
- `Language` - Link to Languages lookup
- `Version` - Report version number

### Approval Timestamps
- `Generated At` - Report generation time
- `Submitted At` - Approval submission time
- `Approved At` - Approval timestamp
- `Rejected At` - Rejection timestamp
- `Finalized At` - Final approval time
- `Exported At` - Last export time
- `Downloaded At` - Last download time
- `Changes Requested At` - Changes request time

### Approval Metadata
- `Approval Requested By` - Requester email
- `Approval Requested At` - Request timestamp
- `Approved By` - Approver email
- `Rejected By` - Rejector email
- `Approver Name` - Approver display name
- `Preparer Name` - Preparer display name
- `Approval Notes` - Request notes
- `Decision Notes` - Decision justification

### Storage
- `S3 URL` - PDF storage URL
- `Attachments` - Supporting documents
- `Created At` - Record creation
- `Last Modified` - Last update
- `Created By` - Creator email

---

## Vertical-Specific Fields

### 1. Reform Requests (Government)
- Reform Topic
- Current Situation
- Desired Outcome
- Key Challenges
- Stakeholders
- Implementation Plan
- Budget Range ($100K to $5M+)
- Tags (Urgent, Strategic, Compliance, etc.)

### 2. Defense Plans (Military)
- Classification (UNCLASSIFIED to TOP SECRET)
- Program Name
- Mission Type (Combat, Intelligence, Cyber, Space)
- Branch (Army, Navy, Air Force, etc.)
- Threat Category (Near-Peer, Asymmetric, Hybrid)
- Mission Objective
- Threat Assessment
- Force Structure
- Handling Caveats (NOFORN, REL TO, etc.)

### 3. Clinical Plans (Pharma)
- Drug Name
- Molecule Type (Small Molecule, Biologic, mRNA)
- Therapeutic Area (Oncology, CNS, Immunology)
- Development Phase (Discovery to Post-Market)
- Indication
- Target Regulatory Agency (FDA, EMA, PMDA)
- Efficacy Data
- Safety Profile
- Primary/Secondary Endpoints
- IND/NDA Number
- Protocol Number

### 4. Finance Plans (Banking)
- Institution Type (Commercial Bank, Hedge Fund, Fintech)
- Regulatory Framework (Basel III, DORA, AML/BSA)
- Analysis Type (Risk Assessment, AML, Fraud)
- AUM/Assets
- Portfolio Overview
- VaR Analysis
- Stress Test Results
- AML Findings
- Regulatory Gaps

### 5. Manufacturing Plans (Industry 4.0)
- Industry Sector (Automotive, Aerospace, Electronics)
- Facility Type (Assembly, Process, Continuous)
- Compliance Framework (ISO 9001, IATF 16949, GMP)
- Current/Target OEE
- Production Volume
- Downtime Hours
- Quality Defect Rate
- Maintenance Schedule
- Energy Optimization

### 6. Energy Plans (Utilities)
- Utility Type (Electric, Gas, Multi-Utility)
- Energy Source (Solar, Wind, Nuclear, etc.)
- Regulatory Framework (NERC CIP, FERC, ISO 50001)
- Grid Capacity (MW)
- Peak Demand
- Renewable Percentage
- Grid Analysis
- Outage Prediction
- Cybersecurity Assessment

### 7. Insurance Plans (Claims)
- Insurance Type (P&C, Life, Health, Reinsurance)
- Line of Business (Auto, Home, Cyber, etc.)
- Analysis Type (Claims, Underwriting, Fraud)
- Premium Volume
- Loss Ratio
- Combined Ratio
- Claims Analysis
- Fraud Indicators
- Cat Model Results
- Policy/Claim Number

### 8. Logistics Plans (Supply Chain)
- Business Type (3PL, Carrier, Warehouse)
- Transport Mode (Truckload, Ocean, Air)
- Compliance Framework (C-TPAT, ISO 28000)
- Shipment Volume
- On-Time Delivery Rate
- Freight Spend
- Route Analysis
- Demand Forecast
- Carrier Scorecard

---

## Environment Variables Added

```env
# Pharma/Clinical
AIRTABLE_CLINICAL_TABLE_NAME=Clinical Plans
AIRTABLE_CLINICAL_HTML_FIELD=Report HTML
AIRTABLE_CLINICAL_PREFIX=CP

# Defense
AIRTABLE_DEFENSE_TABLE_NAME=Defense Plans
AIRTABLE_DEFENSE_HTML_FIELD=Report HTML
AIRTABLE_DEFENSE_PREFIX=DEF

# Finance
AIRTABLE_FINANCE_TABLE_NAME=Finance Plans
AIRTABLE_FINANCE_HTML_FIELD=Report HTML
AIRTABLE_FINANCE_PREFIX=FIN

# Manufacturing
AIRTABLE_MANUFACTURING_TABLE_NAME=Manufacturing Plans
AIRTABLE_MANUFACTURING_HTML_FIELD=Report HTML
AIRTABLE_MANUFACTURING_PREFIX=MFG

# Energy
AIRTABLE_ENERGY_TABLE_NAME=Energy Plans
AIRTABLE_ENERGY_HTML_FIELD=Report HTML
AIRTABLE_ENERGY_PREFIX=ENR

# Insurance
AIRTABLE_INSURANCE_TABLE_NAME=Insurance Plans
AIRTABLE_INSURANCE_HTML_FIELD=Report HTML
AIRTABLE_INSURANCE_PREFIX=INS

# Logistics
AIRTABLE_LOGISTICS_TABLE_NAME=Logistics Plans
AIRTABLE_LOGISTICS_HTML_FIELD=Report HTML
AIRTABLE_LOGISTICS_PREFIX=LOG
```

---

## Airtable Setup Instructions

1. **Create Tables:** Import each CSV file from `airtable-schemas/verticals/`
2. **Link Countries:** Create "Countries" lookup table and link all tables
3. **Link Languages:** Create "Languages" lookup table and link all tables
4. **Configure Views:** Create Kanban views for approval workflow
5. **Set Permissions:** Configure field-level permissions for sensitive data
6. **Add Automations:** Set up email notifications for status changes

---

## File Locations

CSV Schema files:
- `airtable-schemas/verticals/Reform_Requests.csv`
- `airtable-schemas/verticals/Defense_Plans.csv`
- `airtable-schemas/verticals/Clinical_Plans.csv`
- `airtable-schemas/verticals/Finance_Plans.csv`
- `airtable-schemas/verticals/Manufacturing_Plans.csv`
- `airtable-schemas/verticals/Energy_Plans.csv`
- `airtable-schemas/verticals/Insurance_Plans.csv`
- `airtable-schemas/verticals/Logistics_Plans.csv`

Backup:
- `BACKUP-20251225_131259_.env.local`

---

*Generated by Sovereign Intelligence - December 25, 2025*
