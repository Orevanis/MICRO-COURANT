# Micro-Courant Developer Onboarding Guide

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **Rust**: 1.70.0 or higher (for smart contracts)
- **Docker**: 20.10.0 or higher
- **Docker Compose**: 2.0.0 or higher
- **Git**: 2.30.0 or higher
- **kubectl**: 1.24.0 or higher (for Kubernetes deployment)

### Recommended Tools

- **VS Code**: With recommended extensions
- **Postman**: For API testing
- **Freighter**: Stellar wallet extension
- **Mosquitto Client**: For MQTT testing

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/micro-courant/micro-courant.git
cd micro-courant
```

### 2. Install Dependencies

#### Root Dependencies

```bash
npm install
```

#### Backend Services

```bash
cd backend/telemetry
npm install

cd ../api-gateway
npm install

cd ../billing-engine
npm install
```

#### Frontend Applications

```bash
cd frontend/household-dashboard
npm install

cd ../operator-dashboard
npm install

cd ../governance-dashboard
npm install
```

#### Smart Contracts

```bash
cd contracts/energy_meter_registry
cargo build

cd ../consumption_billing
cargo build

cd ../p2p_energy_trading
cargo build

cd ../subsidy_governance
cargo build

cd ../grid_settlement
cargo build
```

### 3. Environment Configuration

Copy the example environment files and configure them:

```bash
cp backend/telemetry/.env.example backend/telemetry/.env
cp backend/api-gateway/.env.example backend/api-gateway/.env
cp backend/billing-engine/.env.example backend/billing-engine/.env
cp frontend/household-dashboard/.env.example frontend/household-dashboard/.env
cp frontend/operator-dashboard/.env.example frontend/operator-dashboard/.env
cp frontend/governance-dashboard/.env.example frontend/governance-dashboard/.env
cp infra/iot-simulator/.env.example infra/iot-simulator/.env
```

Update the following values in each `.env` file:

- Database credentials
- Redis configuration
- Stellar network settings
- JWT secrets
- SMS provider credentials (if using)

### 4. Start Local Development

#### Using Docker Compose

```bash
docker-compose up -d
```

This starts:

- PostgreSQL
- Redis
- Mosquitto MQTT broker
- All backend services
- All frontend applications

#### Manual Startup

Start infrastructure services:

```bash
docker-compose up -d postgres redis mosquitto
```

Start backend services (in separate terminals):

```bash
cd backend/telemetry
npm run dev

cd backend/api-gateway
npm run dev

cd backend/billing-engine
npm run dev
```

Start frontend applications (in separate terminals):

```bash
cd frontend/household-dashboard
npm run dev

cd frontend/operator-dashboard
npm run dev

cd frontend/governance-dashboard
npm run dev
```

Start IoT simulator:

```bash
cd infra/iot-simulator
npm start
```

## Project Structure

```
micro-courant/
├── backend/
│   ├── telemetry/          # Telemetry ingestion service
│   ├── api-gateway/        # API gateway with rate limiting
│   └── billing-engine/     # Billing orchestration service
├── frontend/
│   ├── household-dashboard/ # Consumer-facing dashboard
│   ├── operator-dashboard/  # Grid operator dashboard
│   └── governance-dashboard/ # Community governance dashboard
├── contracts/
│   ├── energy_meter_registry/
│   ├── consumption_billing/
│   ├── p2p_energy_trading/
│   ├── subsidy_governance/
│   └── grid_settlement/
├── sdk/
│   ├── js/                 # JavaScript SDK
│   └── rust/               # Rust SDK
├── infra/
│   ├── docker/             # Docker configurations
│   ├── kubernetes/         # Kubernetes manifests
│   └── iot-simulator/      # IoT meter simulator
└── docs/
    ├── architecture/       # Architecture documentation
    ├── api/                # API documentation
    └── guides/             # Developer guides
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the coding standards in `CONTRIBUTING.md`
- Write tests for new functionality
- Update documentation as needed

### 3. Test Locally

```bash
# Run tests
npm test

# Run linting
npm run lint

# Build contracts
cd contracts/energy_meter_registry
cargo test
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

Follow the commit message conventions in `CONTRIBUTING.md`.

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub with:

- Description of changes
- Link to related issues
- Test results
- Screenshots for UI changes

## Smart Contract Development

### Prerequisites

- Rust toolchain installed
- Soroban CLI installed

### Building Contracts

```bash
cd contracts/energy_meter_registry
cargo build --release
```

### Testing Contracts

```bash
cargo test
```

### Deploying Contracts

```bash
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/energy_meter_registry.wasm
```

### Interacting with Contracts

```bash
soroban contract invoke --id <contract_id> --function <function_name> --arg <arguments>
```

## Backend Development

### Running Tests

```bash
cd backend/telemetry
npm test

cd backend/api-gateway
npm test
```

### Running with Hot Reload

```bash
npm run dev
```

### Database Migrations

```bash
# Apply schema
psql -U courant_user -d micro_courant -f backend/telemetry/src/db/schema.sql

# Apply billing schema
psql -U courant_user -d micro_courant -f backend/billing-engine/src/db/schema.sql
```

## Frontend Development

### Running Development Server

```bash
cd frontend/household-dashboard
npm run dev
```

### Building for Production

```bash
npm run build
```

### Testing

```bash
npm test
```

### PWA Testing

To test PWA functionality:

1. Run development server
2. Open Chrome DevTools
3. Go to Application tab
4. Check Service Workers and Manifest

## API Testing

### Using Postman

1. Import the Postman collection (if available)
2. Set environment variables
3. Test endpoints

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"stellar_address":"G...","signature":"..."}'

# Get balance
curl http://localhost:3000/api/v1/billing/balance/HH-001 \
  -H "Authorization: Bearer <token>"
```

## Debugging

### Backend Debugging

```bash
# Run with debug logging
LOG_LEVEL=debug npm run dev
```

### Frontend Debugging

1. Open browser DevTools
2. Use React DevTools extension
3. Check Console for errors
4. Use Network tab for API calls

### MQTT Debugging

```bash
# Subscribe to all meter readings
mosquitto_sub -h localhost -t "energy/meters/+/readings" -v
```

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

1. Check if PostgreSQL is running: `docker-compose ps`
2. Check connection string in `.env`
3. Verify database exists

### MQTT Connection Failed

1. Check if Mosquitto is running: `docker-compose ps`
2. Verify broker address in `.env`
3. Check firewall settings

### Contract Deployment Failed

1. Verify Soroban CLI is installed
2. Check network configuration
3. Ensure sufficient XLM for fees

## Resources

### Documentation

- [Architecture Guide](../architecture/system-architecture.md)
- [API Reference](../api/api-reference.md)
- [Smart Contract Guide](../guides/smart-contracts.md)
- [Deployment Guide](../guides/deployment.md)

### External Links

- [Soroban Documentation](https://soroban.stellar.org/docs/)
- [Stellar Developer Portal](https://developers.stellar.org/)
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)

### Community

- GitHub Issues: https://github.com/micro-courant/micro-courant/issues
- Discord: [link to Discord]
- Email: dev@micro-courant.org

## Next Steps

1. Complete the setup steps above
2. Read the architecture documentation
3. Explore the codebase
4. Make your first contribution
5. Join the community discussions

## Getting Help

If you encounter issues:

1. Check the documentation
2. Search existing GitHub issues
3. Create a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Error logs

Happy coding! 🚀
