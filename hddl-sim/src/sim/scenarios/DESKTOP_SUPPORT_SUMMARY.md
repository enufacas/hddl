# Desktop Support — Hybrid Work Environment

## Scenario Overview

**Scenario ID:** `scenario-desktop-support-001`  
**Title:** Desktop Support — Hybrid Work Environment  
**Duration:** 168 hours (7 days)  
**Tags:** `it-operations`, `hybrid-work`, `global-teams`, `user-support`

## Domain Context

This scenario simulates a modern IT support organization managing desktop support operations for a hybrid workforce. The environment includes both onshore and offshore support teams working collaboratively to provide 24/7 assistance to employees across multiple locations and work arrangements (remote, hybrid, on-site).

### Key Characteristics

1. **Low-Tech Users**: Many end users have limited technical proficiency and struggle to articulate their issues using technical terminology
2. **Hybrid Work Environment**: Support must accommodate remote workers, hybrid employees, and on-site staff with different needs
3. **Offshore Resources**: Support teams distributed across time zones (Bangalore, Mumbai, Manila) provide around-the-clock coverage
4. **Vague Issue Descriptions**: Common scenario where users say things like "computer broken" or "can't log in" without specifics

## Decision Envelopes

The scenario includes 6 decision envelopes across different support domains:

### 1. ENV-DESK-001: Incident Triage & Classification
**Owner:** Support Operations Steward (Sarah Martinez)  
**Domain:** Service Desk Operations  
**Version:** v1.3.0 (after low-tech user workflow enhancement)

**Key Assumptions:**
- Agents can infer user intent from vague descriptions using historical patterns
- Automated triage reduces initial response time by routing to appropriate teams
- Low-tech users benefit from simplified language and proactive clarification
- Offshore support handles priority 3-4 tickets during business hours (time-shifted)

**Key Constraints:**
- Never close tickets without user confirmation of resolution
- Priority 1 incidents escalated to onshore team within 5 minutes
- All user communications use plain language (no technical jargon for low-tech users)
- Offshore team maximum caseload: 15 active tickets per agent

### 2. ENV-DESK-002: Password & Access Management
**Owner:** Security Operations Steward (David Kim)  
**Domain:** Identity & Access  
**Version:** v1.1.0

**Key Assumptions:**
- Identity verification via automated questions before password resets
- Multi-factor authentication reduces unauthorized access attempts
- Remote workers require expedited access restoration for business continuity
- Offshore agents follow same security protocols with regional compliance considerations

**Key Constraints:**
- MFA required for all password reset approvals
- Privileged account access requires manager approval
- Password resets logged and audited within 24 hours
- Cross-border data transfer follows GDPR and local privacy regulations

### 3. ENV-DESK-003: Hardware & Software Provisioning
**Owner:** IT Asset Steward (Rachel Wong)  
**Domain:** Asset Management  
**Version:** v1.2.0 (after ergonomic budget cap increase)

**Key Assumptions:**
- Hybrid workers need flexible device options (laptop, monitors, peripherals)
- Automated eligibility checks based on role and business justification
- Home office equipment requests processed within 3-5 business days
- Offshore team monitors asset lifecycle and initiates refresh recommendations

**Key Constraints:**
- Equipment requests >$2,000 require manager approval
- Home office reimbursements capped at $750/year (increased from $500 after ergonomic needs)
- Software licenses tracked to prevent over-provisioning
- Asset tracking maintains 98%+ inventory accuracy

### 4. ENV-DESK-004: Remote Connectivity & VPN Support
**Owner:** Network Operations Steward (Michael O'Brien)  
**Domain:** Network Services  
**Version:** v1.0.0

**Key Assumptions:**
- VPN troubleshooting prioritizes business-critical users (sales, customer support)
- Automated diagnostics identify 70% of connectivity issues without human intervention
- Home network variability requires adaptive troubleshooting workflows
- 24/7 offshore coverage ensures round-the-clock support for remote workforce

**Key Constraints:**
- VPN issues for remote-only employees treated as priority 1
- Network diagnostics must not expose user location data without consent
- Escalation to ISP support only after internal troubleshooting exhausted
- SLA: 95% of VPN issues resolved within 4 hours

### 5. ENV-DESK-005: Knowledge Base & Self-Service
**Owner:** Knowledge Management Steward (James Thompson)  
**Domain:** User Enablement  
**Version:** v1.3.0

**Key Assumptions:**
- AI-powered search surfaces relevant articles for low-tech users with vague queries
- Automated recommendations reduce repeat tickets by 30%
- Articles written at 6th-grade reading level for accessibility
- Offshore agents contribute localized troubleshooting content

**Key Constraints:**
- Knowledge base articles must include step-by-step screenshots
- Search results prioritize recently validated solutions (updated <90 days)
- Articles never assume technical prerequisites without explanation
- Feedback mechanism tracks article helpfulness (>80% satisfaction target)

### 6. ENV-DESK-006: Offshore Team Performance Monitoring
**Owner:** Global Support Operations Steward (Patricia Okafor)  
**Domain:** Quality Assurance  
**Version:** v1.1.0

**Key Assumptions:**
- Performance metrics balanced across onshore and offshore teams
- Cultural and language differences considered in quality scoring
- Real-time coaching improves offshore agent effectiveness
- Escalation patterns analyzed to identify training opportunities

**Key Constraints:**
- Quality audits sample 5% of offshore-handled tickets weekly
- Customer satisfaction scores must exceed 4.2/5.0 average
- Training interventions triggered if quality drops below 85%
- Escalation rates >15% indicate need for process refinement

## Agent Fleets

The scenario includes 18 specialized agents across 6 steward teams:

### Support Operations Steward Fleet
- **TicketClassifier**: Incident categorization and priority assignment
- **IntentParser**: Extract technical needs from vague user descriptions
- **UserProfiler**: Identify user tech proficiency and communication preferences

### Security Operations Steward Fleet
- **IdentityVerifier**: Automated user authentication for password resets
- **AccessAuditor**: Privileged access request validation
- **ComplianceMonitor**: Cross-border data handling and privacy compliance

### IT Asset Steward Fleet
- **ProvisioningRouter**: Hardware and software request evaluation
- **LifecycleTracker**: Asset refresh and retirement recommendations
- **BudgetGuard**: Cost optimization and approval routing

### Network Operations Steward Fleet
- **VPNDiagnostics**: Automated connectivity troubleshooting
- **PriorityRouter**: Business criticality assessment for VPN issues
- **NetworkOptimizer**: Home network configuration recommendations

### Knowledge Management Steward Fleet
- **SmartSearcher**: Semantic search for vague user queries
- **ArticleRecommender**: Proactive solution suggestions based on ticket patterns
- **ContentSimplifier**: Ensure articles match user technical literacy

### Global Support Operations Steward Fleet
- **PerformanceMonitor**: Offshore team metrics tracking
- **QualityScorer**: Ticket resolution quality assessment
- **EscalationAnalyzer**: Identify patterns requiring training or process changes

## Key Event Patterns

The scenario demonstrates several important HDDL patterns:

### 1. Low-Tech User Escalation Pattern (Hour 8.2)
**Pattern:** Agent encounters extremely vague description requiring human clarification

- **Retrieval (Hour 8.15)**: UserProfiler queries historical patterns for low-tech users
- **Boundary Interaction (Hour 8.2)**: IntentParser escalates "Computer broken, can't do work" from user with low tech proficiency
- **Boundary Embedding (Hour 8.7)**: Stores escalation pattern for vague descriptions
- **Steward Decision (Hour 9.1)**: Support agent calls user, discovers Outlook not opening after Windows update
- **Decision Embedding (Hour 9.6)**: Stores resolution showing value of phone follow-up
- **Revision (Hour 10.5)**: Policy updated to proactively identify low-tech users for simplified support
- **Revision Embedding (Hour 11)**: Stores policy change adding proactive identification

**Outcome:** ENV-DESK-001 upgraded to v1.3.0 with enhanced low-tech user handling

### 2. Business-Critical VPN Failure Pattern (Hour 18.4)
**Pattern:** Remote-only executive loses VPN access

- **Retrieval (Hour 18.35)**: VPNDiagnostics queries standard troubleshooting workflows
- **Boundary Interaction (Hour 18.4)**: VP of Sales cannot access VPN, meets Priority 1 criteria
- **Boundary Embedding (Hour 18.9)**: Stores business-critical VPN failure escalation
- **Steward Decision (Hour 19.2)**: Emergency mobile hotspot deployed via overnight courier
- **Decision Embedding (Hour 19.7)**: Stores emergency response pattern

**Outcome:** Demonstrates priority handling for business-critical remote workers

### 3. Ergonomic Equipment Budget Escalation (Hour 42.3)
**Pattern:** Health-related equipment request exceeds standard budget

- **Retrieval (Hour 42.25)**: BudgetGuard queries historical equipment approval patterns
- **Boundary Interaction (Hour 42.3)**: $1,600 ergonomic setup request exceeds $500 cap but user reports back pain
- **Boundary Embedding (Hour 42.8)**: Stores ergonomic request with health justification
- **Steward Decision (Hour 43.5)**: Full request approved with manager co-sign and assessment requirement
- **Decision Embedding (Hour 44)**: Stores health-related approval pattern
- **Revision (Hour 105.2)**: Budget cap increased to $750, ergonomic assessments added
- **Revision Embedding (Hour 105.7)**: Stores policy revision with health considerations

**Outcome:** ENV-DESK-003 upgraded to v1.2.0 with higher budget cap for ergonomics

### 4. Offshore Training Intervention (Hour 72.3)
**Pattern:** Offshore team escalation rate spike indicates training need

- **Retrieval (Hour 72.25)**: QualityScorer queries historical offshore performance patterns
- **Boundary Interaction (Hour 72.3)**: Bangalore team escalation rate hits 18% (threshold: 15%), 60% involve low-tech users
- **Boundary Embedding (Hour 72.8)**: Stores offshore training opportunity escalation
- **Steward Decision (Hour 74.5)**: Targeted training scheduled on "Effective Clarification Questions for Low-Tech Users"
- **Decision Embedding (Hour 75)**: Stores training intervention decision pattern
- **Signal (Hour 120)**: Post-training results show escalation rate reduced to 13%, satisfaction improved to 4.5/5.0

**Outcome:** Demonstrates quality monitoring and continuous improvement for global teams

### 5. DSG Session (Hour 84)
**Pattern:** Stewardship Group reviews low-tech user interactions

- **DSG Session (Hour 84)**: Review of 312 low-tech user interactions identifies patterns: 72% resolved with phone call, 18% needed in-person office visits, 10% successfully self-served
- **DSG Embedding (Hour 85)**: Stores session artifact with analysis and insights

**Outcome:** Strategic review informs ongoing policy refinement

## Historical Baseline Embeddings

The scenario includes 4 pre-existing knowledge embeddings (hour -72) representing institutional knowledge:

1. **EMB-DESK-HIST-001**: Standard password reset patterns and workflows
2. **EMB-DESK-HIST-002**: Low-tech user recognition and vague description handling
3. **EMB-DESK-HIST-003**: Standard home office equipment provisioning for hybrid workers
4. **EMB-DESK-HIST-004**: Offshore team performance metrics and quality benchmarks

## Performance Metrics

### Week 1 Summary (Hour 168)
- **Total tickets processed**: 1,847
- **Auto-classification rate**: 78%
- **Low-tech user identification accuracy**: 88%
- **Offshore ticket handling**: 52% of total volume
- **Average resolution time**: 4.2 hours (target: <6 hours)
- **Customer satisfaction**: 4.3/5.0
- **Self-service deflection rate**: 38% (target: 30%)
- **Knowledge base satisfaction**: 4.4/5.0

### Offshore Team Performance
- **Bangalore Team**: 142 tickets, 4.3/5.0 satisfaction, 13% escalation rate (post-training)
- **Mumbai Team**: 156 tickets, 4.4/5.0 satisfaction, 9% escalation rate

## Scenario Highlights

This scenario specifically addresses the requirements:

✅ **Desktop support activities**: Covers incident triage, password resets, hardware provisioning, VPN support, and knowledge base management  
✅ **Offshore resource monitoring**: Dedicated envelope (ENV-DESK-006) for offshore team performance with quality metrics and training interventions  
✅ **Hybrid work environment**: Multiple envelopes address remote connectivity, home office equipment, and work-from-anywhere needs  
✅ **Low-tech user consideration**: Core pattern showing agent learning to identify and support users who "don't know what they need help with"

## Key Learnings

1. **Pattern Recognition for User Proficiency**: Agents learn to identify low-tech users from historical interaction patterns and adjust communication style accordingly
2. **Proactive Support Strategies**: Phone-first approach for identified low-tech users improves resolution rates and satisfaction
3. **Ergonomic Investment**: Health-related equipment justifications warrant budget flexibility for remote workforce wellbeing
4. **Global Team Enablement**: Targeted training interventions improve offshore team effectiveness with culturally diverse user base
5. **Self-Service Effectiveness**: Simplified knowledge base content (6th-grade reading level) increases deflection rates among low-tech users

## Usage

To load this scenario in the HDDL Simulation Platform:
1. Select "Desktop Support — Hybrid Work Environment" from the scenario dropdown
2. Observe the timeline showing 168 hours across 6 concurrent support domains
3. Watch agents learn from boundary interactions and policy revisions
4. Note the embedding space growing as decisions are memorialized for future agent retrieval

## Conformance

The scenario passes conformance validation with the following characteristics:
- ✅ All required boundary interactions have embeddings
- ✅ All revisions have embeddings
- ✅ Historical baseline embeddings establish pre-existing knowledge
- ✅ Retrieval events show agents "thinking with memory"
- ✅ Complete feedback loops from boundary → decision → revision → embedding

## Future Extensions

Potential expansions to this scenario:
- **Security incident response**: Phishing detection and user education workflows
- **Software deployment**: Patch management and change control coordination
- **Hardware break/fix**: Laptop repairs and device swap procedures
- **Mobile device management**: BYOD policy enforcement and mobile support
- **Compliance audits**: Access review and security policy validation
