# Kubernetes Deployment Configuration

This directory contains Kubernetes manifests for deploying Micro-Courant to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm (optional, for additional deployments)
- cert-manager (for TLS certificates)

## Deployment Steps

### 1. Create Namespace

```bash
kubectl apply -f namespaces.yaml
```

### 2. Apply Secrets

Update the secrets in `secrets.yaml` with your actual values, then apply:

```bash
kubectl apply -f secrets.yaml
```

### 3. Apply ConfigMaps

```bash
kubectl apply -f configmaps.yaml
```

### 4. Deploy StatefulSets (Databases)

```bash
kubectl apply -f statefulsets.yaml
```

Wait for PostgreSQL and Redis to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n micro-courant --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n micro-courant --timeout=300s
```

### 5. Deploy Applications

```bash
kubectl apply -f deployments/api-gateway.yaml
kubectl apply -f deployments/telemetry.yaml
kubectl apply -f deployments/billing.yaml
kubectl apply -f deployments/frontend.yaml
```

### 6. Deploy Monitoring

```bash
kubectl apply -f monitoring.yaml
```

### 7. Configure Ingress

```bash
kubectl apply -f ingress.yaml
```

## Scaling

The API Gateway and Telemetry services are configured with Horizontal Pod Autoscalers (HPA). You can adjust the scaling parameters in their respective deployment files.

```bash
kubectl get hpa -n micro-courant
```

## Monitoring

Access Grafana at the LoadBalancer IP:

```bash
kubectl get svc grafana-service -n micro-courant
```

Default credentials are set in the `grafana-secret`. Change these before production deployment.

## Rollback

To rollback to a previous deployment:

```bash
kubectl rollout undo deployment/api-gateway -n micro-courant
```

## Cleanup

To remove all Micro-Courant resources:

```bash
kubectl delete namespace micro-courant
```

## Production Checklist

- [ ] Update all secrets with production values
- [ ] Configure TLS certificates
- [ ] Set up backup for PostgreSQL
- [ ] Configure persistent storage with appropriate size
- [ ] Enable pod disruption budgets
- [ ] Configure resource quotas
- [ ] Set up network policies
- [ ] Enable audit logging
- [ ] Configure alerting rules
- [ ] Test disaster recovery procedures
