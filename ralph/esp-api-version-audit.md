# ESP Connector API Version Audit

**Date**: January 19, 2026  
**Story ID**: US-025  
**Status**: Audit Complete

## Summary

This document audits all 17 ESP connectors to document the API versions currently in use and identify any that may need updates to the latest API versions.

## API Version Documentation

### 1. Beehiiv
- **Current API Version**: v2
- **Base URL**: `https://api.beehiiv.com/v2`
- **API Documentation**: Not specified in connector
- **Status**: ✅ Version specified in URL
- **Notes**: Using v2 API. Check if v3 or newer is available.

### 2. Kit
- **Current API Version**: v1
- **Base URL**: `https://api.kit.com/v1`
- **API Documentation**: Not specified in connector
- **Status**: ✅ Version specified in URL
- **Notes**: Using v1 API. Check if v2 or newer is available.

### 3. Mailchimp
- **Current API Version**: v3.0
- **Base URL**: `https://{dc}.api.mailchimp.com/3.0` (datacenter-specific)
- **API Documentation**: Not specified in connector
- **Status**: ✅ Version specified in URL
- **Notes**: Using v3.0 API. Mailchimp has a v3.0 API that is current. Verify if this is the latest.

### 4. Campaign Monitor
- **Current API Version**: v3.2
- **Base URL**: `https://api.createsend.com/api/v3.2`
- **API Documentation**: `https://www.campaignmonitor.com/api/v3.2/` (specified in connector)
- **Status**: ✅ Version specified in URL and documented
- **Notes**: Using v3.2 API with documentation link. Verify if this is the latest version.

### 5. Email Octopus
- **Current API Version**: v1.6 (implied from comment)
- **Base URL**: `https://api.emailoctopus.com` (no version in URL)
- **API Documentation**: `https://emailoctopus.com/api-documentation/v2` (specified in connector)
- **Status**: ⚠️ Documentation mentions v2, but connector may use v1.6
- **Notes**: Documentation link references v2, but base URL doesn't include version. Verify actual API version in use.

### 6. Omeda
- **Current API Version**: Not specified in URL
- **Base URL**: `https://ows.omeda.com/webservices/rest/{client}`
- **API Documentation**: `https://developer.omeda.com/` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: REST API without versioning in URL. Check documentation for latest API version.

### 7. Ghost
- **Current API Version**: Not specified in URL
- **Base URL**: `{siteUrl}/ghost/api/admin`
- **API Documentation**: `https://ghost.org/docs/admin-api/` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: Admin API without versioning in URL. Check if latest API version is being used.

### 8. SparkPost
- **Current API Version**: v1
- **Base URL**: `https://api.sparkpost.com/api/v1` (US) or `https://api.eu.sparkpost.com/api/v1` (EU)
- **API Documentation**: `https://developers.sparkpost.com/api/` (specified in connector)
- **Status**: ✅ Version specified in URL
- **Notes**: Using v1 API. Check if v2 or newer is available.

### 9. ActiveCampaign
- **Current API Version**: v3
- **Base URL**: `https://{accountName}.api-us1.com/api/3`
- **API Documentation**: `https://developers.activecampaign.com/reference` (specified in connector)
- **Status**: ✅ Version specified in URL and documented
- **Notes**: Using v3 API. Verify if this is the latest version.

### 10. Customer.io
- **Current API Version**: v1
- **Base URL**: `https://api.customer.io/v1` (US) or `https://api-eu.customer.io/v1` (EU)
- **API Documentation**: `https://customer.io/docs/api/` (specified in connector)
- **Status**: ✅ Version specified in URL
- **Notes**: Using v1 API. Check if v2 or newer is available.

### 11. Sailthru
- **Current API Version**: Not specified in URL
- **Base URL**: `https://api.sailthru.com`
- **API Documentation**: `https://getstarted.sailthru.com/developers/api-basics/` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: API without versioning in URL. Check documentation for latest API version.

### 12. MailerLite
- **Current API Version**: Not specified in URL
- **Base URL**: `https://connect.mailerlite.com/api`
- **API Documentation**: `https://developers.mailerlite.com/docs` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: Using MailerLite Connect API. Verify if this is the latest API version.

### 13. PostUp
- **Current API Version**: Not specified in URL
- **Base URL**: `https://api.postup.com/api`
- **API Documentation**: `https://api.postup.com/docs/` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: API without versioning in URL. Check documentation for latest API version.

### 14. Constant Contact
- **Current API Version**: v3
- **Base URL**: `https://api.cc.email/v3`
- **API Documentation**: `https://developer.constantcontact.com/api_guide/index.html` (specified in connector)
- **Status**: ✅ Version specified in URL and documented
- **Notes**: Using v3 API. Verify if this is the latest version.

### 15. Iterable
- **Current API Version**: Not specified in URL
- **Base URL**: `https://api.iterable.com/api`
- **API Documentation**: `https://api.iterable.com/api/docs` (specified in connector)
- **Status**: ⚠️ No version in URL
- **Notes**: API without versioning in URL. Check documentation for latest API version.

### 16. SendGrid
- **Current API Version**: v3
- **Base URL**: `https://api.sendgrid.com/v3`
- **API Documentation**: `https://docs.sendgrid.com/api-reference/marketing-campaigns/` (specified in connector)
- **Status**: ✅ Version specified in URL and documented
- **Notes**: Using v3 API. SendGrid has v3 as current. Verify if this is the latest.

### 17. Brevo (formerly Sendinblue)
- **Current API Version**: v3
- **Base URL**: `https://api.brevo.com/v3`
- **API Documentation**: `https://developers.brevo.com/reference/getting-started-1` (specified in connector)
- **Status**: ✅ Version specified in URL and documented
- **Notes**: Using v3 API. Verify if this is the latest version.

## Connectors Requiring API Documentation Links

The following connectors are missing API documentation links in their class-level comments:

1. **Beehiiv** - No documentation link
2. **Kit** - No documentation link
3. **Mailchimp** - No documentation link
4. **Email Octopus** - Has documentation link but may be outdated (references v2 while connector may use v1.6)

## Connectors with Version in URL

✅ **Connectors with explicit version in URL:**
- Beehiiv (v2)
- Kit (v1)
- Mailchimp (v3.0)
- Campaign Monitor (v3.2)
- SparkPost (v1)
- ActiveCampaign (v3)
- Customer.io (v1)
- Constant Contact (v3)
- SendGrid (v3)
- Brevo (v3)

## Connectors without Version in URL

⚠️ **Connectors without version in URL (need verification):**
- Email Octopus (base URL doesn't include version)
- Omeda
- Ghost
- Sailthru
- MailerLite
- PostUp
- Iterable

## Recommendations

### High Priority (Verify Latest API Versions)

1. **Email Octopus** - Documentation mentions v2, but connector may be using v1.6. Verify actual version and update if needed.
2. **Kit** - Using v1 API. Check if v2 or newer is available.
3. **Customer.io** - Using v1 API. Check if v2 or newer is available.
4. **SparkPost** - Using v1 API. Check if v2 or newer is available.

### Medium Priority (Add Documentation Links)

1. **Beehiiv** - Add API documentation link
2. **Kit** - Add API documentation link
3. **Mailchimp** - Add API documentation link

### Low Priority (Verify Current Versions)

1. **Mailchimp** - Verify v3.0 is the latest
2. **Campaign Monitor** - Verify v3.2 is the latest
3. **ActiveCampaign** - Verify v3 is the latest
4. **Constant Contact** - Verify v3 is the latest
5. **SendGrid** - Verify v3 is the latest
6. **Brevo** - Verify v3 is the latest

### Connectors Needing Version Verification

For connectors without version in URL, verify they're using the latest API:
- Omeda
- Ghost
- Sailthru
- MailerLite
- PostUp
- Iterable

## Next Steps

1. Review official API documentation for each ESP to identify latest API versions
2. Compare current connector implementations with latest API versions
3. Create update tasks for connectors using outdated API versions
4. Add missing API documentation links to all connectors
5. Update connectors to use latest API versions where applicable

## Connectors That Need API Version Updates

Based on this audit, the following connectors should be prioritized for API version verification and potential updates:

1. **Email Octopus** - Potential version mismatch (documentation v2 vs possible v1.6 usage)
2. **Kit** - Using v1, check for v2+
3. **Customer.io** - Using v1, check for v2+
4. **SparkPost** - Using v1, check for v2+
5. **Beehiiv** - Using v2, check for v3+

All other connectors should be verified against latest API documentation to ensure they're using current versions.
