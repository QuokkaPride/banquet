2026-01-06_11_documentation-aws.md
# Step 11: Documentation & AWS Architecture

## Metadata
- **Order**: 11 of 11
- **Estimated Time**: 10 minutes
- **Dependencies**: Steps 01-10 (documentation of completed work)
- **Creates**:
  - `systemDesign/README.md`
  - `systemDesign/diagram-components.txt`
  - Updates to `CLAUDE.md` (final cleanup)

## Purpose
Document the system for reviewers and provide AWS deployment recommendations.

---

## Prompt for LLM
```
Create documentation and AWS deployment design.

### 1. Create `systemDesign/README.md`:

# AWS Deployment Architecture

## Current Implementation (MVP)

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                    │
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐ │
│  │  EventBridge │────▶│    Lambda    │────▶│   RDS PostgreSQL     │ │
│  │    (Cron)    │     │   Function   │     │    (db.t3.micro)     │ │
│  └──────────────┘     └──────────────┘     └──────────────────────┘ │
│        │                     │                                       │
│        ▼                     ▼                                       │
│  Schedule:            ┌──────────────┐                              │
│  - 5:00 AM            │  CloudWatch  │                              │
│  - 9:00 AM            │    Logs      │                              │
│  - 3:00 PM            └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Components Table
| Component | AWS Service | Configuration | Purpose |
|-----------|-------------|---------------|---------|
| Scheduler | EventBridge | Cron: 0 5,9,15 * * ? * | Trigger at meal windows |
| Compute | Lambda | Node.js 20, 512MB, 5min | Execute ordering |
| Database | RDS PostgreSQL | db.t3.micro | Store data |
| Logging | CloudWatch Logs | 30-day retention | Audit trail |

### Estimated Monthly Cost (Low Volume)
- Lambda: ~$0 (free tier)
- RDS db.t3.micro: ~$15/month
- EventBridge: ~$0 (free tier)
- CloudWatch: ~$1/month
- **Total: ~$16/month**

---

## Scaled Architecture (Production)

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                                       │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ EventBridge │────▶│   Lambda    │────▶│     SQS     │                   │
│  │   (Cron)    │     │ (Scheduler) │     │   Queue     │                   │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                   │
│                                                  │                          │
│                                                  ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Step Functions                                │   │
│  │  ┌─────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │   │
│  │  │ Check   │──▶│   Compose   │──▶│   Create    │──▶│   Notify    │ │   │
│  │  │Eligiblty│   │    Meal     │   │   Order     │   │   Staff     │ │   │
│  │  └─────────┘   └─────────────┘   └─────────────┘   └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                │                   │                │             │
│         ▼                ▼                   ▼                ▼             │
│  ┌─────────────┐  ┌─────────────┐    ┌─────────────┐  ┌─────────────┐      │
│  │ ElastiCache │  │   Lambda    │    │     RDS     │  │     SNS     │      │
│  │   (Redis)   │  │  Functions  │    │ PostgreSQL  │  │   Topics    │      │
│  │  (Recipes)  │  │             │    │  Multi-AZ   │  │             │      │
│  └─────────────┘  └─────────────┘    └─────────────┘  └─────────────┘      │
│                                                              │              │
│                          ┌─────────────┐                     │              │
│                          │ API Gateway │◀────────────────────┘              │
│                          │(On-Demand)  │                                    │
│                          └─────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
Scaling Benefits

SQS: Handle patient spikes, retry failed orders
Step Functions: Visual workflow, built-in error handling
ElastiCache: Reduce DB load for recipe lookups
Multi-AZ RDS: No single point of failure
SNS: Real-time staff notifications

Estimated Monthly Cost (1000 patients)

Lambda: ~$5
Step Functions: ~$10
SQS: ~$1
RDS Multi-AZ: ~$50
ElastiCache: ~$25
SNS: ~$1
Total: ~$92/month


Security Considerations
ConcernSolutionDB credentialsAWS Secrets ManagerNetworkVPC with private subnetsEncryption at restRDS encryptionEncryption in transitTLSAccess controlIAM least privilegeAuditCloudTrail
2. Create systemDesign/diagram-components.txt:
MVP DIAGRAM COMPONENTS
Shapes:

AWS EventBridge icon
AWS Lambda icon
AWS RDS icon
AWS CloudWatch icon

Connections:

EventBridge --[triggers]--> Lambda
Lambda --[reads/writes]--> RDS
Lambda --[logs to]--> CloudWatch

Labels:

EventBridge: "EventBridge (Cron Schedule)"
Lambda: "Smart Ordering Lambda"
RDS: "PostgreSQL"
CloudWatch: "CloudWatch Logs"

Annotation: "Cron: 0 5,9,15 * * ? * (5am, 9am, 3pm)"
SCALED DIAGRAM COMPONENTS
Additional shapes:

AWS SQS, Step Functions, ElastiCache, SNS, API Gateway, X-Ray

Step Functions states:

Check Eligibility
Compose Meal
Create Order
Notify Staff

Connections:

EventBridge --> Scheduler Lambda --> SQS
SQS --> Step Functions --> Processing Lambdas --> RDS
Compose step --> ElastiCache
Notify step --> SNS
API Gateway --> Step Functions (alternate trigger)
All --> CloudWatch/X-Ray

3. Update CLAUDE.md with final "How to Run" section if not present:
Add to CLAUDE.md:
Quick Start
bashnpm install
npm run db-up
npm run init-db
npm test
npm start
```
```

---

## Validation Checklist
- [ ] `systemDesign/README.md` created with both diagrams
- [ ] `systemDesign/diagram-components.txt` created
- [ ] CLAUDE.md has complete quick start section
- [ ] Cost estimates included
- [ ] Security considerations documented