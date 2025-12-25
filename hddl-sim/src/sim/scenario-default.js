export function createDefaultScenario() {
  return {
    id: 'scenario-default-001',
    title: 'HDDL Default Replay',
    durationHours: 48,
    fleets: [
      {
        stewardRole: 'Customer Steward',
        agents: [
          { agentId: 'AG-CS-01', name: 'ReplyAssist', envelopeIds: ['ENV-001'], role: 'response drafting' },
          { agentId: 'AG-CS-02', name: 'RefundGuard', envelopeIds: ['ENV-001'], role: 'refund boundary checks' },
          { agentId: 'AG-CS-03', name: 'EscalationRouter', envelopeIds: ['ENV-001'], role: 'boundary interaction routing' },
          { agentId: 'AG-CS-04', name: 'SentimentTriage', envelopeIds: ['ENV-001'], role: 'coarse sentiment bucket + triage' },
          { agentId: 'AG-CS-05', name: 'PolicySnippet', envelopeIds: ['ENV-001'], role: 'policy lookup (bounded)' },
          { agentId: 'AG-CS-06', name: 'CaseSummarizer', envelopeIds: ['ENV-001'], role: 'DTS-safe case summaries' },
        ],
      },
      {
        stewardRole: 'HR Steward',
        agents: [
          { agentId: 'AG-HR-01', name: 'BiasCheck', envelopeIds: ['ENV-002'], role: 'protected-class guardrails' },
          { agentId: 'AG-HR-02', name: 'TransparencyPacket', envelopeIds: ['ENV-002'], role: 'candidate packet compilation' },
          { agentId: 'AG-HR-03', name: 'InterviewScheduler', envelopeIds: ['ENV-002'], role: 'coordination (no surveillance)' },
          { agentId: 'AG-HR-04', name: 'RubricNormalizer', envelopeIds: ['ENV-002'], role: 'rubric alignment + consistency' },
          { agentId: 'AG-HR-05', name: 'AccommodationFlagger', envelopeIds: ['ENV-002'], role: 'escalate accommodation needs' },
          { agentId: 'AG-HR-06', name: 'DTSBoundaryCheck', envelopeIds: ['ENV-002'], role: 'telemetry boundary enforcement' },
        ],
      },
      {
        stewardRole: 'Resiliency Steward',
        agents: [
          { agentId: 'AG-RES-01', name: 'FraudTriage', envelopeIds: ['ENV-004'], role: 'risk triage and routing' },
          { agentId: 'AG-RES-02', name: 'RollbackMonitor', envelopeIds: ['ENV-004'], role: 'rollback + failure class watch' },
          { agentId: 'AG-RES-03', name: 'AnomalyWatch', envelopeIds: ['ENV-004'], role: 'drift + anomaly detection' },
          { agentId: 'AG-RES-04', name: 'EscalationPolicy', envelopeIds: ['ENV-004'], role: 'escalation threshold checks' },
          { agentId: 'AG-RES-05', name: 'CustomerFrictionGuard', envelopeIds: ['ENV-004'], role: 'friction budget guardrails' },
          { agentId: 'AG-RES-06', name: 'ResiliencyReporter', envelopeIds: ['ENV-004'], role: 'bounded incident summaries' },
        ],
      },
      {
        stewardRole: 'Business Domain Steward',
        agents: [
          { agentId: 'AG-OPS-01', name: 'RebalancePlanner', envelopeIds: ['ENV-005'], role: 'bounded reroute planning' },
          { agentId: 'AG-OPS-02', name: 'SpendGuard', envelopeIds: ['ENV-005'], role: 'expedite spend constraint checks' },
          { agentId: 'AG-OPS-03', name: 'BackorderPredictor', envelopeIds: ['ENV-005'], role: 'short-horizon risk projection' },
          { agentId: 'AG-OPS-04', name: 'VendorCoordinator', envelopeIds: ['ENV-005'], role: 'vendor coordination (bounded)' },
          { agentId: 'AG-OPS-05', name: 'PolicyEnforcer', envelopeIds: ['ENV-005'], role: 'route restrictions enforcement' },
          { agentId: 'AG-OPS-06', name: 'OpsPacket', envelopeIds: ['ENV-005'], role: 'decision packet compilation' },
        ],
      },
      {
        stewardRole: 'Domain Engineer',
        agents: [
          { agentId: 'AG-ENG-01', name: 'ConstraintCompiler', envelopeIds: ['ENV-003', 'ENV-006'], role: 'envelope compile + diffs' },
          { agentId: 'AG-ENG-02', name: 'AuditJoiner', envelopeIds: ['ENV-003'], role: 'decision_id / envelope join keys' },
          { agentId: 'AG-ENG-03', name: 'DriftLens', envelopeIds: ['ENV-003'], role: 'assumptions<->signals mismatch mapping' },
          { agentId: 'AG-ENG-04', name: 'EscalationRouter', envelopeIds: ['ENV-003','ENV-006'], role: 'routing on boundary touch' },
          { agentId: 'AG-ENG-05', name: 'RevisionDiff', envelopeIds: ['ENV-003','ENV-006'], role: 'lineage diff generation' },
          { agentId: 'AG-ENG-06', name: 'RunbookLinker', envelopeIds: ['ENV-003','ENV-006'], role: 'attach bounded runbooks' },
          { agentId: 'AG-ENG-07', name: 'SchemaGuard', envelopeIds: ['ENV-001','ENV-002','ENV-003','ENV-004','ENV-005','ENV-006'], role: 'wide-event schema validation' },
        ],
      },
      {
        stewardRole: 'Sales Steward',
        agents: [
          { agentId: 'AG-SALES-01', name: 'DealGuard', envelopeIds: ['ENV-003'], role: 'discount guardrails' },
          { agentId: 'AG-SALES-02', name: 'BundleBoundary', envelopeIds: ['ENV-006'], role: 'enterprise bundle boundary checks' },
          { agentId: 'AG-SALES-03', name: 'PriceBandAdvisor', envelopeIds: ['ENV-003'], role: 'price band anchoring' },
          { agentId: 'AG-SALES-04', name: 'EnterpriseQualifier', envelopeIds: ['ENV-003','ENV-006'], role: 'segment qualification' },
          { agentId: 'AG-SALES-05', name: 'EscalationPacket', envelopeIds: ['ENV-003'], role: 'human review packet generation' },
          { agentId: 'AG-SALES-06', name: 'OfferAssembler', envelopeIds: ['ENV-006'], role: 'offer assembly within constraints' },
        ],
      },
      {
        stewardRole: 'Data Steward',
        agents: [
          { agentId: 'AG-DATA-01', name: 'DTSGate', envelopeIds: ['ENV-001','ENV-002','ENV-003','ENV-004','ENV-005','ENV-006'], role: 'telemetry allow-list enforcement' },
          { agentId: 'AG-DATA-02', name: 'JoinKeyPublisher', envelopeIds: ['ENV-001','ENV-002','ENV-003','ENV-004','ENV-005','ENV-006'], role: 'join keys + correlation hygiene' },
          { agentId: 'AG-DATA-03', name: 'WideEventSampler', envelopeIds: ['ENV-001','ENV-002','ENV-003','ENV-004','ENV-005','ENV-006'], role: 'bounded sampling + retention' },
          { agentId: 'AG-DATA-04', name: 'DriftAggregator', envelopeIds: ['ENV-003','ENV-004'], role: 'aggregate drift indicators' },
          { agentId: 'AG-DATA-05', name: 'PrecedentIndexer', envelopeIds: ['ENV-003','ENV-006'], role: 'non-authoritative precedent recall' },
        ],
      },
    ],
    envelopes: [
      {
        envelopeId: 'ENV-001',
        name: 'Customer Service Responses',
        domain: 'Customer Service',
        ownerRole: 'Customer Steward',
        createdHour: 2,
        endHour: 12,
        accent: 'var(--status-info)',
        assumptions: [
          'Customers prefer response times under 2 minutes.',
          'Escalations correlate with sentiment divergence.',
          'Refunds over $100 require human review.'
        ],
        constraints: ['Max response time: 2min', 'Escalate on: negative sentiment', 'Human review: refunds > $100'],
      },
      {
        envelopeId: 'ENV-002',
        name: 'Hiring Recommendations',
        domain: 'Hiring',
        ownerRole: 'HR Steward',
        createdHour: 10,
        endHour: 24,
        accent: 'var(--status-success)',
        assumptions: [
          'Protected classes must not be inferred.',
          'Humans make final hiring decisions.',
          'Candidate transparency is required.'
        ],
        constraints: ['No inference on protected classes', 'Human-only final decision', 'Transparency required'],
      },
      {
        envelopeId: 'ENV-004',
        name: 'Fraud Triage',
        domain: 'Payments',
        ownerRole: 'Resiliency Steward',
        createdHour: 18,
        endHour: 23,
        accent: 'var(--status-warning)',
        assumptions: [
          'High-risk transactions require human verification.',
          'False positives must remain below a defined threshold.'
        ],
        constraints: ['Manual review: risk score >= 0.85', 'Customer friction budget enforced', 'Log every override'],
      },
      {
        envelopeId: 'ENV-005',
        name: 'Inventory Rebalance',
        domain: 'Operations',
        ownerRole: 'Business Domain Steward',
        createdHour: 26,
        endHour: 32,
        accent: 'var(--vscode-button-background)',
        assumptions: [
          'Demand forecasts are reliable within a 7-day horizon.',
          'Backorders should be minimized when cost impact is bounded.'
        ],
        constraints: ['No stockout risk above 5%', 'Max expedite spend per day: $50k', 'Human approval required for reroutes'],
      },
      {
        envelopeId: 'ENV-003',
        name: 'Pricing Adjustments',
        domain: 'Pricing',
        ownerRole: 'Domain Engineer',
        createdHour: 30,
        endHour: 44,
        accent: 'var(--status-error)',
        assumptions: [
          'Historical price bands remain a valid anchor.',
          'Strategic deals can tolerate wider variance with steward review.'
        ],
        constraints: ['Max discount: 15%', 'Geographic restrictions apply', 'Audit trail required'],
      },
      {
        envelopeId: 'ENV-006',
        name: 'Marketing Offers',
        domain: 'Marketing',
        ownerRole: 'Sales Steward',
        createdHour: 40,
        endHour: 46,
        accent: 'var(--status-muted)',
        assumptions: [
          'Offers must remain consistent with brand and compliance constraints.',
          'High-value customer segments require additional scrutiny.'
        ],
        constraints: ['No protected-class targeting', 'Max discount: 12%', 'DSG review required for enterprise bundles'],
      }
    ],
    events: [
      {
        hour: 2,
        type: 'envelope_promoted',
        envelopeId: 'ENV-001',
        label: 'Envelope promoted',
        detail: 'Customer Service Responses active'
      },
      {
        hour: 10,
        type: 'envelope_promoted',
        envelopeId: 'ENV-002',
        label: 'Envelope promoted',
        detail: 'Hiring Recommendations active'
      },
      {
        hour: 18,
        type: 'envelope_promoted',
        envelopeId: 'ENV-004',
        label: 'Envelope promoted',
        detail: 'Fraud Triage active'
      },
      {
        hour: 26,
        type: 'envelope_promoted',
        envelopeId: 'ENV-005',
        label: 'Envelope promoted',
        detail: 'Inventory Rebalance active'
      },
      {
        hour: 30,
        type: 'envelope_promoted',
        envelopeId: 'ENV-003',
        label: 'Envelope promoted',
        detail: 'Pricing Adjustments active'
      },
      {
        hour: 40,
        type: 'envelope_promoted',
        envelopeId: 'ENV-006',
        label: 'Envelope promoted',
        detail: 'Marketing Offers active'
      },
      {
        hour: 34,
        type: 'signal',
        envelopeId: 'ENV-003',
        signalKey: 'pricing_drift',
        value: 0.15,
        severity: 'warning',
        label: 'Signal divergence detected',
        detail: 'Pricing drift trending 15% below steward baseline',
        assumptionRefs: ['Historical price bands remain a valid anchor.']
      },
      {
        hour: 35,
        type: 'escalation',
        envelopeId: 'ENV-003',
        actorRole: 'Sales Steward',
        severity: 'warning',
        label: 'Escalation requested',
        detail: 'Request human review for enterprise deals until constraints are revised',
        reason: 'pricing_drift_warning'
      },
      {
        hour: 38,
        type: 'dsg_session',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        label: 'DSG Review triggered',
        detail: 'Cross-domain boundary collision: enterprise pricing <-> marketing offers',
        title: 'Enterprise Pricing Calibration',
        facilitatorRole: 'Sales Steward',
        trigger: 'Envelope boundaries intersect across domains',
        scope: 'cross-domain boundary collision',
        involvedEnvelopeIds: ['ENV-003', 'ENV-006'],
        impactSummary: [
          'Boundary overlap: enterprise pricing recommendations feed outbound offer generation',
          'People-impact: incentive fairness + adverse-action sensitivity in enterprise segments',
          'Data boundary: PII sharing/export rules differ by domain and vendor',
        ],
        resolutionPolicy: [
          'Authority: outbound offers remain under Marketing Offers (ENV-006)',
          'Pricing: tighten max discount for enterprise; require review on drift >= 10%',
          'Telemetry: add boundary-interaction signals for price->offer pathways',
        ],
        artifactOutput: [
          { type: 'DSG', label: 'DSG Event Record', detail: 'Decision authority clarified; precedent recorded' },
          { type: 'Envelope revision', label: 'ENV-003 revised', detail: 'Tighten discount + add drift review threshold' },
          { type: 'Envelope revision', label: 'ENV-006 clarified', detail: 'Explicit ownership for enterprise bundles' },
          { type: 'Annotation', label: 'Boundary precedent', detail: 'Cross-domain interaction documented for future routing' },
        ],
        participants: [
          { name: 'Glen', role: 'Sales Steward', status: 'active' },
          { name: 'Sarah', role: 'Engineering Steward', status: 'active' },
          { name: 'Kevin', role: 'Data Steward', status: 'observing' },
          { name: 'Maria', role: 'HR Steward', status: 'observing' },
          { name: 'Alex', role: 'Domain Engineer', status: 'active' },
          { name: 'Jordan', role: 'Resiliency Steward', status: 'observing' },
          { name: 'Sam', role: 'Business Domain', status: 'active' },
          { name: 'Taylor', role: 'Executive Steward', status: 'observing' }
        ]
      },
      {
        hour: 38.05,
        type: 'dsg_message',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        authorRole: 'Sales Steward',
        authorName: 'Glen',
        kind: 'context',
        text: 'Thanks everyone for joining. We need to review the enterprise pricing drift and decide whether to tighten the envelope.'
      },
      {
        hour: 38.15,
        type: 'dsg_message',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        authorRole: 'Engineering Steward',
        authorName: 'Sarah',
        kind: 'risk',
        text: 'Custom integration adds non-trivial delivery risk. Discounting too aggressively will compound delivery pressure.'
      },
      {
        hour: 38.25,
        type: 'dsg_message',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        authorRole: 'Domain Engineer',
        authorName: 'Alex',
        kind: 'evidence',
        text: 'Historically similar deals closed around $2.8M/year. The current AI recommendation is trending lower than our steward baseline.'
      },
      {
        hour: 38.4,
        type: 'dsg_message',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        authorRole: 'Data Steward',
        authorName: 'Kevin',
        kind: 'evidence',
        text: 'Data shows high close rates in the $2.6M-$3.0M band. Drift is concentrated in enterprise segments.'
      },
      {
        hour: 38.6,
        type: 'dsg_message',
        sessionId: 'DSG-001',
        envelopeId: 'ENV-003',
        severity: 'info',
        authorRole: 'Sales Steward',
        authorName: 'Glen',
        kind: 'proposal',
        text: 'Proposal: tighten max discount to 10% and require DSG review when drift >= 10% for enterprise deals.'
      },
      {
        hour: 39,
        type: 'revision',
        envelopeId: 'ENV-003',
        actorRole: 'Domain Engineer',
        severity: 'info',
        label: 'Envelope revised',
        detail: 'Tightened enterprise constraints after DSG calibration',
        reason: 'pricing_drift_warning',
        nextAssumptions: [
          'Historical price bands remain a valid anchor.',
          'Strategic deals can tolerate wider variance with steward review.',
          'Enterprise deals require DSG calibration when drift signals occur.'
        ],
        nextConstraints: ['Max discount: 10%', 'Geographic restrictions apply', 'Audit trail required', 'DSG review required: enterprise deals when drift >= 10%']
      },
      {
        hour: 39.2,
        type: 'revision',
        envelopeId: 'ENV-006',
        actorRole: 'Sales Steward',
        severity: 'info',
        label: 'Envelope revised',
        detail: 'Clarified enterprise bundle ownership after DSG boundary review',
        reason: 'pricing_drift_warning',
        nextAssumptions: [
          'Offers must remain consistent with brand and compliance constraints.',
          'High-value customer segments require additional scrutiny.',
          'Enterprise bundles require explicit cross-domain ownership.',
        ],
        nextConstraints: ['No protected-class targeting', 'Max discount: 12%', 'DSG review required for enterprise bundles', 'Owner lock: outbound offers remain under Marketing envelope']
      }
    ]
  }
}
