# UML Diagrams for Token Nexus Platform Standards

This directory contains comprehensive UML diagrams generated from the `standards-and-conventions` documents. These diagrams provide visual representations of the Token Nexus Platform's architecture, security models, and operational workflows for both system-level and organization-centric pages.

## Overview

The Token Nexus Platform implements a multi-layered architecture with two primary page types:
- **System-Level Pages**: Platform-wide administrative functionality with highest security
- **Organization-Centric Pages**: Organization-scoped functionality with multi-tenant isolation

## System-Level Pages Diagrams

### 1. System-Level Class Diagram (`01-system-level-pages-class-diagram.puml`)

**Purpose**: Shows the static structure of classes, interfaces, and their relationships in the system-level pages architecture.

**Key Components**:
- **Security Layer**: [`SystemUser`](../src/types/SystemUser.ts), [`SystemPageContext`](../src/types/SystemPageContext.ts), [`SystemPermission`](../src/types/SystemPermission.ts)
- **Controller Layer**: [`BaseSystemController`](../src/controllers/base/BaseSystemController.ts), [`SystemUsersPageController`](../src/controllers/SystemUsersPageController.ts)
- **Action System**: [`SystemActionDefinition`](../src/types/SystemActionDefinition.ts), [`SystemActionContext`](../src/types/SystemActionContext.ts), [`SystemActionResult`](../src/types/SystemActionResult.ts)
- **Data Layer**: [`SystemDataService`](../src/services/SystemDataService.ts), [`SystemMetrics`](../src/types/SystemMetrics.ts)
- **Audit System**: [`SystemAuditLog`](../src/types/SystemAuditLog.ts), [`AuditService`](../src/services/AuditService.ts)

### 2. System-Level Sequence Diagram (`01-system-level-pages-sequence-diagram.puml`)

**Purpose**: Illustrates the interaction flow between components during system-level page operations.

**Key Flows**:
- **Authentication & Authorization**: Multi-factor authentication and permission validation
- **Data Loading**: Cross-organizational data retrieval with security checks
- **User Actions**: System operations like user suspension with comprehensive auditing
- **Export Operations**: Secure data export with audit logging
- **Real-time Monitoring**: Health monitoring and security event handling

### 3. System-Level Component Diagram (`01-system-level-pages-component-diagram.puml`)

**Purpose**: Shows the high-level architecture and component relationships within security boundaries.

**Architecture Layers**:
- **Frontend Layer**: System admin interface with security validation
- **Controller Layer**: System page controllers with action management
- **Security Layer**: Authentication, MFA, permissions, and session management
- **Platform Services**: Cross-org data access and system health monitoring
- **Audit & Compliance**: Comprehensive logging and security event monitoring
- **AI Integration**: AI assistant with system-level actions

### 4. System-Level State Diagram (`01-system-level-pages-state-diagram.puml`)

**Purpose**: Represents the various states and transitions in system page lifecycle and security validation.

**State Categories**:
- **Page Access States**: Authentication, MFA verification, session validation
- **System Page States**: Controller initialization, data loading, active operations
- **Security States**: Session management, security alerts, lockout procedures
- **Action States**: Permission validation, audit logging, result processing

### 5. System-Level Activity Diagram (`01-system-level-pages-activity-diagram.puml`)

**Purpose**: Shows the workflow and decision points in system-level page operations.

**Activity Flows**:
- **Security Validation**: Multi-layered security checks with MFA
- **Controller Initialization**: System controller setup and action registration
- **Data Operations**: Cross-organizational queries with security filtering
- **Action Processing**: Comprehensive validation, execution, and auditing
- **Monitoring Activities**: Real-time health and security monitoring

### 6. System-Level Use Case Diagram (`01-system-level-pages-use-case-diagram.puml`)

**Purpose**: Identifies actors and their interactions with system-level functionality.

**Actor Hierarchy**:
- **System Administrator**: Full platform access with all permissions
- **Platform Monitor**: System health and performance monitoring
- **Security Admin**: Security event monitoring and access control
- **User Manager**: User administration across organizations
- **Organization Manager**: Organization-level administration

## Organization-Centric Pages Diagrams

### 1. Organization-Centric Class Diagram (`02-organization-centric-pages-class-diagram.puml`)

**Purpose**: Shows the static structure for organization-scoped page architecture with multi-tenant isolation.

**Key Components**:
- **Organization Context Layer**: [`Organization`](../src/types/Organization.ts), [`OrganizationContext`](../src/contexts/OrganizationContext.ts), [`OrganizationMember`](../src/types/OrganizationMember.ts)
- **Permission System**: [`PermissionManager`](../src/services/PermissionManager.ts), [`OrganizationPermission`](../src/types/OrganizationPermission.ts), [`PermissionContext`](../src/contexts/PermissionContext.ts)
- **Controller Layer**: [`BasePageController`](../src/controllers/base/BasePageController.ts), [`OrganizationUsersPageController`](../src/controllers/OrganizationUsersPageController.ts)
- **Data Management**: [`OrganizationDataService`](../src/services/OrganizationDataService.ts), [`ApiService`](../src/services/ApiService.ts), [`ReduxState`](../src/store/types.ts)
- **Component Layer**: [`OrganizationUsersPage`](../src/components/pages/OrganizationUsersPage.tsx), [`UserTable`](../src/components/UserTable.tsx)

### 2. Organization-Centric Sequence Diagram (`02-organization-centric-pages-sequence-diagram.puml`)

**Purpose**: Illustrates the interaction flow for organization-scoped operations with proper isolation.

**Key Flows**:
- **Page Initialization**: Organization context validation and permission checking
- **Data Loading**: Organization-scoped data retrieval with ACL filtering
- **User Invitation**: Multi-step invitation process with email notifications
- **Role Management**: Permission-based role assignment and updates
- **User Removal**: Secure user removal with confirmation and audit logging

### 3. Organization-Centric Component Diagram (`02-organization-centric-pages-component-diagram.puml`)

**Purpose**: Shows the component architecture for organization-scoped functionality.

**Architecture Layers**:
- **Frontend Layer**: Organization pages with context-aware components
- **Hook Layer**: React hooks for organization, permissions, and page controllers
- **Controller Layer**: Organization-scoped controllers with action management
- **Organization Context**: Multi-tenant context management and validation
- **Permission System**: Role-based access control with ACL enforcement
- **Data Management**: Organization-scoped data services with caching

### 4. Organization-Centric State Diagram (`02-organization-centric-pages-state-diagram.puml`)

**Purpose**: Represents state management for organization-scoped pages with context switching.

**State Categories**:
- **Page Initialization**: Organization context loading and validation
- **Permission States**: Role-based access control and validation
- **Data Management States**: CRUD operations with organization scoping
- **Context Change States**: Organization switching and permission updates

### 5. Organization-Centric Activity Diagram (`02-organization-centric-pages-activity-diagram.puml`)

**Purpose**: Shows the workflow for organization-scoped operations with proper isolation.

**Activity Flows**:
- **Organization Validation**: Multi-layered organization context checks
- **Permission Enforcement**: Role-based access control at every level
- **Data Operations**: Organization-scoped CRUD with audit logging
- **Bulk Operations**: Batch processing with organization isolation
- **Real-time Monitoring**: Organization context and permission changes

### 6. Organization-Centric Use Case Diagram (`02-organization-centric-pages-use-case-diagram.puml`)

**Purpose**: Identifies actors and their interactions within organization-scoped functionality.

**Actor Hierarchy**:
- **Organization Admin**: Full organization access and management
- **User Manager**: User administration within organization
- **Organization Member**: Basic organization functionality access
- **Developer**: Development-focused organization features
- **Viewer**: Read-only access to organization data

## Key Architecture Principles

### System-Level Pages
1. **Security-First Design**: Multi-factor authentication and comprehensive auditing
2. **Cross-Organization Access**: Secure access to data across all organizations
3. **Real-Time Monitoring**: Continuous platform health and security monitoring
4. **AI Integration**: Natural language interface for system operations

### Organization-Centric Pages
1. **Multi-Tenant Isolation**: Strict organization-scoped data access
2. **Permission-Based Access**: Role-based access control at every level
3. **Context Management**: Automatic organization context validation
4. **Responsive Design**: Mobile-first design with accessibility compliance

## Implementation Guidelines

### Security Requirements
1. **System Pages**: MFA required, system admin privileges, comprehensive audit logging
2. **Organization Pages**: Organization membership required, role-based permissions, organization-scoped operations

### Component Structure
1. **System Pages**: Enhanced security validation, cross-org context management, real-time monitoring
2. **Organization Pages**: Organization context validation, permission-based rendering, responsive design

### Data Access Patterns
1. **System Pages**: Cross-organizational queries with security filtering
2. **Organization Pages**: Organization-scoped queries with ACL enforcement

## Usage Instructions

### Viewing Diagrams
These PlantUML diagrams can be viewed using:
- **PlantUML Online**: Copy the content to [plantuml.com](http://www.plantuml.com/plantuml/uml/)
- **VS Code Extension**: Install the PlantUML extension for VS Code
- **Command Line**: Use PlantUML CLI to generate images
- **IDE Integration**: Most IDEs support PlantUML preview

### Generating Images
```bash
# Install PlantUML
npm install -g plantuml

# Generate all diagrams as PNG
plantuml -tpng uml-diagrams/*.puml

# Generate all diagrams as SVG
plantuml -tsvg uml-diagrams/*.puml

# Generate specific diagram type
plantuml -tpng uml-diagrams/01-*.puml  # System-level diagrams
plantuml -tpng uml-diagrams/02-*.puml  # Organization-centric diagrams
```

### Integration with Documentation
These diagrams are designed to complement the technical documentation and can be embedded in:
- Architecture documentation
- Developer onboarding materials
- Security compliance reports
- System design reviews

## Related Documents

### System-Level Pages
- [`standards-and-conventions/01-system-level-pages.md`](../standards-and-conventions/01-system-level-pages.md) - Source specification
- [`src/controllers/base/BaseSystemController.ts`](../src/controllers/base/BaseSystemController.ts) - Base system controller
- [`src/types/systemActionDefinitions.ts`](../src/types/systemActionDefinitions.ts) - System action types
- [`src/services/SystemDataService.ts`](../src/services/SystemDataService.ts) - System data service

### Organization-Centric Pages
- [`standards-and-conventions/02-organization-centric-pages.md`](../standards-and-conventions/02-organization-centric-pages.md) - Source specification
- [`src/controllers/base/BasePageController.ts`](../src/controllers/base/BasePageController.ts) - Base page controller
- [`src/hooks/usePageController.ts`](../src/hooks/usePageController.ts) - Page controller hook
- [`src/hooks/useOrganization.ts`](../src/hooks/useOrganization.ts) - Organization context hook
- [`src/hooks/usePermission.ts`](../src/hooks/usePermission.ts) - Permission management hook

## Maintenance

These diagrams should be updated when:
- Page architecture patterns change
- New security requirements are added
- Permission systems are modified
- Organization context management evolves
- AI integration capabilities expand
- Multi-tenant isolation patterns change

## Diagram Summary

| Diagram Type | System-Level | Organization-Centric | Purpose |
|--------------|--------------|---------------------|---------|
| **Class** | ✅ | ✅ | Static structure and relationships |
| **Sequence** | ✅ | ✅ | Interaction flows and message passing |
| **Component** | ✅ | ✅ | High-level architecture and boundaries |
| **State** | ✅ | ✅ | State management and transitions |
| **Activity** | ✅ | ✅ | Workflow and decision points |
| **Use Case** | ✅ | ✅ | Actor interactions and functionality |

**Total Diagrams**: 12 (6 for each page type)

Last Updated: 2025-06-26
Generated From: 
- `standards-and-conventions/01-system-level-pages.md`
- `standards-and-conventions/02-organization-centric-pages.md`