# Dfns / Persona Integration - Remaining Tasks Checklist

This document outlines the remaining tasks for the Dfns/Persona Integration Plan, based on the status check of `DFNS_PERSONA_INTEGRATION_PLAN.md`.

## I. Backend: Parse Server Enhancements

- [ ] **1.3. Dfns Wallet Provisioning Cloud Functions (Core Logic & Notifications):**
    - [ ] **Actual Dfns Wallet Creation:** Implement the actual call to the Dfns API within the `provisionDfnsWallet` Cloud Function (`parse-server/cloud/functions/dfnsWallet.js`) to create a new key and/or wallet for the user. Replace the placeholder logic.
    - [ ] **Trigger Notifications on Provisioning:** Implement sending in-app notifications to the user and email notifications to administrators upon successful Dfns wallet provisioning. This is a `TODO` in the existing code.
- [ ] **1.3. Dfns Transaction Execution Cloud Functions (Core Logic & Listing):**
    - [ ] **Actual Dfns Transaction Execution:** Implement the core logic for signing and broadcasting transactions via Dfns within the `executeDfnsTransaction` Cloud Function (`parse-server/cloud/functions/dfnsWallet.js`). This is currently a placeholder.
    - [ ] **List Dfns Wallets (API Call):** Update the `listOrgDfnsWallets` Cloud Function (`parse-server/cloud/functions/dfnsWallet.js`) to integrate with the Dfns API to list wallets comprehensively, rather than fetching from Parse User objects.
    - [ ] **List Dfns Transactions (API Call):** Update the `listOrgDfnsTransactions` Cloud Function (`parse-server/cloud/functions/dfnsWallet.js`) to integrate with the Dfns API to list actual transactions. This is currently returning placeholder data.

## II. Frontend: User Experience & Admin Configuration

- [ ] **2.1. Admin Panel: Organization Integration Settings (`src/pages/system-admin/organizations/[id]/integrations.tsx`):**
    - [ ] Implement the user interface within this page to allow Organization Admins to securely configure Dfns API credentials (`App ID`, `Private Key`, `Credential ID`) and Persona Webhook Secret.
    - [ ] Include "Test Connection" buttons for both Dfns and Persona to validate credentials via the backend test functions (`testDfnsConnection`, `testPersonaWebhook`).
- [ ] **2.2. User Onboarding Flow (`src/pages/auth/register.tsx`, `src/components/profile/KYCStatus.tsx`):**
    - [ ] Integrate Persona's client-side SDK (Flow) to enable initiation of KYC/KYB inquiries within the user onboarding process.
    - [ ] Develop UI elements to dynamically display the user's current (`user.kycStatus`) and relevant messages (`user.kycMessage`) and provide actionable buttons (e.g., "Start Verification," "View Inquiry Status").
- [ ] **2.3. Wallet & Transaction UI (`src/pages/wallet/index.tsx`, `src/components/wallet/TransactionCreator.tsx`):**
    - [ ] Implement UI to display the user's Dfns wallet address (`user.walletAddress`).
    - [ ] Integrate transaction creation UI (`TransactionCreator.tsx`) with the `executeDfnsTransaction` Cloud Function for sending and signing transactions.
    - [ ] Develop UI to display the user's wallet provisioning status (`user.dfnsWalletProvisioned`).

## III. Notifications & Error Handling

- [ ] **3.2. Email Notifications (`sendAdminEmailNotification`):**
    - [ ] Implement the actual email sending logic (e.g., using an email service like SendGrid or Nodemailer) for critical alerts to organization administrators within the `sendAdminEmailNotification` Cloud Function (`parse-server/cloud/functions/integrations.js`). This is currently a `TODO` placeholder.
- [ ] **3.1. In-App Notifications:**
    - [ ] Ensure that in-app notifications are properly triggered and displayed to the user for events such as KYC status updates (verified, declined, pending), successful Dfns wallet creation, and transaction outcomes (signed, failed). (Marked as `TODO` in `dfnsWallet.js` and implied elsewhere).

## IV. Security Considerations & Best Practices (Ongoing)

- [ ] **Continuous Verification**: Maintain ongoing vigilance to ensure that robust encryption, strict access control (Parse ACLs and CLPs), secure environment variable management, and comprehensive but secure logging practices are followed as new features are implemented.
- [ ] **Idempotency**: Continuously ensure all related functions (especially webhook handlers and provisioning) are idempotent to prevent issues from duplicate calls or retries.