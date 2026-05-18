# Micro-Courant Deployment Guide

## Overview

This guide covers deploying Micro-Courant to production environments using Docker, Kubernetes, and Terraform.

## Prerequisites

- Docker installed and configured
- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm (optional)
- Terraform (optional, for infrastructure provisioning)
- Domain name configured with DNS
- SSL certificates (or cert-manager)

## Environment Setup

### 1. Prepare Secrets

Create a `secrets.env` file with production values:

```bash
# PostgreSQL
POSTGRES_USER=your_production_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=micro_courant

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_32_chars_or_more

# Stellar
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK=testnet

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

### 2. Build Docker Images

Build and push images to your container registry:

```bash
# Tag images
docker tag micro-courant/api-gateway:latest your-registry.com/micro-courant/api-gateway:latest
docker tag micro-courant/telemetry:latest your-registry.com/micro-courant/telemetry:latest
docker tag micro-courant/billing-engine:latest your-registry.com/micro-courant/billing-engine:latest
docker tag micro-courant/household-dashboard:latest your-registry.com/micro-courant/household-dashboard:latest
docker tag micro-courant/operator-dashboard:latest your-registry.com/micro-courant/operator-dashboard:latest
docker tag micro-courant/governance-dashboard:latest your-registry.com/micro-courant/governance-dashboard:latest

# Push images
docker push your-registry.com/micro-courant/api-gateway:latest
docker push your-registry.com/micro-courant/telemetry:latest
docker push your-registry.com/micro-courant/billing-engine:latest
docker push your-registry.com/micro-courant/household-dashboard:latest
docker push your-registry.com/micro-courant/operator-dashboard:latest
docker push your-registry.com/micro-courant/governance-dashboard:latest
```

### 3. Update Kubernetes Manifests

Update image references in `infra/kubernetes/deployments/*.yaml`:

```yaml
image: your-registry.com/micro-courant/api-gateway:latest
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f infra/kubernetes/namespaces.yaml
```

### 2. Apply Secrets

Update `infra/kubernetes/secrets.yaml` with your production values, then apply:

```bash
kubectl apply -f infra/kubernetes/secrets.yaml
```

### 3. Apply ConfigMaps

```bash
kubectl apply -f infra/kubernetes/configmaps.yaml
```

### 4. Deploy StatefulSets

Deploy databases and message broker:

```bash
kubectl apply -f infra/kubernetes/statefulsets.yaml
```

Wait for pods to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n micro-courant --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n micro-courant --timeout=300s
kubectl wait --for=condition=ready pod -l app=mosquitto -n micro-courant --timeout=300s
```

### 5. Deploy Applications

```bash
kubectl apply -f infra/kubernetes/deployments/api-gateway.yaml
kubectl apply -f infra/kubernetes/deployments/telemetry.yaml
kubectl apply -f infra/kubernetes/deployments/billing.yaml
kubectl apply -f infra/kubernetes/deployments/frontend.yaml
```

### 6. Deploy Monitoring

```bash
kubectl apply -f infra/kubernetes/monitoring.yaml
```

### 7. Configure Ingress

Update hostnames in `infra/kubernetes/ingress.yaml`, then apply:

```bash
kubectl apply -f infra/kubernetes/ingress.yaml
```

### 8. Verify Deployment

Check all pods are running:

```bash
kubectl get pods -n micro-courant
```

Check services:

```bash
kubectl get svc -n micro-courant
```

Test health checks:

```bash
kubectl exec -n micro-courant deployment/api-gateway -- curl http://localhost:3000/health
```

## Database Initialization

### Run Database Migrations

```bash
# PostgreSQL schema
kubectl exec -n micro-courant postgres-0 -- psql -U courant_user -d micro_courant -f /docker-entrypoint-initdb.d/schema.sql

# Billing schema
kubectl exec -n micro-courant postgres-0 -- psql -U courant_user -d micro_courant -f /docker-entrypoint-initdb.d/billing-schema.sql
```

### Seed Initial Data

```bash
# Create admin user
kubectl exec -n micro-courant postgres-0 -- psql -U courant_user -d micro_courant -c "INSERT INTO identities (stellar_address, role, verified) VALUES ('GADMIN...', 'admin', true);"
```

## Smart Contract Deployment

### Deploy Contracts to Soroban

```bash
# Set network
export SOROBAN_NETWORK=testnet
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Deploy EnergyMeterRegistry
soroban contract deploy \
  --wasm contracts/energy_meter_registry/target/wasm32-unknown-unknown/release/energy_meter_registry.wasm \
  --source GADMIN...

# Deploy ConsumptionBilling
soroban contract deploy \
  --wasm contracts/consumption_billing/target/wasm32-unknown-unknown/release/consumption_billing.wasm \
  --source GADMIN...

# Deploy P2PEnergyTrading
soroban contract deploy \
  --wasm contracts/p2p_energy_trading/target/wasm32-unknown-unknown/release/p2p_energy_trading.wasm \
  --source GADMIN...

# Deploy SubsidyGovernance
soroban contract deploy \
  --wasm contracts/subsidy_governance/target/wasm32-unknown-unknown/release/subsidy_governance.wasm \
  --source GADMIN...

# Deploy GridSettlement
soroban contract deploy \
  --wasm contracts/grid_settlement/target/wasm32-unknown-unknown/release/grid_settlement.wasm \
  --source GADMIN...
```

### Initialize Contracts

```bash
# Initialize EnergyMeterRegistry
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GADMIN...

# Initialize ConsumptionBilling
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GADMIN... \
  --arg tariff_rate=100

# Initialize P2PEnergyTrading
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GADMIN...

# Initialize SubsidyGovernance
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GADMIN...

# Initialize GridSettlement
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GADMIN... \
  --arg anchor=GANCHOR... \
  --arg token=GTOKEN...
```

## SSL/TLS Configuration

### Using cert-manager

Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Apply:

```bash
kubectl apply -f infra/kubernetes/cert-manager.yaml
```

## Monitoring Setup

### Access Grafana

Get Grafana service URL:

```bash
kubectl get svc grafana-service -n micro-courant
```

Login with credentials from `grafana-secret`.

### Configure Dashboards

Import pre-configured dashboards:

- API Gateway metrics
- Telemetry service metrics
- Database performance
- Grid load statistics

### Set Up Alerts

Configure alert rules in Prometheus for:

- High error rates
- High latency
- Low pod availability
- Database connection issues

## Backup Strategy

### PostgreSQL Backups

Configure automated backups:

```bash
# Create backup script
kubectl exec -n micro-courant postgres-0 -- pg_dump -U courant_user micro_courant > backup.sql

# Schedule with cron
0 2 * * * kubectl exec -n micro-courant postgres-0 -- pg_dump -U courant_user micro_courant | gzip > /backups/micro-courant-$(date +\%Y\%m\%d).sql.gz
```

### Redis Persistence

Redis data is persisted to disk via StatefulSet volume.

### Smart Contract Backup

Store contract IDs and deployment records in version control.

## Scaling

### Horizontal Pod Autoscaling

HPA is configured for API Gateway and Telemetry services. Adjust in deployment files:

```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
```

### Vertical Scaling

Adjust resource limits in deployment files:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Rollback

### Rollback Deployment

```bash
kubectl rollout undo deployment/api-gateway -n micro-courant
```

### Rollback to Specific Revision

```bash
kubectl rollout undo deployment/api-gateway -n micro-courant --to-revision=2
```

### Rollback Smart Contract

Smart contracts are immutable. Deploy a new contract version and update references.

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n micro-courant
kubectl logs <pod-name> -n micro-courant
```

### Database Connection Issues

```bash
kubectl exec -n micro-courant <pod-name> -- nc -zv postgres-service 5432
```

### High CPU/Memory Usage

```bash
kubectl top pods -n micro-courant
kubectl top nodes
```

### Check Logs

```bash
# All pods
kubectl logs -n micro-courant -l app=api-gateway --tail=100

# Specific pod
kubectl logs -n micro-courant <pod-name> --tail=100 -f
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable TLS for all endpoints
- [ ] Configure network policies
- [ ] Enable pod security policies
- [ ] Set up RBAC for Kubernetes
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Vulnerability scanning
- [ ] Secret rotation policy

## Production Checklist

- [ ] All secrets configured
- [ ] SSL/TLS certificates installed
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Disaster recovery tested
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Support team trained

## Maintenance

### Regular Updates

- Update dependencies monthly
- Apply security patches immediately
- Review and update Kubernetes manifests
- Monitor and optimize resource usage

### Database Maintenance

- Run VACUUM ANALYZE weekly
- Update statistics monthly
- Review query performance
- Archive old data

### Contract Maintenance

- Monitor contract gas usage
- Review contract events
- Plan contract upgrades
- Test upgrade procedures

## Support

For deployment issues:

- Check logs: `kubectl logs -n micro-courant`
- Check events: `kubectl get events -n micro-courant`
- Review documentation in `/docs`
- Create GitHub issue with details

## Disaster Recovery

### Restore from Backup

```bash
# Restore PostgreSQL
kubectl exec -i -n micro-courant postgres-0 -- psql -U courant_user micro_courant < backup.sql
```

### Failover Procedure

1. Verify backup integrity
2. Deploy to backup region
3. Switch DNS to backup
4. Verify all services
5. Monitor for issues

### Recovery Testing

Test disaster recovery procedures quarterly:

- Backup restoration
- Service failover
- Data consistency verification
- Performance validation
