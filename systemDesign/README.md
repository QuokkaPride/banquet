# AWS Deployment Architecture

## Overview

The Smart Ordering system is deployed as a serverless application on AWS, optimized for simplicity and low operational cost.

## Architecture

```
EventBridge (every 5 min) → Lambda → RDS PostgreSQL
                              ↓
                         CloudWatch Logs
                              ↓
                         SNS (Staff Alerts)
                              ↑
                         API Gateway (EMR/EHR Integration)
```

## Components

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **EventBridge** | Triggers ordering system | `rate(5 minutes)` |
| **Lambda** | Executes smart ordering logic | Node.js 20, 512MB, 5min timeout |
| **RDS PostgreSQL** | Stores patients, orders, recipes | db.t3.micro, encrypted |
| **CloudWatch** | Audit logging & monitoring | 30-day retention |
| **SNS** | Staff notifications for flagged orders | Topics by priority |
| **API Gateway** | External system integration | REST API for EMR/EHR |

## Why This Architecture

- **Serverless**: No servers to manage, automatic scaling
- **Cost-effective**: ~$16/month base (Lambda free tier, RDS ~$15)
- **Simple**: 4 core components, easy to understand and maintain
- **Extensible**: SNS + API Gateway support future integrations

## Future Integrations (via API Gateway)

- EMR/EHR systems for real-time patient data
- Nursing station dashboard
- Kitchen display system
- Dietitian review workflow

## Diagram

See `banquet_aws_flowchart.png` in this directory.
