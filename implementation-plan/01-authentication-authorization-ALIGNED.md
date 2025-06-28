# Authentication & Authorization - Alignment and Enhancement Plan

## 1. Current State Analysis

### Existing Authentication Infrastructure
The platform already has a comprehensive authentication system in place:

#### Frontend Components
- **Login Page** ([`src/pages/login.tsx`](../src/pages/login.tsx)):
  - Fully functional login form with email/password fields
  - Auto-login capability for development
  - Integration with Redux auth slice
  - Organization selection and management
  - Error handling and toast notifications

- **Protected Route Component** ([`src/components/auth/ProtectedRoute.tsx`](../src/components/auth/ProtectedRoute.tsx)):
  - Route protection based on authentication state
  - Redirect logic for unauthenticated users
  - Platform state awareness (initial setup vs normal operation)

#### API Layer
- **Auth Service** ([`src/services/api/auth.ts`](../src/services/api/auth.ts)):
  - `login()` method that calls `customUserLogin` cloud function
  - `getUserOrgs()` method for fetching user organizations
  - Parse SDK initialization and session management
  - Comprehensive error handling

#### Backend Cloud Functions
- **customUserLogin Function** ([`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js)):
  - Complete user authentication with Parse.User.logIn
  - Organization membership validation
  - Role-based permission assignment
  - System admin detection and handling
  - Last login tracking
  - Session token generation
  - Comprehensive user data return including permissions

- **Helper Functions**:
  - `requireSystemAdmin()` - System admin permission checking
  - `requireOrgAdminOrSystemAdmin()` - Organization admin validation
  - Middleware integration with validation schemas

#### Redux State Management
- **Auth Slice** (referenced in login.tsx):
  - `loginStart`, `loginSuccess`, `loginFailed` actions
  - User state management
  - Permission storage
  - Organization context

### What's Working Well
1. ✅ Basic authentication flow (login/logout)
2. ✅ Parse Server integration
3. ✅ Session token management
4. ✅ Organization context handling
5. ✅ Basic permission structure
6. ✅ System admin vs regular user differentiation
7. ✅ Protected routes
8. ✅ Redux state management

### Critical Gaps to Address
1. ❌ No password reset functionality
2. ❌ No email verification flow
3. ❌ No registration/signup flow
4. ❌ No multi-factor authentication (2FA)
5. ❌ Limited permission validation hooks
6. ❌ No rate limiting on authentication endpoints
7. ❌ No comprehensive audit logging
8. ❌ No session timeout handling
9. ❌ No token refresh mechanism
10. ❌ Incomplete permission enforcement middleware

## 2. Enhancement Plan

### Phase 1: Complete Core Authentication Features (8 days)

#### Task 1.1: Add Password Reset Flow (2 days)
**Enhance existing infrastructure** to support password reset:

**Backend Enhancements**:
- Add to [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js):
  ```javascript
  // Add after customUserLogin function
  defineFunction("requestPasswordReset", [
    withValidation({ email: { type: 'string', required: true, format: 'email' } })
  ], async (request) => {
    const { email } = request.params;
    
    try {
      await Parse.User.requestPasswordReset(email);
      
      // Log password reset request
      await logSecurityEvent('password_reset_requested', {
        email,
        ip: request.ip,
        timestamp: new Date()
      });
      
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw new Parse.Error(Parse.Error.OTHER_CAUSE, 'Failed to process password reset');
    }
  });
  ```

**Frontend Enhancements**:
- Create `src/pages/reset-password.tsx` using existing UI components
- Add "Forgot password?" link functionality in [`src/pages/login.tsx`](../src/pages/login.tsx) (currently just a placeholder)
- Add password reset method to [`src/services/api/auth.ts`](../src/services/api/auth.ts)

#### Task 1.2: Implement Email Verification (2 days)
**Enhance existing user creation** to include email verification:

**Backend Enhancements**:
- Modify user creation in existing cloud functions to set `emailVerified: false`
- Add email verification endpoint to [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js)
- Integrate with existing email service (if configured)

**Frontend Enhancements**:
- Create `src/pages/verify-email.tsx` page
- Add email verification status to user profile
- Show verification prompts for unverified users

#### Task 1.3: Add Registration Flow (2 days)
**Build upon existing authentication** to add user registration:

**Backend Enhancements**:
- Add to [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js):
  ```javascript
  defineFunction("registerUser", [
    withValidation({
      email: { type: 'string', required: true, format: 'email' },
      password: { type: 'string', required: true, minLength: 8 },
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
      organizationId: { type: 'string', required: false }
    })
  ], async (request) => {
    // Implementation that creates user and assigns to organization
    // Reuse existing organization assignment logic from customUserLogin
  });
  ```

**Frontend Enhancements**:
- Create `src/pages/register.tsx` using existing UI components
- Add registration link to login page ("Request access" link exists but goes nowhere)
- Add registration method to [`src/services/api/auth.ts`](../src/services/api/auth.ts)

#### Task 1.4: Enhance Permission Validation Hooks (2 days)
**Build upon the existing** [`src/hooks/usePermission.ts`](../src/hooks/usePermission.ts) stub:

```typescript
// Enhance the existing usePermission.ts file
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export const usePermission = (permission: string) => {
  const { permissions } = useSelector((state: RootState) => state.auth);
  return permissions?.includes(permission) || false;
};

export const useSystemAdmin = () => {
  const { isAdmin } = useSelector((state: RootState) => state.auth);
  return isAdmin || false;
};

export const useOrgPermission = (permission: string) => {
  const { permissions, currentOrganization } = useSelector((state: RootState) => state.auth);
  if (!currentOrganization) return false;
  
  // Check for org-specific permission format
  const orgPermission = `org:${currentOrganization.id}:${permission}`;
  return permissions?.includes(permission) || permissions?.includes(orgPermission) || false;
};
```

### Phase 2: Security Enhancements (6 days)

#### Task 2.1: Add Rate Limiting (2 days)
**Enhance existing** authentication endpoints with rate limiting:

**Backend Enhancements**:
- Add rate limiting middleware to Parse Server configuration
- Enhance [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js) with rate limit checks:
  ```javascript
  const rateLimiter = require('../middleware/rateLimiter');
  
  // Apply to customUserLogin
  defineFunction("customUserLogin", [
    rateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 }), // 5 attempts per 15 minutes
    withValidation(loginSchema)
  ], customUserLoginHandler);
  ```

#### Task 2.2: Implement Audit Logging (2 days)
**Enhance existing** authentication functions with comprehensive audit logging:

**Backend Enhancements**:
- Create `parse-server/src/cloud/audit/authAudit.js`:
  ```javascript
  const logAuthEvent = async (eventType, user, metadata) => {
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('eventType', eventType);
    log.set('userId', user?.id);
    log.set('userEmail', user?.get('email'));
    log.set('organizationId', metadata.organizationId);
    log.set('ipAddress', metadata.ip);
    log.set('userAgent', metadata.userAgent);
    log.set('timestamp', new Date());
    log.set('metadata', metadata);
    
    await log.save(null, { useMasterKey: true });
  };
  ```

- Integrate into existing [`customUserLogin`](../parse-server/src/cloud/auth.js) function

#### Task 2.3: Add Session Management (2 days)
**Enhance existing** session handling with timeout and refresh:

**Backend Enhancements**:
- Add session refresh function to [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js)
- Configure Parse Server session length

**Frontend Enhancements**:
- Create `src/utils/sessionManager.ts` to handle:
  - Activity tracking
  - Session timeout warnings
  - Automatic token refresh
  - Integration with existing Redux auth slice

### Phase 3: Advanced Features (6 days)

#### Task 3.1: Implement 2FA Support (4 days)
**Enhance existing** authentication with optional 2FA:

**Backend Enhancements**:
- Add 2FA fields to User class
- Create 2FA setup and verification functions
- Modify [`customUserLogin`](../parse-server/src/cloud/auth.js) to check for 2FA

**Frontend Enhancements**:
- Create 2FA setup flow in user settings
- Add 2FA verification step to login flow
- QR code generation for authenticator apps

#### Task 3.2: Complete Organization Management (2 days)
**Enhance existing** organization handling:

**Backend Enhancements**:
- Add organization switching function
- Enhance permission calculation based on organization context
- Add organization invitation system

**Frontend Enhancements**:
- Add organization switcher to header
- Create organization management pages
- Add invitation acceptance flow

## 3. Testing Requirements

### Unit Tests
- Test existing `customUserLogin` function with various scenarios
- Test new password reset functionality
- Test permission validation logic
- Test rate limiting

### Integration Tests
- Full authentication flow testing
- Organization switching tests
- Permission enforcement tests
- Session management tests

### Security Tests
- Penetration testing on authentication endpoints
- Session hijacking prevention
- Rate limiting effectiveness
- Permission bypass attempts

## 4. Migration Considerations

### Data Migration
- No migration needed for existing users
- Add default values for new fields (emailVerified, 2faEnabled)
- Ensure backward compatibility

### API Compatibility
- All enhancements maintain compatibility with existing API
- New endpoints follow existing patterns
- No breaking changes to existing functionality

## 5. Success Metrics

- Zero authentication-related security incidents
- < 0.1% failed login rate due to system errors
- < 2 second average login time
- 100% of users can reset passwords successfully
- 95%+ email verification rate

## 6. Dependencies

### Existing Code Dependencies
- [`src/pages/login.tsx`](../src/pages/login.tsx) - Main login page
- [`src/services/api/auth.ts`](../src/services/api/auth.ts) - Auth API service
- [`parse-server/src/cloud/auth.js`](../parse-server/src/cloud/auth.js) - Core auth functions
- [`src/store/slices/authSlice.ts`](../src/store/slices/authSlice.ts) - Redux auth state
- [`src/components/auth/ProtectedRoute.tsx`](../src/components/auth/ProtectedRoute.tsx) - Route protection

### External Dependencies
- Parse Server (already integrated)
- Email service (for password reset and verification)
- 2FA library (speakeasy or similar)

## 7. Risk Mitigation

- **Risk**: Breaking existing authentication
  - **Mitigation**: All changes are additive, no modifications to existing working code
  
- **Risk**: Performance impact from new features
  - **Mitigation**: Implement caching, optimize database queries
  
- **Risk**: Security vulnerabilities
  - **Mitigation**: Follow OWASP guidelines, security testing, code reviews