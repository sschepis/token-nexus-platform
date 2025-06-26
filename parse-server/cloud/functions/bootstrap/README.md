# Bootstrap Functions

This directory contains modular bootstrap and setup cloud functions for the Token Nexus Platform.

## Structure

The bootstrap functionality has been refactored from a single monolithic `setup.js` file into multiple focused modules:

### Core Modules

- **`index.js`** - Main entry point that imports all bootstrap modules
- **`platformSetup.js`** - Core platform initialization functions
- **`sampleData.js`** - Sample data seeding utilities
- **`automatedInstall.js`** - Environment-based automated installation
- **`userOrgFixes.js`** - User and organization fix utilities
- **`smartContractStudio.js`** - Smart Contract Studio initialization

## Cloud Functions

### Platform Setup
- `completeInitialPlatformSetup` - Complete initial platform setup with admin user and parent organization

### Sample Data
- `seedSampleApp` - Create sample task manager app for demonstration

### Automated Installation
- `checkAndRunAutomatedInstall` - Check for AUTO_INSTALL_CONFIG environment variable and run automated setup

### User/Organization Fixes
- `fixUserOrganization` - Fix user organization associations
- `fixAdminUserSetup` - Fix admin user flags and ensure proper organization setup

### Smart Contract Studio
- `initializeSmartContractStudio` - Initialize Smart Contract Studio schemas and seed data

## Usage

All functions are automatically loaded when the main functions index imports the bootstrap module:

```javascript
require('./bootstrap');
```

## Admin User Standards

The platform uses a **single admin flag**: `isAdmin: true`

- ✅ Use `isAdmin` for all admin checks
- ❌ Do not use `isSystemAdmin` (legacy flag removed)

## Organization Context

- All users must be associated with at least one organization
- System admins with `isAdmin: true` have implicit access to all organizations
- Regular users require explicit `OrgRole` records for organization access

## Migration Notes

This refactoring replaced the original 500+ line `setup.js` file with focused, maintainable modules. The old file has been preserved but should be removed after confirming all functionality works correctly.