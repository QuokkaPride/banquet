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
| Scheduler | EventBridge | Cron: `0 5,9,15 * * ? *` | Trigger at meal windows |
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
```

### Scaling Benefits

- **SQS**: Handle patient spikes, retry failed orders
- **Step Functions**: Visual workflow, built-in error handling
- **ElastiCache**: Reduce DB load for recipe lookups
- **Multi-AZ RDS**: No single point of failure
- **SNS**: Real-time staff notifications

### Estimated Monthly Cost (1000 patients)

- Lambda: ~$5
- Step Functions: ~$10
- SQS: ~$1
- RDS Multi-AZ: ~$50
- ElastiCache: ~$25
- SNS: ~$1
- **Total: ~$92/month**

---

## Security Considerations

| Concern | Solution |
|---------|----------|
| DB credentials | AWS Secrets Manager |
| Network | VPC with private subnets |
| Encryption at rest | RDS encryption |
| Encryption in transit | TLS |
| Access control | IAM least privilege |
| Audit | CloudTrail |

---

## Implementation Notes

### MVP Deployment Steps

1. Create RDS PostgreSQL instance (db.t3.micro)
2. Package Lambda function with Prisma client
3. Configure EventBridge rule with cron schedule
4. Set up CloudWatch log group
5. Configure VPC security groups

### Production Considerations

- Use AWS CDK or Terraform for infrastructure as code
- Implement blue/green deployments for zero-downtime updates
- Set up CloudWatch alarms for failure detection
- Configure X-Ray for distributed tracing
- Implement dead-letter queues for failed orders
