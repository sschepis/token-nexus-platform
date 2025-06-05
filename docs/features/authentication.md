# Authentication & Authorization

This document provides comprehensive details about the authentication and authorization system in the Token Nexus Platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Implementation Status](#implementation-status)
- [Technical Architecture](#technical-architecture)
- [User Flows](#user-flows)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Remaining Tasks](#remaining-tasks)

## 🎯 Overview

The Token Nexus Platform implements a comprehensive authentication and authorization system built on Parse Server's user management with custom enhancements for multi-tenant organization support.

### Key Features
- **Email/Password Authentication**: Standard login with secure password handling
- **Organization-based Access**: Multi-tenant architecture with organization isolation
- **Role-based Permissions**: Hierarchical permission system with granular controls
- **Session Management**: Secure JWT token handling with refresh capabilities
- **Multi-Factor Authentication**: Optional 2FA support (in progress)

## ✅ Implementation Status

| Component | Status | Progress | Notes |
|-----------|--------|----------|-------|
| User Registration | ✅ Complete | 100% | Email verification included |
| User Login | ✅ Complete | 100% | JWT token generation |
| Password Reset | ✅ Complete | 100% | Email-based reset flow |
| Organization Management | ✅ Complete | 100% | Multi-tenant support |
| Role-based Access Control | ✅ Complete | 95% | Minor UI refinements needed |
| Session Management | ✅ Complete | 100% | Token refresh and validation |
| Multi-Factor Authentication | 🔄 In Progress | 60% | SMS/TOTP implementation pending |
| Social Login | 📋 Planned | 0% | OAuth providers integration |

## 🏗️ Technical Architecture

### Authentication Flow
```
1. User submits credentials
   ↓
2. Parse Server validates credentials
   ↓
3. JWT token generated with user context
   ↓
4. Organization context established
   ↓
5. Permissions loaded and cached
   ↓
6. Redux state initialized
   ↓
7. User redirected to dashboard
```

### Core Components

#### Frontend Components
```typescript
// Authentication slice (Redux)
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  orgId: string | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

// Login component
const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  
  const dispatch = useAppDispatch();
  
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(loginUser(credentials)).unwrap();
      router.push('/dashboard');
    } catch (error) {
      // Handle login error
    }
  };
  
  // Component JSX
};
```

#### Backend Implementation
```javascript
// Parse Cloud Function for login
Parse.Cloud.define('login', async (request) => {
  const { email, password } = request.params;
  
  try {
    const user = await Parse.User.logIn(email, password);
    
    // Get user's organization context
    const orgQuery = new Parse.Query('Organization');
    orgQuery.equalTo('members', user);
    const organizations = await orgQuery.find({ useMasterKey: true });
    
    // Set current organization
    if (organizations.length > 0) {
      user.set('currentOrganization', organizations[0]);
      await user.save(null, { useMasterKey: true });
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.get('email'),
        firstName: user.get('firstName'),
        lastName: user.get('lastName'),
        organizationId: organizations[0]?.id
      },
      token: user.getSessionToken(),
      permissions: await getUserPermissions(user)
    };
  } catch (error) {
    throw new Parse.Error(Parse.Error.INVALID_LOGIN, 'Invalid credentials');
  }
});
```

### Permission System

#### Permission Structure
```typescript
// Permission format: resource:action
const permissions = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'tokens:read',
  'tokens:create',
  'dashboard:view',
  'admin:all'
];

// Role definitions
const roles = {
  'system-admin': ['admin:all'],
  'org-admin': [
    'users:*',
    'tokens:*',
    'dashboard:*',
    'settings:*'
  ],
  'member': [
    'users:read',
    'tokens:read',
    'dashboard:view'
  ],
  'viewer': [
    'dashboard:view'
  ]
};
```

#### Permission Validation
```typescript
// Frontend permission hook
export const usePermission = (permission: string): boolean => {
  const { permissions, isAdmin } = useAppSelector(state => state.auth);
  
  if (isAdmin) return true;
  
  return permissions.some(p => {
    if (p === permission) return true;
    if (p.endsWith(':*')) {
      const resource = p.split(':')[0];
      return permission.startsWith(resource + ':');
    }
    return false;
  });
};

// Backend permission validation
function validatePermission(user, requiredPermission) {
  const userPermissions = user.get('permissions') || [];
  const isAdmin = user.get('isAdmin') || false;
  
  if (isAdmin) return true;
  
  return userPermissions.some(permission => {
    if (permission === requiredPermission) return true;
    if (permission.endsWith(':*')) {
      const resource = permission.split(':')[0];
      return requiredPermission.startsWith(resource + ':');
    }
    return false;
  });
}
```

## 🔄 User Flows

### Registration Flow
```
1. User visits registration page
2. Fills out registration form
3. Email validation occurs
4. Account created in Parse
5. Verification email sent
6. User clicks verification link
7. Account activated
8. User can log in
```

### Login Flow
```
1. User enters credentials
2. Frontend validates input
3. API call to Parse Server
4. Credentials verified
5. JWT token generated
6. Organization context loaded
7. Permissions retrieved
8. Redux state updated
9. Redirect to dashboard
```

### Organization Switching
```
1. User clicks organization switcher
2. Available organizations loaded
3. User selects new organization
4. API call to switch context
5. New permissions loaded
6. Redux state updated
7. Page refreshes with new context
```

## 🔌 API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
```typescript
Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organizationId": "org123"
  },
  "token": "jwt_token_here",
  "permissions": ["users:read", "dashboard:view"]
}
```

#### POST /api/auth/register
```typescript
Request:
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith"
}

Response:
{
  "success": true,
  "message": "Registration successful. Please check your email for verification."
}
```

#### POST /api/auth/logout
```typescript
Request: (No body, requires Authorization header)

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/forgot-password
```typescript
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /api/auth/reset-password
```typescript
Request:
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Organization Management

#### GET /api/auth/organizations
```typescript
Response:
{
  "success": true,
  "organizations": [
    {
      "id": "org123",
      "name": "My Organization",
      "role": "admin",
      "isCurrent": true
    },
    {
      "id": "org456",
      "name": "Another Org",
      "role": "member",
      "isCurrent": false
    }
  ]
}
```

#### POST /api/auth/switch-organization
```typescript
Request:
{
  "organizationId": "org456"
}

Response:
{
  "success": true,
  "organization": {
    "id": "org456",
    "name": "Another Org",
    "role": "member"
  },
  "permissions": ["users:read", "dashboard:view"]
}
```

## 🛡️ Security Features

### Password Security
- **Minimum Requirements**: 8 characters, mixed case, numbers
- **Hashing**: bcrypt with salt rounds
- **Validation**: Client and server-side validation
- **Reset Flow**: Secure token-based password reset

### Session Security
- **JWT Tokens**: Signed with secret key
- **Token Expiration**: Configurable expiration times
- **Refresh Tokens**: Automatic token refresh
- **Session Invalidation**: Logout invalidates tokens

### Organization Isolation
- **Data Segregation**: Strict organization-based data access
- **Permission Boundaries**: Users can only access their organization's data
- **Cross-Organization Prevention**: API-level checks prevent data leakage

### Input Validation
```typescript
// Zod schemas for validation
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required')
});
```

## 📋 Remaining Tasks

### High Priority
| Task | Complexity | Estimate | Status |
|------|------------|----------|--------|
| Implement 2FA (TOTP) | Medium | 3 days | 🔄 In Progress |
| Add SMS 2FA option | Medium | 2 days | 📋 Planned |
| Social login integration | High | 5 days | 📋 Planned |
| Session timeout handling | Low | 1 day | 📋 Planned |

### Medium Priority
| Task | Complexity | Estimate | Status |
|------|------------|----------|--------|
| Advanced password policies | Medium | 2 days | 📋 Planned |
| Login attempt rate limiting | Low | 1 day | 📋 Planned |
| Device management | High | 4 days | 📋 Planned |
| Audit logging enhancement | Medium | 2 days | 📋 Planned |

### Low Priority
| Task | Complexity | Estimate | Status |
|------|------------|----------|--------|
| Biometric authentication | High | 6 days | 📋 Future |
| SSO integration | High | 8 days | 📋 Future |
| Advanced session analytics | Medium | 3 days | 📋 Future |

## 🧪 Testing

### Test Coverage
- **Unit Tests**: 95% coverage for auth utilities
- **Integration Tests**: 90% coverage for API endpoints
- **E2E Tests**: 80% coverage for user flows

### Test Examples
```typescript
// Unit test example
describe('AuthService', () => {
  describe('validatePassword', () => {
    it('should accept valid password', () => {
      const result = AuthService.validatePassword('SecurePass123');
      expect(result.isValid).toBe(true);
    });
    
    it('should reject weak password', () => {
      const result = AuthService.validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password too short');
    });
  });
});

// Integration test example
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123'
      });
      
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });
});
```

## 📊 Performance Metrics

### Current Performance
- **Login Time**: ~200ms average
- **Token Validation**: ~50ms average
- **Permission Check**: ~10ms average
- **Organization Switch**: ~300ms average

### Optimization Opportunities
- **Permission Caching**: Cache user permissions in Redis
- **Token Optimization**: Reduce token payload size
- **Database Indexing**: Optimize user lookup queries

---

## 🔗 Related Documentation

- [Organization Management](./organizations.md)
- [Permission System](./permissions.md)
- [Security Guide](../technical/security-guide.md)
- [API Reference](../technical/api-reference.md)