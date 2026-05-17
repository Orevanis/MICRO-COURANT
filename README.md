# Micro-Courant

Decentralized Community Energy Grid Settlement & Microbilling Infrastructure (Stellar DePIN System)

## Overview

Micro-Courant is a programmable energy infrastructure layer where electricity usage is measured, tokenized, and settled automatically through Soroban smart contracts and Stellar payment rails. It enables households, cooperatives, and rural energy providers to track, bill, and settle electricity usage in real time.

## Key Features

- **Real-time Prepaid & Postpaid Energy Tracking**: Monitor consumption in real-time with automatic balance deduction
- **Peer-to-Peer Energy Sharing**: Enable energy trading within microgrids between surplus producers and consumers
- **Automated Subsidy Distribution**: Community governance for tariff adjustments and subsidy applications
- **Low-Connectivity Support**: Offline-first design with SMS/USSD fallback for rural environments
- **On-Chain Settlement**: Verifiable energy usage converted to settlement units on Stellar

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Household   │  │   Operator   │  │  Governance  │          │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                        │
│              Rate Limiting • Audit Logs • Authentication        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Telemetry   │    │   Billing    │    │   Identity   │
│  Ingestion   │    │   Engine     │    │   Service    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
│         PostgreSQL (Billing/Usage)    Redis (Real-time)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Soroban Smart Contracts                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Meter   │ │Consumpt- │ │   P2P    │ │Subsidy   │           │
│  │Registry  │ │ion Billing│ │ Trading  │ │Governance│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                        ┌──────────┐                             │
│                        │Settlement│                             │
│                        └──────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Stellar Network                              │
│                    Payment Rails & Settlement                    │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
micro-courant/
├── frontend/              # React/React Native dashboards
│   ├── household-dashboard/
│   ├── operator-dashboard/
│   └── governance-dashboard/
├── backend/              # Node.js services
│   ├── telemetry/        # Energy meter data ingestion
│   ├── api-gateway/      # API gateway with rate limiting
│   └── billing-engine/   # Billing orchestration
├── contracts/            # Soroban smart contracts
│   ├── energy_meter_registry/
│   ├── consumption_billing/
│   ├── p2p_energy_trading/
│   ├── subsidy_governance/
│   └── grid_settlement/
├── sdk/                  # Integration toolkits
│   ├── js/              # JavaScript/TypeScript SDK
│   └── rust/            # Rust SDK
├── infra/                # Deployment infrastructure
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
└── docs/                 # Documentation
    ├── architecture/
    ├── guides/
    └── api/
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Rust >= 1.70.0
- Docker & Docker Compose
- Soroban CLI

### Installation

```bash
# Clone repository
git clone https://github.com/micro-courant/micro-courant.git
cd micro-courant

# Install dependencies
npm run install:all

# Start infrastructure
npm run docker:up

# Build and deploy contracts
npm run build:contracts
npm run deploy:contracts

# Start development servers
npm run dev
```

### Development

```bash
# Start telemetry service
npm run dev:telemetry

# Start API gateway
npm run dev:api-gateway

# Start billing engine
npm run dev:billing

# Start household dashboard
npm run dev:household

# Start operator dashboard
npm run dev:operator

# Start governance dashboard
npm run dev:governance
```

## Smart Contracts

### EnergyMeterRegistry
Registers energy meters and links them to on-chain identities with trust scores.

### ConsumptionBilling
Tracks energy usage records, converts consumption to payable units, and deducts balances.

### P2PEnergyTrading
Enables peer-to-peer energy trading within microgrids with automated matching and settlement.

### SubsidyGovernance
Community voting system for tariffs and subsidies with automatic discount application.

### GridSettlement
Final settlement layer for all energy transactions with atomic settlement guarantees.

## Testing

```bash
# Run all tests
npm test

# Run contract tests
npm run test:contracts

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

## Deployment

### Local Development
```bash
npm run docker:up
```

### Testnet Deployment
```bash
# Configure testnet environment
cp .env.testnet.example .env

# Deploy contracts to testnet
npm run deploy:contracts

# Deploy services
kubectl apply -f infra/kubernetes/testnet/
```

### Production Deployment
See [Deployment Guide](docs/guides/deployment.md) for production deployment instructions.

## Documentation

- [Architecture Guide](docs/architecture/system-architecture.md)
- [Smart Contract Documentation](docs/architecture/smart-contracts.md)
- [API Documentation](docs/api/api-reference.md)
- [Meter Onboarding Guide](docs/guides/meter-onboarding.md)
- [Billing Methodology](docs/guides/billing-methodology.md)
- [SMS/USSD Usage Guide](docs/guides/sms-ussd-guide.md)
- [Governance Explanation](docs/guides/governance.md)
- [Deployment Guide](docs/guides/deployment.md)

## Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contact

- GitHub: https://github.com/micro-courant/micro-courant
- Documentation: https://docs.micro-courant.org

## Acknowledgments

Built with:
- Stellar & Soroban
- React & React Native
- Node.js
- PostgreSQL & Redis
- Docker & Kubernetes
