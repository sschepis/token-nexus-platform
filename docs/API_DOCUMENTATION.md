# Token Nexus Platform API Documentation

This document provides comprehensive API documentation for all Parse Cloud Functions available in the Token Nexus Platform.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Organization Management](#organization-management)
4. [User Management](#user-management)
5. [App Store & Marketplace](#app-store--marketplace)
6. [AI Assistant](#ai-assistant)
7. [Blockchain & Contracts](#blockchain--contracts)
8. [Dashboard & Analytics](#dashboard--analytics)
9. [Page Builder](#page-builder)
10. [System Administration](#system-administration)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

## Overview

The Token Nexus Platform provides a comprehensive REST API through Parse Cloud Functions. All functions are accessible via HTTP POST requests to the Parse Server endpoint.

### Base URL
```
https://your-parse-server.com/parse/functions/[functionName]
```

### Request Format
```javascript
{
  "method": "POST",
  "headers": {
    "X-Parse-Application-Id": "your-app-id",
    "X-Parse-Session-Token": "user-session-token",
    "Content-Type": "application/json"
  },
  "body": {
    // Function parameters
  }
}
```

### Response Format
```javascript
{
  "result": {
    // Function response data
  }
}
```

## Authentication

### Session-Based Authentication

Most functions require a valid user session token in the `X-Parse-Session-Token` header.

```javascript
// Example authenticated request
fetch('https://your-parse-server.com/parse/functions/getOrganizationSettings', {
  method: 'POST',
  headers: {
    'X-Parse-Application-Id': 'your-app-id',
    'X-Parse-Session-Token': 'user-session-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orgId: 'org123'
  })
});
```

### Role-Based Access Control

Functions implement role-based access control:

- **Public**: No authentication required
- **User**: Requires valid session token
- **Admin**: Requires organization admin role
- **System Admin**: Requires system administrator role

## Organization Management

### getOrganizationSettings

Retrieves organization settings and details.

**Access Level**: Admin  
**Parameters**:
- `orgId` (string): Organization ID

**Example Request**:
```javascript
Parse.Cloud.run('getOrganizationSettings', {
  orgId: 'org123'
});
```

**Response**:
```javascript
{
  "objectId": "org123",
  "name": "Acme Corporation",
  "description": "Leading technology company",
  "subdomain": "acme",
  "industry": "Technology",
  "status": "Active",
  "planType": "Enterprise",
  "settings": {
    "theme": {
      "primaryColor": "#007bff",
      "secondaryColor": "#6c757d",
      "logoUrl": "https://example.com/logo.png"
    },
    "customDomain": "acme.example.com"
  },
  "createdAt": "2023-01-15T10:30:00.000Z",
  "updatedAt": "2023-12-01T14:20:00.000Z"
}
```

### updateOrganizationSettings

Updates organization settings.

**Access Level**: Admin  
**Parameters**:
- `orgId` (string): Organization ID
- `name` (string, optional): Organization name
- `description` (string, optional): Organization description
- `subdomain` (string, optional): Organization subdomain
- `industry` (string, optional): Industry classification
- `settings` (object, optional): Custom settings object

**Example Request**:
```javascript
Parse.Cloud.run('updateOrganizationSettings', {
  orgId: 'org123',
  name: 'Acme Corporation Updated',
  settings: {
    theme: {
      primaryColor: '#ff6b35'
    }
  }
});
```

### getAllOrganizations

**System Admin Only**: Retrieves all organizations on the platform.

**Access Level**: System Admin  
**Parameters**: None

**Example Request**:
```javascript
Parse.Cloud.run('getAllOrganizations');
```

**Response**:
```javascript
[
  {
    "objectId": "org123",
    "name": "Acme Corporation",
    "status": "Active",
    "planType": "Enterprise",
    "administrator": {
      "objectId": "user456",
      "email": "admin@acme.com",
      "username": "acme_admin"
    },
    "createdAt": "2023-01-15T10:30:00.000Z",
    "updatedAt": "2023-12-01T14:20:00.000Z"
  }
  // ... more organizations
]
```

### createOrganization

**System Admin Only**: Creates a new organization.

**Access Level**: System Admin  
**Parameters**:
- `name` (string): Organization name
- `ownerEmail` (string): Email of organization administrator
- `planType` (string, optional): Plan type (default: "free")
- `description` (string, optional): Organization description
- `subdomain` (string, optional): Organization subdomain
- `industry` (string, optional): Industry classification

### suspendOrganization / activateOrganization

**System Admin Only**: Suspends or activates an organization.

**Access Level**: System Admin  
**Parameters**:
- `orgId` (string): Organization ID

## User Management

### getAllUsers

**System Admin Only**: Retrieves all users across the platform.

**Access Level**: System Admin  
**Parameters**:
- `limit` (number, optional): Maximum number of results (default: 100)
- `skip` (number, optional): Number of results to skip
- `searchQuery` (string, optional): Search term for filtering

**Example Request**:
```javascript
Parse.Cloud.run('getAllUsers', {
  limit: 50,
  searchQuery: 'john'
});
```

### getUserDetails

Retrieves detailed information about a user.

**Access Level**: Admin  
**Parameters**:
- `userId` (string): User ID

**Example Request**:
```javascript
Parse.Cloud.run('getUserDetails', {
  userId: 'user123'
});
```

**Response**:
```javascript
{
  "objectId": "user123",
  "username": "john_doe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "lastLogin": "2023-12-01T14:20:00.000Z",
  "organizationMemberships": [
    {
      "organization": "org123",
      "role": "Member",
      "joinedAt": "2023-06-15T10:00:00.000Z"
    }
  ],
  "permissions": ["dashboard:read", "tokens:write"],
  "createdAt": "2023-06-15T10:00:00.000Z"
}
```

### updateUserByAdmin

**System Admin Only**: Updates user information.

**Access Level**: System Admin  
**Parameters**:
- `userId` (string): User ID
- `userData` (object): User data to update

### toggleUserStatus

**System Admin Only**: Activates or deactivates a user.

**Access Level**: System Admin  
**Parameters**:
- `userId` (string): User ID
- `isActive` (boolean): Target status

### resetUserPasswordByAdmin

**System Admin Only**: Forces a password reset for a user.

**Access Level**: System Admin  
**Parameters**:
- `userId` (string): User ID

## App Store & Marketplace

### getInstalledAppsForOrg

Retrieves apps installed in an organization.

**Access Level**: User  
**Parameters**:
- `orgId` (string): Organization ID

**Example Request**:
```javascript
Parse.Cloud.run('getInstalledAppsForOrg', {
  orgId: 'org123'
});
```

**Response**:
```javascript
[
  {
    "objectId": "install123",
    "appDefinition": {
      "objectId": "app456",
      "name": "Todo Manager",
      "description": "Task management application",
      "category": "Productivity",
      "publisherName": "Acme Apps"
    },
    "installedVersion": {
      "versionString": "1.2.0",
      "status": "published"
    },
    "installationDate": "2023-11-15T09:00:00.000Z",
    "status": "active",
    "appSpecificConfig": {
      "maxTasks": 100,
      "enableNotifications": true
    }
  }
]
```

### installAppInOrg

Installs an app in an organization.

**Access Level**: Admin  
**Parameters**:
- `appDefinitionId` (string): App definition ID
- `orgId` (string): Organization ID
- `config` (object, optional): App-specific configuration

**Example Request**:
```javascript
Parse.Cloud.run('installAppInOrg', {
  appDefinitionId: 'app456',
  orgId: 'org123',
  config: {
    maxTasks: 50,
    enableNotifications: false
  }
});
```

### uninstallAppFromOrg

Uninstalls an app from an organization.

**Access Level**: Admin  
**Parameters**:
- `installationId` (string): Installation ID

### updateAppConfiguration

Updates app-specific configuration.

**Access Level**: Admin  
**Parameters**:
- `installationId` (string): Installation ID
- `config` (object): New configuration

### listAppsForAdmin

**System Admin Only**: Lists all apps for administrative review.

**Access Level**: System Admin  
**Parameters**:
- `status` (string, optional): Filter by status
- `category` (string, optional): Filter by category

### createOrUpdateAppBundle

**System Admin Only**: Creates or updates an app bundle.

**Access Level**: System Admin  
**Parameters**:
- `appData` (object): App definition data

### approveAppVersion / rejectAppVersion

**System Admin Only**: Approves or rejects an app version.

**Access Level**: System Admin  
**Parameters**:
- `versionId` (string): App version ID
- `rejectionReason` (string, optional): Reason for rejection

## AI Assistant

### chatWithAssistant

Processes AI assistant chat requests.

**Access Level**: User  
**Parameters**:
- `message` (string): User message
- `conversationId` (string, optional): Conversation ID for context
- `context` (object, optional): Additional context information

**Example Request**:
```javascript
Parse.Cloud.run('chatWithAssistant', {
  message: 'How many users are in my organization?',
  conversationId: 'conv123'
});
```

**Response**:
```javascript
{
  "response": "Your organization currently has 25 active users.",
  "conversationId": "conv123",
  "messageId": "msg789",
  "suggestions": [
    "Show me user activity statistics",
    "How can I add more users?"
  ],
  "actions": []
}
```

### getConversationHistory

Retrieves conversation history with the AI assistant.

**Access Level**: User  
**Parameters**:
- `conversationId` (string): Conversation ID
- `limit` (number, optional): Maximum number of messages

### executeAssistantAction

Executes an action suggested by the AI assistant.

**Access Level**: User  
**Parameters**:
- `actionId` (string): Action identifier
- `parameters` (object): Action parameters

## Blockchain & Contracts

### getChainConfigurations

Retrieves available blockchain network configurations.

**Access Level**: User  
**Parameters**: None

**Example Request**:
```javascript
Parse.Cloud.run('getChainConfigurations');
```

**Response**:
```javascript
[
  {
    "objectId": "chain123",
    "name": "Ethereum Mainnet",
    "chainId": 1,
    "rpcUrl": "https://mainnet.infura.io/v3/...",
    "blockExplorer": "https://etherscan.io",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "isEnabled": true,
    "gasSettings": {
      "maxGasPrice": "50000000000",
      "maxPriorityFeePerGas": "2000000000"
    }
  }
]
```

### saveChainConfiguration

**System Admin Only**: Saves blockchain network configuration.

**Access Level**: System Admin  
**Parameters**:
- `chainData` (object): Chain configuration data

### testRpcConnection

Tests connectivity to a blockchain RPC endpoint.

**Access Level**: Admin  
**Parameters**:
- `rpcUrl` (string): RPC endpoint URL
- `chainId` (number): Expected chain ID

### getDeployableContracts

Retrieves available contract types for deployment.

**Access Level**: User  
**Parameters**:
- `category` (string, optional): Contract category filter

**Response**:
```javascript
[
  {
    "contractType": "ERC20Token",
    "name": "ERC-20 Token",
    "description": "Standard fungible token",
    "category": "Tokens",
    "parameters": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Token name"
      },
      {
        "name": "symbol",
        "type": "string",
        "required": true,
        "description": "Token symbol"
      }
    ]
  }
]
```

### estimateDeploymentGas

Estimates gas costs for contract deployment.

**Access Level**: User  
**Parameters**:
- `contractType` (string): Contract type
- `parameters` (object): Contract parameters
- `chainId` (number): Target chain ID

### deployContract

Deploys a smart contract.

**Access Level**: User  
**Parameters**:
- `contractType` (string): Contract type
- `parameters` (object): Contract parameters
- `chainId` (number): Target chain ID
- `deployerAddress` (string): Deployer wallet address

### getDeploymentStatus

Retrieves deployment status.

**Access Level**: User  
**Parameters**:
- `deploymentId` (string): Deployment ID

**Response**:
```javascript
{
  "deploymentId": "deploy123",
  "status": "completed",
  "transactionHash": "0x...",
  "contractAddress": "0x...",
  "gasUsed": "2100000",
  "gasPrice": "20000000000",
  "blockNumber": 18500000,
  "deployedAt": "2023-12-01T15:30:00.000Z"
}
```

## Dashboard & Analytics

### getDashboardData

Retrieves dashboard data for an organization.

**Access Level**: User  
**Parameters**:
- `orgId` (string): Organization ID
- `timeRange` (string, optional): Time range filter

**Example Request**:
```javascript
Parse.Cloud.run('getDashboardData', {
  orgId: 'org123',
  timeRange: '7d'
});
```

**Response**:
```javascript
{
  "userMetrics": {
    "totalUsers": 25,
    "activeUsers": 18,
    "newUsers": 3
  },
  "tokenMetrics": {
    "totalTokens": 12,
    "newTokens": 2,
    "totalTransactions": 1500
  },
  "appMetrics": {
    "installedApps": 8,
    "activeApps": 6,
    "appUsage": {
      "TodoManager": 245,
      "CRMApp": 189
    }
  },
  "activityFeed": [
    {
      "type": "token_created",
      "user": "john_doe",
      "timestamp": "2023-12-01T14:30:00.000Z",
      "details": "Created token ACME"
    }
  ]
}
```

### getSystemAnalytics

**System Admin Only**: Retrieves platform-wide analytics.

**Access Level**: System Admin  
**Parameters**:
- `timeRange` (string, optional): Time range filter

### updateDashboardLayout

Updates user's dashboard layout configuration.

**Access Level**: User  
**Parameters**:
- `layout` (object): Dashboard layout configuration

## Page Builder

### getPageFromCloud

Retrieves a page definition from cloud storage.

**Access Level**: User  
**Parameters**:
- `pageId` (string): Page ID

**Example Request**:
```javascript
Parse.Cloud.run('getPageFromCloud', {
  pageId: 'page123'
});
```

**Response**:
```javascript
{
  "objectId": "page123",
  "title": "Landing Page",
  "content": {
    "type": "page",
    "components": [
      {
        "type": "header",
        "props": {
          "title": "Welcome to Acme"
        }
      }
    ]
  },
  "status": "published",
  "metadata": {
    "description": "Company landing page",
    "keywords": ["landing", "homepage"]
  },
  "version": "1.2",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

### savePageToCloud

Saves a page definition to cloud storage.

**Access Level**: User  
**Parameters**:
- `pageData` (object): Page definition
- `publishImmediately` (boolean, optional): Publish immediately

### getAvailableComponents

Retrieves available page builder components.

**Access Level**: User  
**Parameters**:
- `category` (string, optional): Component category

**Response**:
```javascript
[
  {
    "id": "header",
    "name": "Header",
    "category": "Layout",
    "description": "Page header component",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "subtitle",
        "type": "string",
        "required": false
      }
    ]
  }
]
```

### generatePageAccessToken

Generates a temporary access token for page editing.

**Access Level**: User  
**Parameters**:
- `pageId` (string): Page ID
- `permissions` (array): Required permissions

## System Administration

### ensureCoreSchemas

**System Admin Only**: Ensures core platform schemas exist.

**Access Level**: System Admin  
**Parameters**: None

### importCoreSystemArtifactsBatch

**System Admin Only**: Imports core system artifacts.

**Access Level**: System Admin  
**Parameters**:
- `networkName` (string): Target network name

### completeInitialPlatformSetup

**System Admin Only**: Completes initial platform setup.

**Access Level**: System Admin  
**Parameters**:
- `parentOrgName` (string): Parent organization name
- `adminUserEmail` (string): Admin user email
- `adminUserPassword` (string): Admin user password

### getSecurityMetrics

**System Admin Only**: Retrieves security metrics.

**Access Level**: System Admin  
**Parameters**:
- `timeRange` (string, optional): Time range filter

### logSecurityEvent

Logs a security event.

**Access Level**: User  
**Parameters**:
- `eventType` (string): Event type
- `details` (object): Event details

## Error Handling

All functions return errors in a consistent format:

### Error Response Format
```javascript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid organization ID",
    "details": {
      "field": "orgId",
      "value": "invalid_id"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Missing or invalid session token
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### Error Handling Best Practices

```javascript
try {
  const result = await Parse.Cloud.run('getOrganizationSettings', {
    orgId: 'org123'
  });
  // Handle success
} catch (error) {
  switch (error.code) {
    case 'PERMISSION_DENIED':
      // Handle permission error
      break;
    case 'NOT_FOUND':
      // Handle not found error
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## Rate Limiting

API calls are subject to rate limiting to ensure fair usage:

### Rate Limits

- **Standard Users**: 1000 requests per hour
- **Organization Admins**: 5000 requests per hour
- **System Admins**: 10000 requests per hour

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

### Handling Rate Limits

When rate limits are exceeded, the API returns:

```javascript
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retryAfter": 3600
  }
}
```

## SDK Usage Examples

### JavaScript/Node.js

```javascript
// Initialize Parse
Parse.initialize("your-app-id", "your-javascript-key");
Parse.serverURL = "https://your-parse-server.com/parse";

// Authenticate user
const user = await Parse.User.logIn("username", "password");

// Call cloud function
const result = await Parse.Cloud.run('getOrganizationSettings', {
  orgId: 'org123'
});
```

### React

```javascript
import Parse from 'parse';

// In a React component
const [orgData, setOrgData] = useState(null);

useEffect(() => {
  const fetchOrgData = async () => {
    try {
      const result = await Parse.Cloud.run('getOrganizationSettings', {
        orgId: currentOrgId
      });
      setOrgData(result);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  fetchOrgData();
}, [currentOrgId]);
```

### cURL

```bash
curl -X POST \
  -H "X-Parse-Application-Id: your-app-id" \
  -H "X-Parse-Session-Token: user-session-token" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org123"}' \
  https://your-parse-server.com/parse/functions/getOrganizationSettings
```

## Testing

### Function Testing

Use the Parse Dashboard or custom test scripts to test functions:

```javascript
// Test function with mock data
const testGetOrgSettings = async () => {
  const mockRequest = {
    user: mockUser,
    params: { orgId: 'test-org' }
  };
  
  const result = await getOrganizationSettings(mockRequest);
  console.log('Test result:', result);
};
```

### Integration Testing

```javascript
// Integration test example
describe('Organization Management', () => {
  it('should retrieve organization settings', async () => {
    const result = await Parse.Cloud.run('getOrganizationSettings', {
      orgId: 'test-org'
    });
    
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('settings');
  });
});
```

---

*This documentation is automatically updated. Last updated: [Date]*  
*For API support, contact: api-support@tokennexus.com*