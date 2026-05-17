# Micro-Courant System Architecture

## Overview

Micro-Courant is a decentralized energy grid settlement and microbilling infrastructure built on Stellar and Soroban. The system enables real-time prepaid/postpaid energy tracking, P2P energy sharing, subsidy distribution, and community governance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                            │
├──────────────────┬──────────────────┬────────────────────────────┤
│  Household       │  Operator         │  Governance                 │
│  Dashboard       │  Dashboard       │  Dashboard                  │
│  (React/PWA)     │  (React)         │  (React)                    │
└────────┬─────────┴────────┬─────────┴────────────┬─────────────────┘
         │                  │                      │
         └──────────────────┼──────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      API Gateway Layer                           │
│  (Rate Limiting, Auth, Audit Logs, Proxying)                    │
└────────┬──────────────────┬──────────────────┬─────────────────┘
         │                  │                  │
┌────────▼────────┐ ┌──────▼────────┐ ┌──────▼────────────────────┐
│  Telemetry      │ │  Billing       │ │  Contracts (Soroban)       │
│  Service        │ │  Engine        │ │  - EnergyMeterRegistry     │
│  (Node.js)      │ │  (Node.js)     │ │  - ConsumptionBilling      │
└────────┬────────┘ └──────┬────────┘ │  - P2PEnergyTrading        │
         │                │           │  - SubsidyGovernance       │
         │                │           │  - GridSettlement          │
         │                │           └────────────────────────────┘
         │                │
┌────────▼────────────────▼──────────────────────────────────────┐
│                      Data Layer                                  │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  PostgreSQL  │  Redis        │  MQTT Broker  │  Stellar Network     │
│  (Persistent)│  (Cache/Queue)│  (IoT Data)   │  (Settlement)        │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

## Core Components

### 1. Smart Contracts (Soroban)

#### EnergyMeterRegistry
- Manages energy meter registration and status
- Tracks trust scores for fraud detection
- Supports meter suspension and reactivation
- Emits events for meter lifecycle changes

#### ConsumptionBilling
- Handles prepaid and postpaid billing modes
- Records energy consumption and calculates costs
- Manages household balances
- Supports tariff rate configuration

#### P2PEnergyTrading
- Enables peer-to-peer energy trading
- Manages energy offers and requests
- Matches buyers and sellers
- Executes atomic settlements on Stellar

#### SubsidyGovernance
- Manages community subsidy programs
- Supports proposal creation and voting
- Handles subsidy allocation and distribution
- Manages community fund

#### GridSettlement
- Processes settlement transactions
- Manages settlement queue
- Handles failed settlements with retry logic
- Provides settlement status tracking

### 2. Backend Services

#### Telemetry Service
- Ingests meter readings via MQTT
- Processes readings with fraud detection
- Updates household balances in real-time
- Publishes grid load statistics

#### API Gateway
- Central entry point for all API requests
- Implements rate limiting and authentication
- Routes requests to appropriate services
- Maintains audit logs for compliance

#### Billing Engine
- Processes billing calculations
- Manages identity verification (WaveID)
- Executes settlement transactions
- Handles subsidy applications

### 3. Frontend Applications

#### Household Dashboard
- Mobile-first, offline-capable PWA
- Real-time usage tracking
- Balance management and recharge
- Alert notifications

#### Operator Dashboard
- Grid load monitoring
- Meter management
- Payment tracking
- Enforcement actions

#### Governance Dashboard
- Proposal creation and voting
- Subsidy management
- Tariff configuration
- Community fund oversight

### 4. Communication Layer

#### SMS/USSD Service
- Sends alerts via SMS
- Provides USSD interface for low-connectivity areas
- Supports bulk notifications
- Integrates with Twilio/Africa's Talking

### 5. IoT Integration

#### MQTT Broker
- Receives meter readings from IoT devices
- Supports MQTT and WebSocket protocols
- Enables real-time data flow
- Handles device authentication

## Data Flow

### Meter Reading Flow

```
IoT Meter → MQTT Broker → Telemetry Service → Fraud Detection
                                                        ↓
                                                 Queue Processing
                                                        ↓
                                                 PostgreSQL Storage
                                                        ↓
                                                 Balance Update
                                                        ↓
                                                 Redis Cache Update
```

### Billing Flow

```
Telemetry Service → Billing Engine → Tariff Calculation
                                            ↓
                                    Subsidy Application
                                            ↓
                                    Balance Deduction
                                            ↓
                                    Settlement Queue
                                            ↓
                                    Stellar Transaction
```

### P2P Trading Flow

```
Producer → Create Offer → P2PEnergyTrading Contract
Consumer → Create Request → P2PEnergyTrading Contract
                ↓
            Matching Engine
                ↓
            Trade Execution
                ↓
            Settlement Contract
                ↓
            Stellar Payment
```

## Security Architecture

### Authentication
- JWT-based authentication for API access
- Stellar signature verification for wallet-based auth
- WaveID integration for identity verification
- Role-based access control (RBAC)

### Authorization
- Operator roles for grid management
- Household roles for consumer access
- Governance roles for community decisions
- Contract-level permissions on Soroban

### Data Security
- Encryption at rest (PostgreSQL)
- TLS for all network communications
- Secure secret management (Kubernetes Secrets)
- Audit logging for all sensitive operations

## Scalability Considerations

### Horizontal Scaling
- API Gateway: 3-10 replicas with HPA
- Telemetry Service: 2-8 replicas with HPA
- Billing Engine: 2-4 replicas
- Frontend: 2 replicas per dashboard

### Vertical Scaling
- PostgreSQL: Up to 2Gi memory, 1 CPU
- Redis: Up to 512Mi memory, 500m CPU
- Application pods: Configurable resource limits

### Caching Strategy
- Redis for session data
- Redis for rate limiting
- Redis for real-time grid statistics
- Application-level caching for frequently accessed data

## High Availability

### Database HA
- PostgreSQL StatefulSet with persistent storage
- Automated backups (configured externally)
- Connection pooling for resilience

### Service HA
- Multiple replicas for all services
- Health checks and liveness probes
- Automatic pod restart on failure
- Rolling updates for zero-downtime deployments

### Network HA
- Load balancer for API Gateway
- Ingress with TLS termination
- Service mesh (optional) for advanced routing

## Monitoring and Observability

### Metrics
- Prometheus for metrics collection
- Grafana for visualization
- Custom metrics for business logic
- Resource utilization monitoring

### Logging
- Structured JSON logging
- Centralized log aggregation
- Log levels: error, warn, info, debug
- Audit trail for compliance

### Tracing
- Distributed tracing (optional)
- Request correlation IDs
- Performance monitoring
- Error tracking

## Disaster Recovery

### Backup Strategy
- PostgreSQL daily backups
- Redis persistence to disk
- Configuration version control
- Smart contract deployment records

### Recovery Procedures
- Database restore from backup
- Service redeployment from Docker images
- Contract redeployment from verified source
- Failover to backup region (if configured)
