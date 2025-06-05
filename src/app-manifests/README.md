# Nomyx Standard Applications

This directory contains the standard application manifests for the Nomyx platform. These applications provide core functionality for digital tokenization, identity management, trade finance, and platform administration.

## Overview

The Nomyx platform includes six standard applications that work together to provide a comprehensive digital asset and trade finance platform:

### Core Applications
- **Identity Management** (`nomyx-identity-management`) - Digital identity creation, verification, and management
- **Digital Asset Management** (`nomyx-digital-assets`) - Tokenization, NFT minting, and marketplace functionality
- **Wallet Management** (`nomyx-wallet-management`) - Multi-signature wallets, security, and transaction management

### Finance Applications
- **Trade Finance Platform** (`nomyx-trade-finance`) - Trade deals, letters of credit, and supply chain finance

### Compliance Applications
- **KYC & Compliance** (`nomyx-kyc-compliance`) - Know Your Customer, AML monitoring, and regulatory compliance

### Administrative Applications
- **Platform Admin Suite** (`nomyx-platform-admin`) - System administration, monitoring, and configuration

## Architecture

Each standard application is defined by an `AppManifest` that includes:

- **Metadata**: ID, name, version, description, publisher
- **Framework Compatibility**: Version requirements and compatibility matrix
- **UI Configuration**: Admin and user interface routes, navigation, and permissions
- **Backend Services**: Cloud functions, schemas, webhooks, and scheduled jobs
- **Dependencies**: Platform requirements and inter-app dependencies
- **Configuration**: Configurable settings with validation and defaults

## File Structure

```
src/app-manifests/
├── README.md                           # This documentation
├── index.ts                           # Exports all manifests and utilities
├── identity-management-manifest.ts    # Identity Management app
├── digital-asset-manifest.ts         # Digital Asset Management app
├── trade-finance-manifest.ts         # Trade Finance Platform app
├── kyc-compliance-manifest.ts        # KYC & Compliance app
├── wallet-management-manifest.ts     # Wallet Management app
└── platform-admin-manifest.ts        # Platform Admin Suite app
```

## Usage

### Importing Manifests

```typescript
// Import individual manifests
import { identityManagementManifest } from './app-manifests/identity-management-manifest';
import { digitalAssetManifest } from './app-manifests/digital-asset-manifest';

// Import all manifests
import { standardAppManifests, getAppManifestById } from './app-manifests';

// Get manifest by ID
const manifest = getAppManifestById('nomyx-identity-management');
```

### Registering Applications

```typescript
import { standardAppRegistry } from '../services/standardAppRegistry';

// Register all standard applications
await standardAppRegistry.registerAllStandardApps();

// Register a specific application
await standardAppRegistry.registerStandardApp(identityManagementManifest);
```

### Installing Applications

```typescript
// Install core applications for a new organization
await standardAppRegistry.installCoreApps('userId', 'organizationId');

// Install a specific application
await standardAppRegistry.installStandardApp(
  'nomyx-digital-assets', 
  'userId', 
  'organizationId',
  { /* configuration */ }
);
```

## Application Details

### Identity Management (`nomyx-identity-management`)

**Purpose**: Manages digital identities using EVM-compatible smart contracts and identity factories.

**Key Features**:
- Identity creation and verification
- Document management and verification
- Credential issuance and validation
- Identity recovery and backup
- Integration with KYC processes

**Dependencies**: None (core application)

**Permissions**: `identity:*`, `documents:*`, `credentials:*`, `blockchain:*`

### Digital Asset Management (`nomyx-digital-assets`)

**Purpose**: Complete tokenization platform with NFT minting, marketplace, and royalty management.

**Key Features**:
- Asset tokenization (ERC-721, ERC-1155, ERC-20)
- NFT minting and metadata management
- Marketplace integration
- Royalty configuration and distribution
- Collection management
- IPFS integration for metadata storage

**Dependencies**: Identity Management (for verification)

**Permissions**: `assets:*`, `tokens:*`, `marketplace:*`, `ipfs:*`

### Trade Finance Platform (`nomyx-trade-finance`)

**Purpose**: Comprehensive trade finance with smart contracts, letters of credit, and supply chain tracking.

**Key Features**:
- Trade deal creation and execution
- Letters of credit management
- Supply chain tracking
- Trade financing and working capital
- Compliance monitoring
- Document management
- Risk assessment

**Dependencies**: Identity Management, Digital Assets (optional)

**Permissions**: `trades:*`, `finance:*`, `supply-chain:*`, `compliance:*`

### KYC & Compliance (`nomyx-kyc-compliance`)

**Purpose**: Regulatory compliance with automated KYC, AML monitoring, and sanctions screening.

**Key Features**:
- Multi-tier KYC verification
- AML transaction monitoring
- Sanctions and PEP screening
- Risk assessment and scoring
- Regulatory reporting
- Document verification
- Continuous monitoring

**Dependencies**: Identity Management

**Permissions**: `kyc:*`, `aml:*`, `sanctions:*`, `compliance:*`

### Wallet Management (`nomyx-wallet-management`)

**Purpose**: Advanced wallet management with multi-signature support and hardware wallet integration.

**Key Features**:
- Custodial and non-custodial wallets
- Multi-signature wallet configuration
- Hardware wallet integration
- Transaction management and monitoring
- Security policies and spending limits
- Backup and recovery
- Gas optimization

**Dependencies**: Identity Management, KYC Compliance (optional)

**Permissions**: `wallets:*`, `transactions:*`, `security:*`, `dfns:*`

### Platform Admin Suite (`nomyx-platform-admin`)

**Purpose**: Comprehensive platform administration with monitoring, configuration, and operational tools.

**Key Features**:
- User and organization management
- Application lifecycle management
- System monitoring and health checks
- Platform configuration
- Security management
- Analytics and reporting
- Backup and maintenance
- Integration management

**Dependencies**: None (administrative application)

**Permissions**: `platform:*`, `system:*`, `users:*`, `apps:*`

## Configuration

Each application includes a comprehensive configuration schema with:

- **Type-safe configuration**: Strongly typed configuration options
- **Validation rules**: Input validation and constraints
- **Default values**: Sensible defaults for all settings
- **Environment-specific settings**: Different configurations for development, staging, and production

Example configuration:

```typescript
{
  defaultTokenStandard: 'ERC721',
  marketplaceFeePercentage: 2.5,
  enableLazyMinting: true,
  supportedBlockchains: ['ethereum', 'polygon'],
  requireIdentityVerification: true
}
```

## Integration Points

### Smart Contract Integration

All applications integrate with the existing smart contract infrastructure:

- **IdentityFactory**: For creating and managing digital identities
- **DiamondFactory**: For deploying diamond contracts with various facets
- **Facets**: ERC721, Marketplace, TradeDeal, and other specialized facets

### Parse Server Integration

Applications use Parse Cloud Functions and schemas for:

- **Data persistence**: Storing application data and configurations
- **Business logic**: Implementing complex workflows and validations
- **Real-time updates**: WebSocket connections for live updates
- **File storage**: Document and media file management

### External Service Integration

- **Dfns**: Wallet infrastructure and key management
- **IPFS**: Decentralized storage for metadata and documents
- **Twilio**: Communication and notifications
- **Third-party APIs**: KYC providers, sanctions screening, etc.

## Development

### Adding New Applications

1. Create a new manifest file following the existing pattern
2. Add the manifest to the exports in `index.ts`
3. Update the `standardAppRegistry` to include initialization logic
4. Add the application to the `initializeStandardApps` script

### Modifying Existing Applications

1. Update the manifest file with new features or configuration
2. Ensure backward compatibility with existing installations
3. Update version numbers following semantic versioning
4. Test the changes with the existing app framework

### Testing

```bash
# Initialize standard applications
npm run init-standard-apps

# Test application registration
npm run test:apps

# Validate manifests
npm run validate:manifests
```

## Deployment

Standard applications are automatically registered when the platform starts. For production deployments:

1. Ensure all dependencies are available
2. Configure environment-specific settings
3. Run the initialization script
4. Verify all applications are registered and functional

## Support

For questions or issues with standard applications:

- Check the application logs for detailed error messages
- Verify all dependencies are properly configured
- Ensure the platform version is compatible
- Contact the Nomyx development team for assistance