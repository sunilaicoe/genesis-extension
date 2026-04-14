import { DOCUMENT_TYPES } from '../api/genesisApi';

export interface LocalDocument {
    type: string;
    title: string;
    content: string;
    html: string;
    json: object;
}

/**
 * Generates SDLC documents locally from templates based on user's transcript.
 */
export class LocalDocumentGenerator {

    /**
     * Generate a single document of the given type from the transcript.
     */
    static generate(type: string, transcript: string, workflowName: string, productName: string): LocalDocument {
        const docInfo = DOCUMENT_TYPES.find(d => d.type === type);
        const title = docInfo?.title || type;

        let content = '';

        switch (type) {
            case 'vision': content = this.generateVision(transcript, workflowName, productName); break;
            case 'personas': content = this.generatePersonas(transcript, workflowName, productName); break;
            case 'useCases': content = this.generateUseCases(transcript, workflowName, productName); break;
            case 'roadmap': content = this.generateRoadmap(transcript, workflowName, productName); break;
            case 'gtm': content = this.generateGTM(transcript, workflowName, productName); break;
            case 'uiFlows': content = this.generateUIFlows(transcript, workflowName, productName); break;
            case 'syntheticData': content = this.generateSyntheticData(transcript, workflowName, productName); break;
            case 'prd': content = this.generatePRD(transcript, workflowName, productName); break;
            case 'techArchitecture': content = this.generateTechArchitecture(transcript, workflowName, productName); break;
            case 'databaseDesign': content = this.generateDatabaseDesign(transcript, workflowName, productName); break;
            case 'apiDesign': content = this.generateAPIDesign(transcript, workflowName, productName); break;
            case 'securitySpec': content = this.generateSecuritySpec(transcript, workflowName, productName); break;
            case 'devops': content = this.generateDevOps(transcript, workflowName, productName); break;
            case 'testingStrategy': content = this.generateTestingStrategy(transcript, workflowName, productName); break;
            case 'mockup': content = this.generateMockup(transcript, workflowName, productName); break;
            case 'styleGuide': content = this.generateStyleGuide(transcript, workflowName, productName); break;
            case 'brd': content = this.generateBRD(transcript, workflowName, productName); break;
            case 'functionalRequirements': content = this.generateFunctionalRequirements(transcript, workflowName, productName); break;
            case 'bom': content = this.generateBOM(transcript, workflowName, productName); break;
            case 'implementationPlan': content = this.generateImplementationPlan(transcript, workflowName, productName); break;
            default: content = `# ${title}\n\nGenerated from project requirements.\n\n${transcript}`;
        }

        const json = this.toJson(type, title, content, workflowName, productName);
        const html = this.toHtml(title, content, productName);

        return { type, title, content, html, json };
    }

    private static extractKeywords(transcript: string): string[] {
        const words = transcript.toLowerCase().split(/\s+/);
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'about', 'it', 'its', 'i', 'we', 'our', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'if', 'then', 'up', 'want', 'need', 'like', 'also', 'use', 'user', 'app', 'system']);
        return [...new Set(words.filter(w => w.length > 3 && !stopWords.has(w)))].slice(0, 20);
    }

    private static generateSummary(transcript: string): string {
        const sentences = transcript.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 20);
        return sentences.slice(0, 3).join('. ') + '.';
    }

    // ─── DOCUMENT GENERATORS ──────────────────────────────────────────────

    private static generateVision(t: string, wf: string, prod: string): string {
        return `# Vision & Strategy — ${prod}

## Executive Summary
${this.generateSummary(t)}

## Project Overview
${prod} is designed to address the core needs identified in the project requirements. The system will deliver a comprehensive solution that balances user experience, technical excellence, and business value.

## Vision Statement
To create a best-in-class ${prod.toLowerCase()} platform that empowers users with intuitive tools, seamless workflows, and data-driven insights.

## Strategic Goals

### Primary Goals
1. **User-Centric Design** — Deliver an intuitive, accessible interface that minimizes learning curve
2. **Scalable Architecture** — Build on a foundation that supports 10x growth without refactoring
3. **Data-Driven Decisions** — Embed analytics and reporting into every workflow
4. **Security First** — Implement security best practices from day one
5. **Rapid Iteration** — Enable continuous delivery with automated CI/CD pipelines

### Secondary Goals
- Establish a strong brand identity and consistent design language
- Build an API-first platform to enable integrations and partnerships
- Implement comprehensive testing at all levels (unit, integration, E2E)
- Create thorough documentation for developers and end-users

## Market Positioning
${prod} will position itself as a modern, cloud-native solution that prioritizes user experience and developer productivity.

### Key Differentiators
- **Speed**: Sub-second response times for critical user actions
- **Reliability**: 99.9% uptime SLA with graceful degradation
- **Flexibility**: Plugin/extension architecture for customization
- **Transparency**: Real-time status, audit trails, and comprehensive logging

## Success Metrics
| Metric | Target | Timeframe |
|--------|--------|-----------|
| User Adoption | 1,000+ active users | 3 months |
| User Satisfaction (NPS) | 50+ | 6 months |
| System Uptime | 99.9% | Ongoing |
| Page Load Time | < 2 seconds | Launch |
| API Response Time | < 200ms p95 | Ongoing |

## Risk Assessment
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | High | High | Strict MVP definition and phased delivery |
| Technical debt | Medium | Medium | Code review standards and refactoring sprints |
| Performance issues | High | Low | Early performance testing and monitoring |
| Security vulnerabilities | High | Low | Security audits and automated scanning |

## Stakeholder Alignment
- **Product Team**: Feature prioritization and roadmap ownership
- **Engineering**: Technical architecture and implementation
- **Design**: User experience and brand consistency
- **Operations**: Infrastructure, monitoring, and support

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generatePersonas(t: string, wf: string, prod: string): string {
        return `# User Personas — ${prod}

## Overview
This document defines the key user personas for ${prod}, derived from the project requirements and target audience analysis.

## Primary Personas

### Persona 1: Sarah — The Power User
- **Role**: Senior Manager / Team Lead
- **Age**: 30-40
- **Technical Proficiency**: High
- **Goals**:
  - Efficiently manage team workflows and assignments
  - Access real-time analytics and performance dashboards
  - Automate repetitive tasks and reporting
- **Pain Points**:
  - Current tools are fragmented and require manual data entry
  - Lack of visibility into team progress and bottlenecks
  - Difficulty generating reports for stakeholders
- **Key Scenarios**: Daily dashboard review, weekly report generation, team resource allocation

### Persona 2: James — The End User
- **Role**: Individual Contributor
- **Age**: 25-35
- **Technical Proficiency**: Medium
- **Goals**:
  - Complete tasks quickly with minimal friction
  - Receive timely notifications and updates
  - Access self-service help and documentation
- **Pain Points**:
  - Too many clicks to complete simple tasks
  - Unclear error messages and lack of guidance
  - Mobile experience is limited
- **Key Scenarios**: Task completion, notification management, profile/settings updates

### Persona 3: Priya — The Administrator
- **Role**: System Administrator / IT
- **Age**: 28-45
- **Technical Proficiency**: Very High
- **Goals**:
  - Configure and customize the platform for their organization
  - Manage users, roles, and permissions efficiently
  - Monitor system health and troubleshoot issues
- **Pain Points**:
  - Complex configuration processes
  - Limited audit logging and compliance features
  - Difficulty integrating with existing enterprise tools
- **Key Scenarios**: User provisioning, security configuration, integration setup, audit log review

### Persona 4: Alex — The Executive
- **Role**: C-Suite / VP / Director
- **Age**: 35-55
- **Technical Proficiency**: Low-Medium
- **Goals**:
  - Quick access to high-level KPIs and summaries
  - Make data-driven strategic decisions
  - Minimal time investment for maximum insight
- **Pain Points**:
  - Reports are too detailed and hard to interpret
  - Data is stale or not real-time
  - Cannot access insights on mobile devices
- **Key Scenarios**: Monthly review, board presentation prep, quick status check on mobile

## Persona Matrix

| Persona | Frequency | Complexity | Platform | Data Access |
|---------|-----------|------------|----------|-------------|
| Sarah (Power User) | Daily | High | Desktop + Mobile | Full team data |
| James (End User) | Daily | Low-Med | Desktop + Mobile | Own data only |
| Priya (Admin) | Weekly | Very High | Desktop | System-wide |
| Alex (Executive) | Weekly | Low | Mobile-first | Aggregated |

## Design Implications
1. **Navigation**: Role-based sidebar with quick actions
2. **Dashboard**: Customizable widgets per persona
3. **Mobile**: Responsive design with touch-optimized controls
4. **Notifications**: Configurable per user preference and role
5. **Search**: Global search with role-filtered results

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateUseCases(t: string, wf: string, prod: string): string {
        const kw = this.extractKeywords(t);
        return `# Strategic Use Cases — ${prod}

## Overview
This document outlines the key use cases for ${prod}, organized by user persona and business priority.

## Core Use Cases

### UC-001: User Authentication & Onboarding
- **Actor**: New User (All personas)
- **Priority**: P0 (Critical)
- **Description**: Users can sign up, verify their email, and complete a guided onboarding flow
- **Preconditions**: User has access to email
- **Main Flow**:
  1. User navigates to registration page
  2. User enters email and password
  3. System sends verification email
  4. User clicks verification link
  5. System presents onboarding wizard
  6. User completes profile and preferences
- **Postconditions**: User account is active and personalized

### UC-002: Dashboard & Analytics View
- **Actor**: Sarah (Power User), Alex (Executive)
- **Priority**: P0 (Critical)
- **Description**: Users view a customizable dashboard with KPIs, charts, and real-time data
- **Main Flow**:
  1. User logs in and sees default dashboard
  2. Dashboard loads personalized widgets based on role
  3. User can add, remove, resize, and rearrange widgets
  4. Data refreshes in real-time or on configurable intervals
- **Business Rules**:
  - Executives see aggregated, high-level metrics
  - Power users see team-level detail with drill-down
  - All data respects role-based access controls

### UC-003: Data Management & CRUD Operations
- **Actor**: James (End User), Sarah (Power User)
- **Priority**: P0 (Critical)
- **Description**: Users can create, read, update, and delete records relevant to ${kw[0] || 'their workflow'}
- **Main Flow**:
  1. User navigates to data section
  2. User views list/table with search and filters
  3. User can create new records via form
  4. User can edit existing records inline or via modal
  5. User can delete records with confirmation
- **Validation Rules**:
  - Required fields are enforced
  - Duplicate detection on key fields
  - Soft delete with audit trail

### UC-004: Search & Filtering
- **Actor**: All Users
- **Priority**: P1 (High)
- **Description**: Global search with role-filtered results and advanced filtering
- **Main Flow**:
  1. User types in global search bar
  2. System shows instant results grouped by type
  3. User can apply advanced filters (date, status, category)
  4. Results update in real-time as filters change
- **Performance Target**: Search results within 300ms

### UC-005: Notification System
- **Actor**: All Users
- **Priority**: P1 (High)
- **Description**: Users receive in-app, email, and push notifications based on configurable preferences
- **Notification Types**: Task assignment, status change, mention, deadline reminder, system alert
- **Delivery Channels**: In-app bell icon, email digest, push notification (mobile)
- **Preferences**: Users configure frequency and channels per notification type

### UC-006: Reporting & Export
- **Actor**: Sarah (Power User), Alex (Executive)
- **Priority**: P1 (High)
- **Description**: Generate and export reports in multiple formats (PDF, Excel, CSV)
- **Main Flow**:
  1. User selects report type and date range
  2. System generates report with charts and data tables
  3. User can preview, schedule, or export report
- **Report Types**: Summary, Detailed, Trend Analysis, Comparison

### UC-007: User & Role Management
- **Actor**: Priya (Administrator)
- **Priority**: P0 (Critical)
- **Description**: Admin can manage users, assign roles, and configure permissions
- **Main Flow**:
  1. Admin views user list with status and role info
  2. Admin can invite new users via email
  3. Admin can modify roles and permissions
  4. Admin can deactivate/suspend users
- **Security**: All admin actions are logged in audit trail

### UC-008: Integration & API Access
- **Actor**: Priya (Administrator)
- **Priority**: P2 (Medium)
- **Description**: Connect ${prod} with third-party tools via API or pre-built integrations
- **Integration Types**: Webhook, REST API, OAuth 2.0, SSO/SAML
- **Supported Platforms**: Slack, Jira, Salesforce, Zapier

## Use Case Priority Matrix

| Use Case | Priority | Complexity | Sprint |
|----------|----------|------------|--------|
| UC-001: Authentication | P0 | Medium | 1 |
| UC-002: Dashboard | P0 | High | 1-2 |
| UC-003: Data Management | P0 | High | 2-3 |
| UC-004: Search | P1 | Medium | 3 |
| UC-005: Notifications | P1 | Medium | 3-4 |
| UC-006: Reporting | P1 | High | 4-5 |
| UC-007: User Management | P0 | Medium | 2 |
| UC-008: Integrations | P2 | High | 6+ |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateRoadmap(t: string, wf: string, prod: string): string {
        return `# Product Roadmap — ${prod}

## Vision
Deliver ${prod} in iterative phases, starting with core functionality and expanding based on user feedback and analytics.

## Roadmap Timeline

### Phase 1: Foundation (Weeks 1-4)
**Theme**: Core Infrastructure & Authentication
- [ ] Project scaffolding and development environment setup
- [ ] Authentication system (signup, login, password reset)
- [ ] User model and role-based access control
- [ ] Database schema v1 (core entities)
- [ ] CI/CD pipeline setup
- [ ] Basic UI shell and navigation

**Milestone**: Users can sign up, log in, and see an empty dashboard

### Phase 2: Core Features (Weeks 5-8)
**Theme**: Primary Workflows & Data Management
- [ ] CRUD operations for core entities
- [ ] List views with search, sort, and pagination
- [ ] Form validation and error handling
- [ ] Dashboard with live widgets
- [ ] Notification system (in-app + email)
- [ ] File upload and media handling
- [ ] User profile management

**Milestone**: Core product is usable for daily tasks

### Phase 3: Polish & Collaboration (Weeks 9-12)
**Theme**: User Experience & Team Features
- [ ] Advanced filtering and saved searches
- [ ] Bulk operations and import/export (CSV, Excel)
- [ ] Real-time collaboration (WebSocket)
- [ ] Activity feed and audit logging
- [ ] Reporting engine (PDF, Excel export)
- [ ] Mobile-responsive design refinement
- [ ] Performance optimization (caching, lazy loading)

**Milestone**: Production-ready with team collaboration features

### Phase 4: Growth & Integration (Weeks 13-16)
**Theme**: Ecosystem & Scaling
- [ ] Public API with documentation (OpenAPI/Swagger)
- [ ] Webhook system for third-party integrations
- [ ] SSO/SAML integration
- [ ] Advanced analytics dashboard
- [ ] Customizable workflows and automation rules
- [ ] Plugin/extension architecture
- [ ] Multi-tenancy support

**Milestone**: Platform ready for integrations and scaling

### Phase 5: Optimization (Weeks 17-20)
**Theme**: Performance, Security & Enterprise
- [ ] Performance profiling and optimization
- [ ] Security audit and penetration testing
- [ ] Accessibility (WCAG 2.1 AA) compliance
- [ ] Internationalization (i18n) support
- [ ] Admin console enhancements
- [ ] Disaster recovery and backup automation
- [ ] Load testing and horizontal scaling

**Milestone**: Enterprise-ready, production-hardened platform

## Key Dependencies
| Dependency | Phase | Risk |
|------------|-------|------|
| Cloud infrastructure provisioning | Phase 1 | Low |
| Third-party API agreements | Phase 4 | Medium |
| Security audit scheduling | Phase 5 | Medium |
| User research & feedback loops | Ongoing | Low |

## Success Criteria
- Phase 1-2: Internal dogfooding successful
- Phase 3: Beta launch with 100+ users
- Phase 4: Public launch with 1,000+ users
- Phase 5: Enterprise customers onboarded

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateGTM(t: string, wf: string, prod: string): string {
        return `# Go-To-Market Strategy — ${prod}

## Market Analysis

### Target Market
- **Primary**: Mid-market companies (50-500 employees) needing ${prod.toLowerCase()} solutions
- **Secondary**: Enterprise organizations looking for modern alternatives
- **Tertiary**: Startups and small teams seeking scalable tools

### Market Size (TAM/SAM/SOM)
| Segment | Size | Growth Rate |
|---------|------|-------------|
| Total Addressable Market (TAM) | $5B+ | 15% CAGR |
| Serviceable Available Market (SAM) | $500M | 20% CAGR |
| Serviceable Obtainable Market (SOM) | $25M (Year 1) | 25% CAGR |

## Pricing Strategy

### Pricing Tiers
| Tier | Price | Target | Features |
|------|-------|--------|----------|
| Free | $0/mo | Individuals | Basic features, 1 user, community support |
| Starter | $29/mo | Small teams | Core features, 5 users, email support |
| Professional | $79/mo/user | Growing teams | All features, unlimited users, priority support |
| Enterprise | Custom | Large orgs | SSO, SLA, dedicated support, custom integrations |

### Pricing Principles
1. **Value-based**: Price aligned with customer ROI
2. **Transparent**: No hidden fees; clear feature matrix
3. **Flexible**: Monthly and annual billing (20% discount annual)
4. **Freemium**: Free tier drives adoption and virality

## Launch Plan

### Pre-Launch (4 weeks before)
- [ ] Beta testing with 50 users
- [ ] Collect testimonials and case studies
- [ ] Prepare demo videos and tutorials
- [ ] Build landing page with waitlist
- [ ] Set up analytics and tracking

### Launch Week
- [ ] Product Hunt launch
- [ ] Press release and media outreach
- [ ] Social media campaign (Twitter, LinkedIn, Reddit)
- [ ] Email announcement to waitlist
- [ ] Webinar / live demo event

### Post-Launch (4 weeks after)
- [ ] Customer success outreach and onboarding
- [ ] Feedback collection and rapid iteration
- [ ] Content marketing (blog posts, tutorials)
- [ ] Partnership outreach
- [ ] Paid advertising (Google Ads, LinkedIn)

## Channels

### Organic Channels
- **Content Marketing**: Blog, tutorials, case studies
- **SEO**: Target high-intent keywords
- **Community**: Discord/Slack community, GitHub
- **Social Media**: Twitter, LinkedIn, YouTube

### Paid Channels
- **Google Ads**: Search campaigns for intent keywords
- **LinkedIn**: Sponsored content and InMail
- **Retargeting**: Display ads for website visitors

### Partnership Channels
- **Technology Partners**: Integration marketplace listings
- **Agency Partners**: White-label and referral programs
- **Developer Advocacy**: API documentation and SDKs

## Key Metrics
| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Signups | 500 | 2,000 | 10,000 |
| Active Users | 200 | 800 | 4,000 |
| MRR | $5K | $25K | $100K |
| Conversion Rate | 5% | 8% | 10% |
| Churn Rate | — | < 5% | < 3% |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateUIFlows(t: string, wf: string, prod: string): string {
        return `# UI Flows & Navigation — ${prod}

## Information Architecture

### Global Navigation
\`\`\`
┌──────────────────────────────────────────────┐
│  [Logo]  Dashboard  Projects  Reports  Admin │ [Search] [🔔] [Avatar]
└──────────────────────────────────────────────┘
\`\`\`

### Sidebar Navigation (Expanded)
\`\`\`
📁 Dashboard
   └── Overview
   └── Analytics
📁 Workspace
   └── All Items
   └── My Items
   └── Shared with Me
📁 Projects
   └── Active
   └── Archived
   └── Templates
📁 Reports
   └── Generate Report
   └── Scheduled Reports
   └── Export History
⚙️ Settings
   └── Profile
   └── Notifications
   └── Integrations
   └── API Keys
\`\`\`

## Core UI Flows

### Flow 1: User Login
\`\`\`
Login Page → [Email + Password] →
  ├─ Success → Dashboard (with welcome toast)
  ├─ 2FA Required → Enter Code → Dashboard
  ├─ Invalid Credentials → Error Message → Retry
  └─ Forgot Password → Reset Email → New Password → Login
\`\`\`

### Flow 2: Creating a New Item
\`\`\`
Dashboard → [New Button] → Create Form (Modal/Page) →
  ├─ Fill Required Fields → [Validation] →
  │   ├─ Valid → Success Toast → Item Detail View
  │   └─ Invalid → Inline Error → Fix → Resubmit
  └─ Cancel → Confirmation Dialog → Dashboard
\`\`\`

### Flow 3: Search & Filter
\`\`\`
[Any Page] → [Click Search or Ctrl+K] → Search Overlay →
  ├─ Type Query → Instant Results (grouped by type) →
  │   ├─ Click Result → Item Detail
  │   └─ Press Enter → Full Search Results Page
  └─ Apply Filters → Filtered List View
\`\`\`

### Flow 4: Dashboard Customization
\`\`\`
Dashboard → [Customize Button] → Widget Picker →
  ├─ Add Widget → Configure Widget → Place on Grid
  ├─ Remove Widget → Confirm → Updated Dashboard
  └─ Rearrange → Drag & Drop → Auto-save Layout
\`\`\`

### Flow 5: Report Generation
\`\`\`
Reports → [New Report] → Report Builder →
  ├─ Select Type → Configure Parameters →
  │   ├─ Preview → Adjust → Generate
  │   └─ Schedule → Set Frequency → Save
  └─ Export → Select Format (PDF/Excel/CSV) → Download
\`\`\`

## Page Layouts

### Dashboard Layout
\`\`\`
┌─────────────────────────────────────────┐
│  Welcome, [Name]!          [Customize]  │
├─────────┬───────────┬───────────┬───────┤
│ Stat 1  │  Stat 2   │  Stat 3   │Stat 4 │
├─────────┴───────────┴───────────┴───────┤
│                                         │
│          [Main Chart Widget]            │
│                                         │
├───────────────────┬─────────────────────┤
│ [Recent Activity] │ [Quick Actions]     │
│                   │                     │
└───────────────────┴─────────────────────┘
\`\`\`

### List/Table Layout
\`\`\`
┌─────────────────────────────────────────┐
│  [Search...]  [Filters ▾]  [+ New]      │
├─────┬──────────┬─────────┬───────┬──────┤
│ [✓] │  Name    │ Status  │ Date  │ ...  │
├─────┼──────────┼─────────┼───────┼──────┤
│ [ ] │  Item 1  │ Active  │ Today │ ...  │
│ [ ] │  Item 2  │ Pending │ Yest. │ ...  │
│ [ ] │  Item 3  │ Active  │ 2d    │ ...  │
├─────┴──────────┴─────────┴───────┴──────┤
│  Showing 1-20 of 156    [< 1 2 3 ... >]│
└─────────────────────────────────────────┘
\`\`\`

## Responsive Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, hamburger menu |
| Tablet | 640-1024px | Two column, collapsible sidebar |
| Desktop | 1024-1440px | Full sidebar + main content |
| Wide | > 1440px | Extended sidebar + content + detail panel |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateSyntheticData(t: string, wf: string, prod: string): string {
        return `# Synthetic Data Schema — ${prod}

## Overview
This document defines the synthetic data schemas for development, testing, and demo purposes.

## Core Entities

### Users
\`\`\`json
{
  "users": [
    {
      "id": "usr_001",
      "email": "sarah@example.com",
      "name": "Sarah Johnson",
      "role": "admin",
      "status": "active",
      "createdAt": "2025-01-15T09:00:00Z",
      "lastLoginAt": "2025-03-20T14:30:00Z",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      "preferences": {
        "theme": "dark",
        "notifications": { "email": true, "push": true, "inApp": true },
        "language": "en"
      }
    },
    {
      "id": "usr_002",
      "email": "james@example.com",
      "name": "James Williams",
      "role": "user",
      "status": "active",
      "createdAt": "2025-02-01T10:00:00Z",
      "lastLoginAt": "2025-03-19T16:45:00Z"
    }
  ]
}
\`\`\`

### Projects
\`\`\`json
{
  "projects": [
    {
      "id": "proj_001",
      "name": "Website Redesign",
      "description": "Complete overhaul of the company website",
      "status": "active",
      "priority": "high",
      "ownerId": "usr_001",
      "teamMemberIds": ["usr_002", "usr_003"],
      "startDate": "2025-01-20",
      "endDate": "2025-06-30",
      "tags": ["design", "frontend", "priority"],
      "metadata": {
        "budget": 150000,
        "progress": 65,
        "riskLevel": "medium"
      },
      "createdAt": "2025-01-20T08:00:00Z",
      "updatedAt": "2025-03-18T11:00:00Z"
    }
  ]
}
\`\`\`

### Tasks
\`\`\`json
{
  "tasks": [
    {
      "id": "task_001",
      "projectId": "proj_001",
      "title": "Design homepage mockup",
      "description": "Create high-fidelity mockup for the new homepage",
      "status": "completed",
      "priority": "high",
      "assigneeId": "usr_002",
      "dueDate": "2025-02-15",
      "estimatedHours": 16,
      "actualHours": 14,
      "tags": ["design", "homepage"],
      "comments": [
        {
          "id": "cmt_001",
          "userId": "usr_001",
          "text": "Looks great! Let's proceed with option B.",
          "createdAt": "2025-02-14T09:30:00Z"
        }
      ]
    }
  ]
}
\`\`\`

### Notifications
\`\`\`json
{
  "notifications": [
    {
      "id": "notif_001",
      "userId": "usr_002",
      "type": "task_assigned",
      "title": "New task assigned",
      "message": "You have been assigned 'Design homepage mockup'",
      "read": false,
      "actionUrl": "/projects/proj_001/tasks/task_001",
      "createdAt": "2025-02-10T08:00:00Z"
    }
  ]
}
\`\`\`

### Audit Log
\`\`\`json
{
  "auditLogs": [
    {
      "id": "log_001",
      "userId": "usr_001",
      "action": "user.created",
      "resource": "user",
      "resourceId": "usr_002",
      "details": { "email": "james@example.com", "role": "user" },
      "ipAddress": "192.168.1.100",
      "timestamp": "2025-02-01T10:00:00Z"
    }
  ]
}
\`\`\`

## Data Volume Targets
| Entity | Dev | Staging | Demo |
|--------|-----|---------|------|
| Users | 10 | 50 | 100 |
| Projects | 5 | 20 | 50 |
| Tasks | 50 | 200 | 500 |
| Notifications | 30 | 100 | 300 |
| Audit Logs | 100 | 500 | 1,000 |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generatePRD(t: string, wf: string, prod: string): string {
        return `# Product Requirements Document — ${prod}

## Document Information
- **Product**: ${prod}
- **Version**: 1.0
- **Status**: Draft
- **Author**: Genesis AI
- **Date**: ${new Date().toLocaleDateString()}

## 1. Executive Summary
${this.generateSummary(t)}

## 2. Problem Statement
Users currently lack a unified, modern platform to manage their ${prod.toLowerCase()} workflows efficiently. Existing solutions are fragmented, lack real-time collaboration, and provide poor mobile experiences.

## 3. Product Goals
1. Provide an intuitive, modern interface that reduces task completion time by 50%
2. Enable real-time collaboration between team members
3. Deliver actionable insights through analytics and reporting
4. Maintain 99.9% uptime and sub-200ms API response times
5. Support seamless integrations with existing enterprise tools

## 4. Functional Requirements

### 4.1 Authentication & Authorization
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Email/password authentication with MFA support | P0 |
| FR-1.2 | OAuth 2.0 social login (Google, Microsoft) | P1 |
| FR-1.3 | SSO/SAML for enterprise customers | P2 |
| FR-1.4 | Role-based access control (RBAC) | P0 |
| FR-1.5 | Session management and token refresh | P0 |

### 4.2 Core Workflows
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Create, read, update, delete operations for all entities | P0 |
| FR-2.2 | Advanced search with filters and saved searches | P1 |
| FR-2.3 | Bulk operations (import, export, delete, update) | P1 |
| FR-2.4 | Drag-and-drop interface for task management | P2 |
| FR-2.5 | Real-time updates via WebSocket | P1 |

### 4.3 Dashboard & Analytics
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Customizable dashboard with widget library | P1 |
| FR-3.2 | Real-time data visualization (charts, graphs) | P1 |
| FR-3.3 | Drill-down analytics from summary to detail | P2 |
| FR-3.4 | Exportable reports (PDF, Excel, CSV) | P1 |
| FR-3.5 | Scheduled automated reports | P2 |

### 4.4 Notifications
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | In-app notification center with real-time updates | P1 |
| FR-4.2 | Email notifications with configurable digest | P1 |
| FR-4.3 | Push notifications for mobile | P2 |
| FR-4.4 | Configurable notification preferences per user | P1 |

### 4.5 Administration
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | User management (invite, deactivate, role assignment) | P0 |
| FR-5.2 | Organization/team management | P1 |
| FR-5.3 | Audit log with export capability | P1 |
| FR-5.4 | System configuration and feature flags | P2 |

## 5. Non-Functional Requirements

### 5.1 Performance
| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds (P95) |
| API response time | < 200ms (P95) |
| Time to Interactive | < 3 seconds |
| Search results | < 300ms |
| Real-time update latency | < 500ms |

### 5.2 Scalability
- Support 10,000 concurrent users
- Handle 1,000 API requests per second
- Database supports 10M+ records per table
- Horizontal scaling via containerization

### 5.3 Security
- OWASP Top 10 compliance
- AES-256 encryption at rest
- TLS 1.3 in transit
- SOC 2 Type II compliance roadmap
- Regular security audits and penetration testing

### 5.4 Reliability
- 99.9% uptime SLA
- Automated failover and recovery
- Daily automated backups with 30-day retention
- Zero-downtime deployments

## 6. Constraints
- Must support modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Mobile-responsive (iOS 15+, Android 12+)
- WCAG 2.1 AA accessibility compliance
- GDPR and CCPA data privacy compliance

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateTechArchitecture(t: string, wf: string, prod: string): string {
        return `# Technical Architecture — ${prod}

## Architecture Overview

### System Architecture Diagram
\`\`\`
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐               │
│  │ Web App │  │ Mobile  │  │  Admin   │               │
│  │ (React) │  │(React   │  │ Console  │               │
│  │         │  │ Native) │  │          │               │
│  └────┬────┘  └────┬────┘  └────┬─────┘               │
│       │            │            │                        │
└───────┼────────────┼────────────┼────────────────────────┘
        │            │            │
        ▼            ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                     API GATEWAY                          │
│         (Rate Limiting, Auth, Routing)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────┐
│                  SERVICE LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Auth    │  │  Core    │  │Analytics │             │
│  │ Service  │  │ Service  │  │ Service  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐             │
│  │Notification│ │  Search  │  │  Report  │             │
│  │  Service  │  │ Service  │  │ Service  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────┐
│                   DATA LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │  Redis   │  │    S3    │             │
│  │(Primary) │  │ (Cache)  │  │ (Files)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Technology Stack

### Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18+ | UI rendering |
| State Management | Zustand / React Query | Client state & server cache |
| Styling | Tailwind CSS | Utility-first styling |
| Build Tool | Vite | Fast development & builds |
| Testing | Vitest + Playwright | Unit & E2E tests |

### Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 LTS | Server runtime |
| Framework | Fastify | HTTP framework |
| ORM | Prisma | Database access |
| Auth | JWT + OAuth 2.0 | Authentication |
| Validation | Zod | Schema validation |
| Testing | Jest + Supertest | API tests |

### Infrastructure
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Containers | Docker | Application packaging |
| Orchestration | Kubernetes (EKS) | Container orchestration |
| CI/CD | GitHub Actions | Automated pipelines |
| Monitoring | Datadog / Grafana | Observability |
| CDN | CloudFront | Static asset delivery |
| DNS | Route53 | Domain management |

## Key Architectural Decisions

### ADR-001: Microservices vs Monolith
**Decision**: Modular monolith with clear service boundaries
**Rationale**: Faster initial development; can extract services when scaling requires it

### ADR-002: Database Strategy
**Decision**: PostgreSQL as primary database with Redis caching
**Rationale**: Strong consistency, JSON support, proven at scale; Redis for sessions and hot data

### ADR-003: Real-time Communication
**Decision**: WebSocket via Socket.IO
**Rationale**: Reliable, auto-reconnect, rooms for scoped broadcasting

### ADR-004: File Storage
**Decision**: S3-compatible object storage
**Rationale**: Scalable, cost-effective, CDN integration

## API Design Principles
1. RESTful with consistent resource naming
2. JSON request/response bodies
3. Cursor-based pagination for list endpoints
4. API versioning via URL path (\`/api/v1/\`)
5. OpenAPI 3.0 specification for all endpoints

## Deployment Architecture
\`\`\`
Production:
  ┌─ Kubernetes Cluster (EKS)
  │  ├─ API Pods (3 replicas, auto-scaling)
  │  ├─ Worker Pods (2 replicas)
  │  └─ Scheduler Pods (1 replica)
  ├─ RDS PostgreSQL (Multi-AZ)
  ├─ ElastiCache Redis (Cluster mode)
  └─ S3 Bucket (Versioned, Encrypted)
\`\`\`

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateDatabaseDesign(t: string, wf: string, prod: string): string {
        return `# Database Design — ${prod}

## Entity Relationship Diagram
\`\`\`
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │────<│ projects │────<│  tasks   │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │           ┌──────────┐         │
     ├──────────>│  teams   │<────────┤
     │           └──────────┘         │
     │                                │
     │           ┌──────────┐    ┌──────────┐
     ├──────────>│ comments │<───│  files   │
     │           └──────────┘    └──────────┘
     │
     │           ┌──────────────┐
     └──────────>│ notifications│
                 └──────────────┘
\`\`\`

## Table Definitions

### users
\`\`\`sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(50) NOT NULL DEFAULT 'user',
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    avatar_url    TEXT,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
\`\`\`

### projects
\`\`\`sql
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    priority    VARCHAR(20) NOT NULL DEFAULT 'medium',
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date  DATE,
    end_date    DATE,
    budget      DECIMAL(12,2),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
\`\`\`

### tasks
\`\`\`sql
CREATE TABLE tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority      VARCHAR(20) NOT NULL DEFAULT 'medium',
    assignee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date      DATE,
    estimated_hrs DECIMAL(6,2),
    actual_hrs    DECIMAL(6,2),
    tags          TEXT[] DEFAULT '{}',
    sort_order    INT DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
\`\`\`

### comments
\`\`\`sql
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON comments(task_id);
\`\`\`

### notifications
\`\`\`sql
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT,
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);
\`\`\`

### audit_logs
\`\`\`sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(50) NOT NULL,
    resource_id UUID,
    details     JSONB DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
\`\`\`

## Migration Strategy
1. Use Prisma Migrate for schema changes
2. All migrations are versioned and reversible
3. Seed scripts for development and demo data
4. Production migrations run in CI/CD with health checks

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateAPIDesign(t: string, wf: string, prod: string): string {
        return `# API Specifications — ${prod}

## Base URL
\`\`\`
Production:  https://api.${prod.toLowerCase().replace(/\s+/g, '')}.com/v1
Staging:     https://api-staging.${prod.toLowerCase().replace(/\s+/g, '')}.com/v1
\`\`\`

## Authentication
All API requests require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints

### Authentication
\`\`\`
POST   /auth/register      Register new user
POST   /auth/login          Login and receive tokens
POST   /auth/refresh        Refresh access token
POST   /auth/forgot-password  Request password reset
POST   /auth/reset-password   Reset password with token
\`\`\`

### Users
\`\`\`
GET    /users               List users (admin only)
GET    /users/:id           Get user by ID
PUT    /users/:id           Update user
DELETE /users/:id           Deactivate user
PUT    /users/:id/password  Change password
PUT    /users/:id/preferences  Update preferences
\`\`\`

### Projects
\`\`\`
GET    /projects            List projects
POST   /projects            Create project
GET    /projects/:id        Get project
PUT    /projects/:id        Update project
DELETE /projects/:id        Archive project
GET    /projects/:id/stats  Get project statistics
POST   /projects/:id/members  Add team member
DELETE /projects/:id/members/:userId  Remove team member
\`\`\`

### Tasks
\`\`\`
GET    /projects/:projectId/tasks       List tasks
POST   /projects/:projectId/tasks       Create task
GET    /projects/:projectId/tasks/:id   Get task
PUT    /projects/:projectId/tasks/:id   Update task
DELETE /projects/:projectId/tasks/:id   Delete task
PUT    /tasks/bulk                       Bulk update tasks
POST   /tasks/import                     Import tasks from CSV
\`\`\`

### Search
\`\`\`
GET    /search              Global search
GET    /search/suggestions  Search suggestions (autocomplete)
\`\`\`

### Reports
\`\`\`
POST   /reports/generate    Generate report
GET    /reports             List generated reports
GET    /reports/:id         Get report
GET    /reports/:id/download  Download report file
POST   /reports/schedule    Schedule recurring report
\`\`\`

### Notifications
\`\`\`
GET    /notifications        List notifications
PUT    /notifications/:id/read  Mark as read
PUT    /notifications/read-all  Mark all as read
PUT    /notifications/preferences  Update notification preferences
\`\`\`

## Standard Response Format

### Success Response
\`\`\`json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "hasMore": true
  }
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
\`\`\`

## HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Rate Limiting
| Tier | Limit | Window |
|------|-------|--------|
| Anonymous | 30 req | 1 minute |
| Authenticated | 100 req | 1 minute |
| Admin | 300 req | 1 minute |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateSecuritySpec(t: string, wf: string, prod: string): string {
        return `# Security Specification — ${prod}

## Security Architecture

### Defense in Depth Layers
1. **Network Layer**: WAF, DDoS protection, VPC isolation
2. **Transport Layer**: TLS 1.3, certificate pinning
3. **Application Layer**: Input validation, CSRF protection, CSP headers
4. **Data Layer**: Encryption at rest, field-level encryption for PII
5. **Access Layer**: RBAC, MFA, session management

## Authentication & Authorization

### Password Policy
- Minimum 12 characters
- Must include uppercase, lowercase, number, and special character
- bcrypt hashing with cost factor 12
- Password history: last 10 passwords cannot be reused
- Account lockout after 5 failed attempts (30-minute cooldown)

### Token Management
| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 15 minutes | Memory only (httpOnly cookie) |
| Refresh Token | 7 days | httpOnly, secure, SameSite=Strict cookie |
| CSRF Token | Per session | httpOnly cookie + custom header |

### MFA Support
- TOTP (Google Authenticator, Authy)
- Backup recovery codes (single-use)
- MFA required for admin actions

## Data Protection

### Encryption
| Data State | Algorithm | Key Management |
|------------|-----------|----------------|
| In Transit | TLS 1.3 | ACM (Certificate Manager) |
| At Rest | AES-256-GCM | KMS with auto-rotation |
| PII Fields | AES-256 + per-field key | Application-level encryption |

### PII Handling
- Email addresses: Encrypted at rest
- Names: Encrypted at rest
- IP addresses: Hashed after 90 days
- Payment data: Tokenized via Stripe (never stored)

### Data Retention
| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Active user data | While account active | N/A |
| Deleted user data | 30 days (grace period) | Secure deletion |
| Audit logs | 7 years | Archive then delete |
| Session data | 24 hours | Auto-expire |
| Backup data | 30 days | Auto-delete |

## OWASP Top 10 Compliance
| Risk | Mitigation |
|------|-----------|
| A01: Broken Access Control | RBAC, principle of least privilege, API-level checks |
| A02: Cryptographic Failures | TLS 1.3, AES-256, no weak algorithms |
| A03: Injection | Parameterized queries, input validation, ORM |
| A04: Insecure Design | Threat modeling, security architecture review |
| A05: Security Misconfiguration | Hardened defaults, automated scanning |
| A06: Vulnerable Components | Automated dependency scanning (Dependabot) |
| A07: Auth Failures | MFA, rate limiting, account lockout |
| A08: Data Integrity Failures | Signed tokens, integrity checks |
| A09: Logging Failures | Structured logging, tamper-proof audit trail |
| A10: SSRF | URL allowlisting, network segmentation |

## Security Headers
\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
\`\`\`

## Security Testing Plan
| Activity | Frequency | Tool/Method |
|----------|-----------|-------------|
| SAST (Static Analysis) | Every PR | SonarQube, ESLint security rules |
| DAST (Dynamic Analysis) | Weekly | OWASP ZAP |
| Dependency Scanning | Daily | Dependabot, Snyk |
| Penetration Testing | Quarterly | External firm |
| Bug Bounty | Ongoing | HackerOne program |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateDevOps(t: string, wf: string, prod: string): string {
        return `# DevOps & Infrastructure — ${prod}

## Infrastructure Overview
\`\`\`
                    ┌──────────────┐
                    │  CloudFront  │ (CDN)
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   Route 53   │ (DNS)
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │       Load Balancer      │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
   │  ECS/EC2  │    │  ECS/EC2  │    │  ECS/EC2  │
   │  (API)    │    │  (API)    │    │  (API)    │
   │  AZ-1a    │    │  AZ-1b    │    │  AZ-1c    │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
       ┌──────┴──────┐        ┌──────┴──────┐
       │  RDS        │        │  ElastiCache│
       │  PostgreSQL │        │  Redis      │
       │  Multi-AZ   │        │  Cluster    │
       └─────────────┘        └─────────────┘
\`\`\`

## CI/CD Pipeline

### Pipeline Stages
\`\`\`
Commit → Lint → Test → Build → Deploy-Staging → Integration Tests → Deploy-Prod
   │       │      │      │          │                   │              │
   │       │      │      │          │                   │              └─ Blue/Green
   │       │      │      │          │                   └─ Smoke tests
   │       │      │      │          └─ Auto-deploy on merge to develop
   │       │      │      └─ Docker build + push to ECR
   │       │      └─ Unit + Integration tests
   │       └─ ESLint, Prettier, TypeScript check
   └─ Commit message lint (conventional commits)
\`\`\`

### GitHub Actions Workflow
\`\`\`yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  deploy-staging:
    needs: lint-and-test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to staging"

  deploy-production:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Blue/Green deploy to production"
\`\`\`

## Environment Configuration
| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| NODE_ENV | development | staging | production |
| LOG_LEVEL | debug | info | warn |
| DB_POOL_SIZE | 5 | 10 | 25 |
| REDIS_TTL | 3600 | 3600 | 3600 |
| RATE_LIMIT | 1000/min | 200/min | 100/min |

## Monitoring & Alerting

### Metrics (Datadog / CloudWatch)
| Metric | Warning | Critical | Alert Channel |
|--------|---------|----------|---------------|
| API Error Rate | > 1% | > 5% | PagerDuty + Slack |
| API Latency P95 | > 500ms | > 2s | Slack |
| CPU Usage | > 70% | > 90% | PagerDuty |
| Memory Usage | > 75% | > 90% | PagerDuty |
| DB Connections | > 70% pool | > 90% pool | PagerDuty + Slack |
| Disk Usage | > 70% | > 85% | Slack |

### Logging Strategy
- **Format**: Structured JSON logs
- **Levels**: error, warn, info, debug
- **Retention**: 30 days hot, 1 year archived
- **Correlation**: Request ID traced across all services

## Backup & Recovery
| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| Database | Every 6 hours | 30 days | Automated RDS snapshots |
| File Storage | Daily | 90 days | S3 versioning + cross-region |
| Config/Secrets | On change | 90 days | GitOps (sealed secrets) |
| Audit Logs | Real-time | 7 years | S3 + Glacier |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateTestingStrategy(t: string, wf: string, prod: string): string {
        return `# Testing Strategy — ${prod}

## Testing Pyramid

\`\`\`
                    ╱╲
                   ╱  ╲        E2E Tests (Playwright)
                  ╱ 5% ╲       - Critical user flows
                 ╱______╲      - Cross-browser
                ╱        ╲
               ╱  15%     ╲    Integration Tests
              ╱            ╲   - API contract tests
             ╱______________╲  - Database tests
            ╱                ╲
           ╱      80%         ╲  Unit Tests (Vitest)
          ╱                    ╲ - Business logic
         ╱______________________╲ - Utilities, helpers
\`\`\`

## Test Categories

### 1. Unit Tests (80%)
**Framework**: Vitest
**Coverage Target**: 80%+ line coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| Services | Business logic, data transformations | 90% |
| Utilities | Helper functions, validators | 95% |
| Components | UI components (React Testing Library) | 80% |
| Hooks | Custom React hooks | 85% |

**Example**:
\`\`\`typescript
describe('TaskService', () => {
  it('should create a task with valid data', async () => {
    const task = await TaskService.create({
      projectId: 'proj_001',
      title: 'Design mockup',
      priority: 'high',
    });
    expect(task.id).toBeDefined();
    expect(task.status).toBe('pending');
  });
});
\`\`\`

### 2. Integration Tests (15%)
**Framework**: Jest + Supertest
**Coverage Target**: All API endpoints

| Area | Tests |
|------|-------|
| API Endpoints | Request/response validation |
| Database | CRUD operations, transactions |
| Auth Flow | Login, token refresh, MFA |
| Search | Full-text search, filters |
| Notifications | Delivery, preferences |

### 3. End-to-End Tests (5%)
**Framework**: Playwright
**Coverage Target**: Critical user journeys

| Flow | Test |
|------|------|
| Authentication | Login, register, password reset |
| Core Workflow | Create → Edit → Delete item |
| Dashboard | Load, customize, real-time update |
| Search | Type → Filter → Click result |
| Mobile | Responsive navigation, touch actions |

## Performance Testing
| Test | Tool | Target |
|------|------|--------|
| Load Testing | k6 | 1,000 concurrent users |
| Stress Testing | k6 | Find breaking point |
| API Benchmark | autocannon | < 200ms P95 latency |

## Security Testing
| Test | Tool | Frequency |
|------|------|-----------|
| SAST | SonarQube | Every PR |
| DAST | OWASP ZAP | Weekly |
| Dependency Audit | npm audit + Snyk | Daily |
| Secret Scanning | git-secrets | Every push |

## Test Data Management
- **Development**: Seed scripts with synthetic data
- **Staging**: Anonymized production-like data
- **E2E**: Deterministic fixtures with cleanup

## CI Integration
\`\`\`
PR Created → Unit Tests → Integration Tests → Build → E2E (Smoke)
    │            │              │              │          │
    │            │              │              │          └─ 5 min critical paths
    │            │              │              └─ Docker build validation
    │            │              └─ API tests against test DB
    │            └─ Fast feedback (< 2 min)
    └─ Coverage report as PR comment
\`\`\`

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateMockup(t: string, wf: string, prod: string): string {
        return `# Interactive Mockup — ${prod}

## Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #0078D4 | Buttons, links, active states |
| Primary Light | #A3C9FF | Hover states, badges |
| Success | #61dac1 | Positive actions, completed states |
| Warning | #fbbf24 | Alerts, pending states |
| Error | #ffb4ab | Error states, destructive actions |
| Background | #131313 | Page background |
| Surface | #1B1B1C | Cards, panels |
| Surface Elevated | #202020 | Modals, dropdowns |
| Text Primary | #e5e2e1 | Headings, body text |
| Text Secondary | #C0C7D4 | Descriptions, labels |
| Text Muted | #8a919e | Hints, timestamps |

### Typography
| Level | Font | Size | Weight |
|-------|------|------|--------|
| H1 | Space Grotesk | 2rem | 700 |
| H2 | Space Grotesk | 1.5rem | 700 |
| H3 | Space Grotesk | 1.125rem | 600 |
| Body | Inter | 0.875rem | 400 |
| Small | Inter | 0.75rem | 400 |
| Code | Fira Code | 0.8125rem | 400 |

### Spacing Scale (4px base)
\`4px\` → \`8px\` → \`12px\` → \`16px\` → \`20px\` → \`24px\` → \`32px\` → \`48px\` → \`64px\`

## Page Mockups

### 1. Login Page
\`\`\`
┌─────────────────────────────────────────────┐
│                                             │
│              [${prod} Logo]                  │
│                                             │
│          ┌─────────────────────┐            │
│          │    Welcome Back     │            │
│          │                     │            │
│          │  ┌───────────────┐  │            │
│          │  │  Email        │  │            │
│          │  └───────────────┘  │            │
│          │  ┌───────────────┐  │            │
│          │  │  Password     │  │            │
│          │  └───────────────┘  │            │
│          │                     │            │
│          │  [☑ Remember me]   │            │
│          │                     │            │
│          │  ┌───────────────┐  │            │
│          │  │   Sign In     │  │            │
│          │  └───────────────┘  │            │
│          │                     │            │
│          │  Forgot password?   │            │
│          │                     │            │
│          │  ── or ──           │            │
│          │                     │            │
│          │  [G Google] [MS]    │            │
│          └─────────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
\`\`\`

### 2. Dashboard
\`\`\`
┌─────────────────────────────────────────────────────────┐
│ [≡] ${prod}  Dashboard  Projects  Reports  ⚙️  🔔  [AB]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Good morning, Sarah!                    [Customize]    │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │    12    │ │    48    │ │    5     │ │   92%    │  │
│  │ Projects │ │  Tasks   │ │ Overdue  │ │ Complete │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              [Performance Chart]                 │   │
│  │  📊                                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────┐ ┌────────────────────────┐   │
│  │ Recent Activity      │ │ Upcoming Deadlines     │   │
│  │ • Task completed     │ │ • Design review (2d)   │   │
│  │ • Comment added      │ │ • Sprint demo (5d)     │   │
│  │ • Project created    │ │ • Release (1w)         │   │
│  └──────────────────────┘ └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
\`\`\`

### Component Library
- **Button**: Primary, Secondary, Ghost, Danger (sizes: sm, md, lg)
- **Input**: Text, Email, Password, Search, Textarea
- **Select**: Single, Multi, Searchable
- **Table**: Sortable, Filterable, Paginated
- **Modal**: Confirm, Form, Info
- **Toast**: Success, Error, Warning, Info
- **Card**: Content, Stats, Action

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateStyleGuide(t: string, wf: string, prod: string): string {
        return `# Brand Style Guide — ${prod}

## Brand Identity

### Logo
- **Primary Logo**: Full color on light/dark backgrounds
- **Mark Only**: Icon/monogram for favicons and small spaces
- **Clear Space**: Minimum 2x logo height on all sides
- **Minimum Size**: 24px height for digital, 0.5 inch for print

### Brand Voice
- **Tone**: Professional yet approachable
- **Language**: Clear, concise, action-oriented
- **Perspective**: First person plural ("we") for company, second person ("you") for users

## Visual Language

### Color System
#### Primary Palette
| Swatch | Name | Hex | RGB | Usage |
|--------|------|-----|-----|-------|
| 🔵 | Primary Blue | #0078D4 | rgb(0,120,212) | CTAs, links, active |
| 🔷 | Sky Blue | #A3C9FF | rgb(163,201,255) | Hover, highlights |
| 🟢 | Mint | #61dac1 | rgb(97,218,193) | Success, positive |
| 🟡 | Amber | #fbbf24 | rgb(251,191,36) | Warning, attention |
| 🔴 | Coral | #ffb4ab | rgb(255,180,171) | Error, destructive |

#### Neutral Palette
| Swatch | Name | Hex | Usage |
|--------|------|-----|-------|
| ⬛ | Rich Black | #131313 | Page background |
| ⬛ | Surface | #1B1B1C | Cards, panels |
| ⬛ | Elevated | #202020 | Modals, dropdowns |
| ⬛ | Border | #353535 | Borders, dividers |
| ⬜ | Text Primary | #e5e2e1 | Headings |
| ⬜ | Text Secondary | #C0C7D4 | Body text |
| ⬜ | Text Muted | #8a919e | Hints, labels |

### Typography Scale
| Element | Font Family | Size | Weight | Line Height |
|---------|-----------|------|--------|-------------|
| Display | Space Grotesk | 3rem | 700 | 1.1 |
| H1 | Space Grotesk | 2rem | 700 | 1.2 |
| H2 | Space Grotesk | 1.5rem | 700 | 1.3 |
| H3 | Space Grotesk | 1.125rem | 600 | 1.4 |
| Body | Inter | 1rem | 400 | 1.6 |
| Body Small | Inter | 0.875rem | 400 | 1.5 |
| Caption | Inter | 0.75rem | 400 | 1.4 |
| Code | Fira Code | 0.875rem | 400 | 1.5 |

### Iconography
- **Library**: Material Symbols Outlined
- **Size**: 20px (default), 16px (compact), 24px (large)
- **Weight**: 400, Fill: 0 (default), Fill: 1 (active/selected)
- **Color**: Inherit from parent text color

### Border Radius
| Element | Radius |
|---------|--------|
| Buttons | 6px |
| Cards | 8px |
| Modals | 12px |
| Inputs | 6px |
| Avatars | 50% (circle) |
| Badges/Tags | 9999px (pill) |

### Shadows
| Level | Value | Usage |
|-------|-------|-------|
| sm | 0 1px 3px rgba(0,0,0,.2) | Cards |
| md | 0 4px 12px rgba(0,0,0,.3) | Dropdowns |
| lg | 0 8px 32px rgba(0,0,0,.4) | Modals |

## Animation Guidelines
| Property | Duration | Easing | Usage |
|----------|----------|--------|-------|
| Color/Opacity | 150ms | ease | Hover, focus states |
| Transform | 200ms | ease-out | Modals, tooltips |
| Layout | 300ms | ease-in-out | Expanding sections |
| Page Transition | 200ms | ease | Route changes |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateBRD(t: string, wf: string, prod: string): string {
        return `# Business Requirements Document — ${prod}

## Document Information
- **Project**: ${prod}
- **Version**: 1.0
- **Status**: Draft
- **Date**: ${new Date().toLocaleDateString()}

## 1. Executive Summary
${this.generateSummary(t)}

## 2. Business Objectives
1. **Revenue Growth**: Generate $1M ARR within 12 months of launch
2. **Customer Acquisition**: Acquire 500+ paying customers in Year 1
3. **Market Position**: Establish ${prod} as a top-3 solution in its category
4. **Customer Retention**: Achieve < 5% monthly churn rate
5. **Operational Efficiency**: Reduce customer onboarding time by 60%

## 3. Business Requirements

### BR-001: User Management
- **Description**: System must support user registration, authentication, and profile management
- **Business Value**: Enables user acquisition and retention
- **Priority**: Critical
- **Success Criteria**: 95%+ registration completion rate

### BR-002: Core Workflow Engine
- **Description**: System must support creation, management, and tracking of core business workflows
- **Business Value**: Primary product functionality
- **Priority**: Critical
- **Success Criteria**: Users complete primary workflow within 5 minutes

### BR-003: Real-time Collaboration
- **Description**: Multiple users must be able to work simultaneously with real-time updates
- **Business Value**: Enables team adoption and increases stickiness
- **Priority**: High
- **Success Criteria**: < 500ms latency for real-time updates

### BR-004: Reporting & Analytics
- **Description**: System must provide comprehensive reporting with customizable dashboards
- **Business Value**: Enables data-driven decision making for customers
- **Priority**: High
- **Success Criteria**: Dashboard loads within 2 seconds

### BR-005: Integration Platform
- **Description**: System must support third-party integrations via API and webhooks
- **Business Value**: Increases platform stickiness and ecosystem value
- **Priority**: Medium
- **Success Criteria**: Support 10+ integrations at launch

### BR-006: Mobile Access
- **Description**: Full functionality accessible on mobile devices (responsive web + native app)
- **Business Value**: Extends usage beyond desktop
- **Priority**: Medium
- **Success Criteria**: Mobile engagement > 30% of total usage

### BR-007: Enterprise Compliance
- **Description**: Support SSO, audit logging, data export, and compliance features
- **Business Value**: Enables enterprise customer acquisition
- **Priority**: Medium
- **Success Criteria**: SOC 2 Type II certification within 12 months

## 4. Stakeholder Requirements
| Stakeholder | Key Requirement | Priority |
|-------------|----------------|----------|
| End Users | Intuitive, fast interface | Critical |
| Team Admins | User management, analytics | High |
| Executives | ROI dashboards, KPI tracking | High |
| IT Admins | SSO, security, compliance | Medium |
| Partners | API access, integration support | Medium |

## 5. Assumptions & Constraints
### Assumptions
- Users have modern web browsers (Chrome, Firefox, Safari, Edge)
- Users have reliable internet connectivity
- Organization has email infrastructure for notifications

### Constraints
- Development budget: Defined project budget
- Timeline: 20 weeks to MVP
- Technology: Must use approved tech stack
- Compliance: GDPR, CCPA, SOC 2

## 6. Success Metrics & KPIs
| KPI | Target | Measurement |
|-----|--------|-------------|
| Monthly Active Users | 10,000 | Analytics platform |
| Customer Satisfaction (CSAT) | > 4.5/5 | Survey |
| Net Promoter Score (NPS) | > 50 | Quarterly survey |
| Monthly Recurring Revenue | $100K | Billing system |
| Customer Acquisition Cost | < $200 | Marketing analytics |
| Lifetime Value | > $2,000 | Financial modeling |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateFunctionalRequirements(t: string, wf: string, prod: string): string {
        return `# Functional Requirements — ${prod}

## Overview
Detailed functional requirements organized by system module.

## FR Module 1: User Management

### FR-1.1: User Registration
- System shall allow new users to register with email and password
- System shall validate email format and uniqueness
- System shall enforce password complexity (min 12 chars, mixed case, number, special)
- System shall send verification email within 60 seconds
- System shall activate account only after email verification
- System shall create default user preferences upon registration

### FR-1.2: User Authentication
- System shall support email/password login
- System shall support OAuth 2.0 login (Google, Microsoft)
- System shall implement JWT-based session management
- System shall support "Remember Me" with extended session (30 days)
- System shall implement account lockout after 5 failed attempts
- System shall provide password reset via email link (valid for 1 hour)

### FR-1.3: User Profile
- System shall allow users to update name, email, avatar
- System shall allow users to change password (requires current password)
- System shall allow users to configure notification preferences
- System shall allow users to delete their account (with 30-day grace period)
- System shall maintain audit log of profile changes

## FR Module 2: Workspace & Projects

### FR-2.1: Project Management
- System shall allow users to create, edit, archive, and delete projects
- System shall support project metadata (name, description, dates, tags, budget)
- System shall track project status (active, on-hold, completed, archived)
- System shall assign project owner with full management permissions
- System shall support adding/removing team members to projects

### FR-2.2: Task Management
- System shall support CRUD operations for tasks within projects
- System shall track task status (pending, in-progress, review, completed, cancelled)
- System shall support task assignment to team members
- System shall support task priority levels (low, medium, high, critical)
- System shall track estimated vs actual hours
- System shall support task comments and attachments
- System shall support task dependencies (blocked by, blocks)
- System shall support drag-and-drop reordering

## FR Module 3: Search & Navigation

### FR-3.1: Global Search
- System shall provide a global search accessible from any page (Ctrl+K)
- System shall search across all entities (projects, tasks, users, files)
- System shall return results within 300ms
- System shall support search suggestions/autocomplete
- System shall respect role-based access in search results

### FR-3.2: Filtering & Sorting
- System shall provide column-based sorting in list views
- System shall support multi-field filtering with AND/OR logic
- System shall allow users to save filter presets
- System shall support date range filters

## FR Module 4: Notifications

### FR-4.1: Notification Delivery
- System shall deliver in-app notifications in real-time
- System shall send email notifications per user preferences
- System shall support push notifications for mobile
- System shall batch non-urgent notifications into digest (configurable frequency)
- System shall mark notifications as read/unread

## FR Module 5: Reports & Analytics

### FR-5.1: Dashboard
- System shall display customizable dashboard with widgets
- System shall support the following widget types: KPI card, chart, table, activity feed
- System shall refresh dashboard data at configurable intervals
- System shall persist dashboard layout per user

### FR-5.2: Report Generation
- System shall generate reports in PDF, Excel, and CSV formats
- System shall support scheduled report generation (daily, weekly, monthly)
- System shall deliver reports via email or in-app download
- System shall maintain report generation history

## FR Module 6: Administration

### FR-6.1: User Administration
- Admin shall be able to view, invite, deactivate, and delete users
- Admin shall be able to assign and modify user roles
- Admin shall be able to reset user passwords
- All admin actions shall be logged in audit trail

### FR-6.2: System Configuration
- Admin shall be able to configure system-wide settings
- Admin shall be able to manage feature flags
- Admin shall be able to view system health and metrics

## Traceability Matrix
| Requirement | Priority | Phase | Use Case |
|-------------|----------|-------|----------|
| FR-1.x | P0 | Phase 1 | UC-001 |
| FR-2.x | P0 | Phase 2 | UC-003 |
| FR-3.x | P1 | Phase 3 | UC-004 |
| FR-4.x | P1 | Phase 3 | UC-005 |
| FR-5.x | P1 | Phase 3 | UC-006 |
| FR-6.x | P0 | Phase 2 | UC-007 |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateBOM(t: string, wf: string, prod: string): string {
        return `# Bill of Materials — ${prod}

## Infrastructure

### Cloud Services (AWS)
| Service | Specification | Monthly Cost | Purpose |
|---------|--------------|-------------|---------|
| ECS Fargate | 3 tasks × 0.5 vCPU, 1GB RAM | $150 | API hosting |
| RDS PostgreSQL | db.r6g.large, Multi-AZ | $400 | Primary database |
| ElastiCache Redis | cache.r6g.large, 2 nodes | $250 | Caching & sessions |
| S3 | 100 GB + requests | $25 | File storage |
| CloudFront | 500 GB transfer | $50 | CDN |
| Route53 | 5 hosted zones | $5 | DNS |
| ALB | 1 load balancer | $40 | Traffic distribution |
| CloudWatch | Logs + Metrics | $50 | Monitoring |
| Secrets Manager | 50 secrets | $15 | Secret storage |
| SES | 50K emails | $10 | Transactional email |
| **Total** | | **~$995/mo** | |

### Third-Party Services
| Service | Plan | Monthly Cost | Purpose |
|---------|------|-------------|---------|
| Datadog | Pro (5 hosts) | $125 | Monitoring & APM |
| Sentry | Team (50K events) | $26 | Error tracking |
| SendGrid | Pro (100K emails) | $89 | Email delivery |
| Stripe | Per transaction | 2.9% + 30¢ | Payment processing |
| Auth0 | Developer Pro | $240 | Auth (if not self-built) |
| GitHub | Team | $44 | Source control + CI/CD |
| **Total** | | **~$524/mo** | |

## Software Dependencies

### Frontend
| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| react | 18.x | MIT | UI framework |
| react-dom | 18.x | MIT | DOM rendering |
| @tanstack/react-query | 5.x | MIT | Server state management |
| zustand | 4.x | MIT | Client state management |
| tailwindcss | 3.x | MIT | Styling |
| vite | 5.x | MIT | Build tool |
| vitest | 1.x | MIT | Unit testing |
| playwright | 1.x | Apache-2.0 | E2E testing |
| recharts | 2.x | MIT | Data visualization |
| react-hook-form | 7.x | MIT | Form management |
| zod | 3.x | MIT | Schema validation |

### Backend
| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| fastify | 4.x | MIT | HTTP framework |
| @prisma/client | 5.x | Apache-2.0 | ORM |
| jsonwebtoken | 9.x | MIT | JWT handling |
| bcrypt | 5.x | MIT | Password hashing |
| zod | 3.x | MIT | Validation |
| bull | 4.x | MIT | Job queue |
| socket.io | 4.x | MIT | WebSocket |
| winston | 3.x | MIT | Logging |
| aws-sdk | 3.x | Apache-2.0 | AWS services |

## Development Tools
| Tool | Purpose | Cost |
|------|---------|------|
| GitHub Actions | CI/CD | Included (GitHub Team) |
| Docker | Containerization | Free |
| Terraform | Infrastructure as Code | Free |
| SonarQube | Code quality | Free (Community) |
| Figma | Design collaboration | $12/editor/mo |

## Team Roles Required
| Role | Count | Duration | Cost Estimate |
|------|-------|----------|---------------|
| Full-Stack Developer | 2-3 | 20 weeks | $200K-300K |
| UI/UX Designer | 1 | 8 weeks | $30K-40K |
| DevOps Engineer | 1 | 10 weeks | $40K-50K |
| QA Engineer | 1 | 12 weeks | $25K-35K |
| Product Manager | 1 | 20 weeks | $50K-60K |

## Total Estimated Budget
| Category | Cost |
|----------|------|
| Infrastructure (Year 1) | $18,200 |
| Third-Party Services (Year 1) | $6,300 |
| Development Team | $345K-485K |
| Design Tools | $1,400 |
| **Total Year 1** | **~$370K-510K** |

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    private static generateImplementationPlan(t: string, wf: string, prod: string): string {
        return `# Implementation Plan — ${prod}

## Project Overview
- **Duration**: 20 weeks (5 months)
- **Sprint Length**: 2 weeks
- **Team Size**: 5-7 people
- **Methodology**: Agile (Scrum)

## Sprint Plan

### Sprint 1 (Weeks 1-2): Foundation
**Theme**: Project Setup & Auth
- [ ] Initialize monorepo with Turborepo
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Database schema v1 + Prisma setup
- [ ] Authentication (register, login, JWT)
- [ ] Basic API middleware (auth, validation, error handling)
- [ ] React app shell with routing
- [ ] Development environment (Docker Compose)
**Deliverable**: Users can register, login, and see an empty dashboard

### Sprint 2 (Weeks 3-4): Core Data Model
**Theme**: Projects & Teams
- [ ] Project CRUD API + UI
- [ ] Team member management
- [ ] Role-based access control middleware
- [ ] Database schema v2 (teams, memberships)
- [ ] List views with pagination
- [ ] Basic search implementation
**Deliverable**: Users can create projects and invite team members

### Sprint 3 (Weeks 5-6): Task Management
**Theme**: Tasks & Workflows
- [ ] Task CRUD API + UI
- [ ] Task assignment and status tracking
- [ ] Drag-and-drop task board (Kanban)
- [ ] Task comments
- [ ] File upload for task attachments
- [ ] Activity feed
**Deliverable**: Full task management within projects

### Sprint 4 (Weeks 7-8): Dashboard & Notifications
**Theme**: Visibility & Communication
- [ ] Dashboard with configurable widgets
- [ ] KPI stat cards and charts
- [ ] In-app notification system (WebSocket)
- [ ] Email notification delivery
- [ ] Notification preferences
- [ ] Real-time update infrastructure
**Deliverable**: Live dashboard and notification system

### Sprint 5 (Weeks 9-10): Search & Reporting
**Theme**: Discovery & Analytics
- [ ] Global search (Ctrl+K) with autocomplete
- [ ] Advanced filtering and saved searches
- [ ] Report generation (PDF, Excel, CSV)
- [ ] Report scheduling and delivery
- [ ] Chart library for analytics views
**Deliverable**: Comprehensive search and reporting

### Sprint 6 (Weeks 11-12): Polish & Performance
**Theme**: Quality & UX
- [ ] Performance optimization (caching, lazy loading)
- [ ] Mobile responsive design refinement
- [ ] Accessibility audit and fixes (WCAG 2.1 AA)
- [ ] Error handling and edge case coverage
- [ ] UI polish and micro-interactions
- [ ] Comprehensive unit test coverage (>80%)
**Deliverable**: Production-quality user experience

### Sprint 7 (Weeks 13-14): Integrations
**Theme**: Ecosystem
- [ ] Public API documentation (OpenAPI/Swagger)
- [ ] Webhook system
- [ ] Slack integration
- [ ] Calendar integration
- [ ] Import/Export (CSV, Excel bulk operations)
- [ ] API key management
**Deliverable**: Integration-ready platform

### Sprint 8 (Weeks 15-16): Enterprise Features
**Theme**: Scale & Compliance
- [ ] SSO/SAML authentication
- [ ] Enhanced audit logging
- [ ] Data export and GDPR compliance tools
- [ ] Admin console improvements
- [ ] Multi-tenancy support
- [ ] Custom field support
**Deliverable**: Enterprise-ready features

### Sprint 9 (Weeks 17-18): Security & Hardening
**Theme**: Production Readiness
- [ ] Security audit and vulnerability remediation
- [ ] Penetration testing
- [ ] Load testing (target: 1,000 concurrent users)
- [ ] Disaster recovery testing
- [ ] Monitoring and alerting setup
- [ ] Documentation (user guides, API docs)
**Deliverable**: Production-hardened platform

### Sprint 10 (Weeks 19-20): Launch
**Theme**: Go-Live
- [ ] Beta testing with external users
- [ ] Bug fixes from beta feedback
- [ ] Marketing site and documentation
- [ ] Launch preparation and checklist
- [ ] Onboarding flow and tutorials
- [ ] Post-launch monitoring plan
**Deliverable**: Public launch 🚀

## Risk Mitigation
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict sprint goals, backlog grooming |
| Technical blockers | Medium | High | Spike stories, proof of concepts |
| Team availability | Medium | Medium | Cross-training, documentation |
| Performance issues | Low | High | Early load testing, monitoring |
| Security vulnerabilities | Low | Critical | Automated scanning, security review |

## Definition of Done
- [ ] Code reviewed by at least 1 team member
- [ ] Unit tests written (>80% coverage for new code)
- [ ] Integration tests for API endpoints
- [ ] No critical or high security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] QA sign-off
- [ ] Product owner acceptance

---
*Generated by Genesis AI — ${new Date().toISOString()}*
*Based on project requirements for ${prod}*`;
    }

    // ─── FORMAT HELPERS ──────────────────────────────────────────────────

    private static toJson(type: string, title: string, content: string, workflowName: string, productName: string): object {
        return {
            type,
            title,
            workflowName,
            productName,
            content,
            format: 'markdown',
            generatedAt: new Date().toISOString(),
            generator: 'Genesis AI Local',
            version: '1.0.0',
        };
    }

    private static toHtml(title: string, content: string, productName: string): string {
        // Simple markdown to HTML conversion for the HTML file output
        let html = content;
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^  - (.+)$/gm, '<li style="margin-left:1.5rem">$1</li>');
        html = html.replace(/^---$/gm, '<hr>');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — ${productName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; line-height: 1.7; padding: 48px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 2rem; margin: 0 0 1.5rem; color: #16213e; border-bottom: 2px solid #0078D4; padding-bottom: 0.5rem; }
        h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #0f3460; }
        h3 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: #1a1a2e; }
        h4 { font-size: 1rem; margin: 1rem 0 0.5rem; color: #333; }
        p { margin-bottom: 1rem; }
        ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        li { margin-bottom: 0.4rem; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Fira Code', monospace; font-size: 0.9em; }
        pre { background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 8px; margin: 1rem 0; overflow-x: auto; }
        pre code { background: none; color: inherit; padding: 0; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        strong { font-weight: 600; }
        hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
        blockquote { border-left: 4px solid #0078D4; padding: 0.75rem 1rem; margin: 1rem 0; background: #f8f9fa; }
        @media print { body { padding: 20px; } h1 { page-break-before: always; } h1:first-child { page-break-before: avoid; } }
    </style>
</head>
<body>
${html}
<footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.75rem; color: #888;">
    Generated by Genesis AI — ${new Date().toISOString()} — ${productName}
</footer>
</body>
</html>`;
    }
}
