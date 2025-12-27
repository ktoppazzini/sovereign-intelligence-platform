# Airtable Schema Documentation

## Overview

These CSV files define the Airtable tables required for the Sovereign Intelligence enterprise compliance and security features.

## Tables Required

| Table Name | Purpose | Compliance |
|------------|---------|------------|
| **SSO_Configurations** | Enterprise SSO provider settings | SOC2 CC6.1 |
| **Audit_Logs** | Comprehensive audit trail | SOC2 CC7.2, HIPAA |
| **Security_Incidents** | Incident response tracking | SOC2 CC7.3, HIPAA |
| **Access_Requests** | Access management workflow | SOC2 CC6.2, HIPAA |
| **Access_Reviews** | Periodic access certification | SOC2 CC6.6 |
| **Data_Retention_Queue** | Data lifecycle management | HIPAA, GDPR |
| **Legal_Holds** | Litigation preservation | Legal/Compliance |
| **Compliance_Evidence** | Audit evidence collection | SOC2, HIPAA |
| **Usage_Tracking** | Billing and quotas | Business |
| **Feature_Flags** | Feature rollout control | Business |
| **Webhook_Events** | Webhook processing log | Operations |
| **API_Keys** | API key management | SOC2 CC6.1 |

## How to Import

### Option 1: Manual Creation
1. Create a new Airtable base
2. For each CSV file, create a table with the specified name
3. Add fields according to the Field Name, Field Type, and Options columns

### Option 2: CSV Import
1. Open Airtable and create a new base
2. Import each CSV file as a new table
3. Adjust field types after import (Airtable imports everything as text)

## Field Type Reference

| CSV Field Type | Airtable Type |
|----------------|---------------|
| Auto Number | Auto number |
| Single Line Text | Single line text |
| Long Text | Long text |
| Email | Email |
| URL | URL |
| Number | Number |
| Percent | Percent |
| Currency | Currency |
| Date | Date (include time field) |
| Checkbox | Checkbox |
| Single Select | Single select |
| Multiple Select | Multiple select |

## Retention Requirements

| Table | Retention | Regulation |
|-------|-----------|------------|
| Audit_Logs | 6 years | HIPAA §164.530(j) |
| Security_Incidents | 6 years | HIPAA, SOC2 |
| Access_Requests | 6 years | SOC2 CC6.2 |
| Access_Reviews | 6 years | SOC2 CC6.6 |
| Compliance_Evidence | 7 years | SOC2 |
| Legal_Holds | Indefinite | Legal |

## Security Notes

⚠️ **IMPORTANT**: The following fields contain sensitive data and should be encrypted:
- `SSO_Configurations.client_secret`
- `API_Keys.key_hash` (already hashed, never store plain keys)

## Environment Variables

After creating these tables, add the table IDs to your `.env.local`:

```env
# Compliance Tables
AIRTABLE_SSO_CONFIG_TABLE=tbl...
AIRTABLE_AUDIT_LOGS_TABLE=tbl...
AIRTABLE_INCIDENTS_TABLE=tbl...
AIRTABLE_ACCESS_REQUESTS_TABLE=tbl...
AIRTABLE_ACCESS_REVIEWS_TABLE=tbl...
AIRTABLE_RETENTION_QUEUE_TABLE=tbl...
AIRTABLE_LEGAL_HOLDS_TABLE=tbl...
AIRTABLE_COMPLIANCE_EVIDENCE_TABLE=tbl...
AIRTABLE_USAGE_TRACKING_TABLE=tbl...
AIRTABLE_FEATURE_FLAGS_TABLE=tbl...
AIRTABLE_WEBHOOK_EVENTS_TABLE=tbl...
AIRTABLE_API_KEYS_TABLE=tbl...
```

## Questions?

Contact: engineering@sovereign-intelligence.com
