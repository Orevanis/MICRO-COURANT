# Micro-Courant API Reference

## Base URL

- **Production**: `https://api.micro-courant.org`
- **Staging**: `https://staging-api.micro-courant.org`
- **Local**: `http://localhost:3000`

## Authentication

All API requests (except `/health` and `/api/v1/auth/*`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

All responses follow this format:

```json
{
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Error responses:

```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Strict endpoints**: 10 requests per minute
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Authentication Endpoints

### Login with Stellar

**POST** `/api/v1/auth/login`

Authenticate using a Stellar wallet signature.

**Request Body:**
```json
{
  "stellar_address": "G...",
  "signature": "base64_encoded_signature"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "stellar_address": "G...",
    "role": "household"
  }
}
```

### Refresh Token

**POST** `/api/v1/auth/refresh`

Refresh an expired JWT token.

**Request Body:**
```json
{
  "token": "expired_token"
}
```

**Response:**
```json
{
  "token": "new_jwt_token"
}
```

### Verify Token

**GET** `/api/v1/auth/verify`

Verify if a token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_id",
    "stellar_address": "G...",
    "role": "household"
  }
}
```

---

## Telemetry Endpoints

### Ingest Single Reading

**POST** `/api/v1/telemetry/ingest`

Submit a single meter reading.

**Request Body:**
```json
{
  "meter_id": "MTR-0001",
  "household_id": "HH-001",
  "consumption_kwh": 5.5,
  "timestamp": 1705314000000,
  "signature": "base64_encoded_signature"
}
```

**Response:**
```json
{
  "status": "queued",
  "reading_id": "read_123456"
}
```

### Batch Ingest Readings

**POST** `/api/v1/telemetry/ingest/batch`

Submit multiple meter readings.

**Request Body:**
```json
{
  "readings": [
    {
      "meter_id": "MTR-0001",
      "household_id": "HH-001",
      "consumption_kwh": 5.5,
      "timestamp": 1705314000000,
      "signature": "signature1"
    },
    {
      "meter_id": "MTR-0002",
      "household_id": "HH-002",
      "consumption_kwh": 3.2,
      "timestamp": 1705314000000,
      "signature": "signature2"
    }
  ]
}
```

**Response:**
```json
{
  "status": "queued",
  "count": 2,
  "reading_ids": ["read_123456", "read_123457"]
}
```

### Get Meter Statistics

**GET** `/api/v1/telemetry/meter/{meter_id}/stats`

Retrieve statistics for a specific meter.

**Query Parameters:**
- `period`: `hour` | `day` | `week` | `month` (default: `day`)

**Response:**
```json
{
  "meter_id": "MTR-0001",
  "period": "day",
  "total_consumption": 45.5,
  "average_consumption": 1.9,
  "peak_consumption": 5.5,
  "readings_count": 24,
  "readings": [
    {
      "timestamp": 1705314000000,
      "consumption_kwh": 5.5
    }
  ]
}
```

### Get Grid Load

**GET** `/api/v1/telemetry/grid/load`

Retrieve current grid load statistics.

**Response:**
```json
{
  "current_load": 85.6,
  "capacity": 120.0,
  "utilization": 71.3,
  "peak_load": 95.0,
  "zone_breakdown": [
    {
      "zone": "Zone A",
      "load": 45.0,
      "capacity": 50.0
    }
  ]
}
```

---

## Billing Endpoints

### Get Balance

**GET** `/api/v1/billing/balance/{household_id}`

Retrieve current balance for a household.

**Response:**
```json
{
  "household_id": "HH-001",
  "balance": 50.0,
  "currency": "XLM",
  "billing_mode": "prepaid",
  "total_consumption": 125.5,
  "total_paid": 175.5
}
```

### Recharge Balance

**POST** `/api/v1/billing/recharge`

Add funds to a household balance.

**Request Body:**
```json
{
  "household_id": "HH-001",
  "amount": 50.0,
  "payment_method": "stellar",
  "transaction_id": "stellar_tx_hash"
}
```

**Response:**
```json
{
  "status": "success",
  "household_id": "HH-001",
  "previous_balance": 50.0,
  "new_balance": 100.0,
  "amount_added": 50.0
}
```

### Get Tariff Rate

**GET** `/api/v1/billing/tariff`

Retrieve current tariff rate.

**Response:**
```json
{
  "base_rate": 100,
  "unit": "stroops_per_kwh",
  "xlm_rate": 0.00001,
  "effective_date": "2024-01-01",
  "tiered_pricing": [
    {
      "tier": "0-10 kWh",
      "rate": 100
    },
    {
      "tier": "10-50 kWh",
      "rate": 95
    }
  ]
}
```

### Process Billing

**POST** `/api/v1/billing/process`

Manually trigger billing processing for a household.

**Request Body:**
```json
{
  "household_id": "HH-001",
  "consumption_kwh": 10.5,
  "meter_id": "MTR-0001"
}
```

**Response:**
```json
{
  "billing_id": "bill_123456",
  "status": "processed",
  "cost": 1050,
  "subsidy_applied": 157.5,
  "final_cost": 892.5
}
```

---

## Identity Endpoints

### Register Identity

**POST** `/api/v1/identity/register`

Register a new identity with WaveID.

**Request Body:**
```json
{
  "stellar_address": "G...",
  "role": "household",
  "metadata": {
    "name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**Response:**
```json
{
  "success": true,
  "identity_id": "uuid-1234",
  "stellar_address": "G...",
  "role": "household"
}
```

### Get Identity

**GET** `/api/v1/identity/{stellar_address}`

Retrieve identity information.

**Response:**
```json
{
  "id": "uuid-1234",
  "stellar_address": "G...",
  "role": "household",
  "verified": true,
  "metadata": {
    "name": "John Doe",
    "phone": "+1234567890"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Verify Identity

**POST** `/api/v1/identity/verify`

Verify an identity using a signature.

**Request Body:**
```json
{
  "stellar_address": "G...",
  "signature": "base64_encoded_signature"
}
```

**Response:**
```json
{
  "verified": true,
  "identity": {
    "id": "uuid-1234",
    "stellar_address": "G...",
    "role": "household"
  }
}
```

---

## Settlement Endpoints

### Create Settlement

**POST** `/api/v1/settlement/create`

Create a new settlement transaction.

**Request Body:**
```json
{
  "type": "consumption_billing",
  "from_address": "HH-001",
  "to_address": "GRID-SETTLEMENT",
  "amount": 50.0,
  "reference_id": "bill_123456"
}
```

**Response:**
```json
{
  "settlement_id": "set_123456",
  "type": "consumption_billing",
  "status": "pending",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Process Pending Settlements

**POST** `/api/v1/settlement/process`

Process pending settlement transactions.

**Request Body:**
```json
{
  "batch_size": 10
}
```

**Response:**
```json
{
  "processed": 10,
  "successful": 9,
  "failed": 1,
  "results": [
    {
      "settlement_id": "set_123456",
      "status": "completed",
      "transaction_hash": "stellar_tx_hash"
    }
  ]
}
```

### Get Settlement Status

**GET** `/api/v1/settlement/{settlement_id}`

Retrieve settlement status.

**Response:**
```json
{
  "settlement_id": "set_123456",
  "type": "consumption_billing",
  "status": "completed",
  "transaction_hash": "stellar_tx_hash",
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:31:00Z"
}
```

---

## Governance Endpoints

### Create Proposal

**POST** `/api/v1/governance/proposal`

Create a new governance proposal.

**Request Body:**
```json
{
  "proposer": "G...",
  "proposal_type": "tariff",
  "title": "Reduce tariff for low-income households",
  "description": "This proposal aims to reduce the base tariff by 15% for households classified as low-income.",
  "voting_period_days": 7
}
```

**Response:**
```json
{
  "proposal_id": "prop_123456",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Cast Vote

**POST** `/api/v1/governance/vote`

Cast a vote on a proposal.

**Request Body:**
```json
{
  "voter": "G...",
  "proposal_id": "prop_123456",
  "vote_option": "yes"
}
```

**Response:**
```json
{
  "success": true,
  "vote_id": "vote_123456"
}
```

### Finalize Proposal

**POST** `/api/v1/governance/finalize/{proposal_id}`

Finalize a proposal and determine outcome.

**Response:**
```json
{
  "proposal_id": "prop_123456",
  "status": "passed",
  "yes_votes": 45,
  "no_votes": 12,
  "abstain_votes": 5,
  "finalized_at": "2024-01-22T10:30:00Z"
}
```

---

## P2P Trading Endpoints

### Create Offer

**POST** `/api/v1/p2p/offer`

Create a new energy offer.

**Request Body:**
```json
{
  "producer_address": "G...",
  "energy_amount_kwh": 10,
  "price_per_kwh": 95,
  "expiry_hours": 24
}
```

**Response:**
```json
{
  "offer_id": "offer_123456",
  "status": "active",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

### Create Request

**POST** `/api/v1/p2p/request`

Create a new energy request.

**Request Body:**
```json
{
  "consumer_address": "G...",
  "energy_amount_kwh": 5,
  "max_price_per_kwh": 100,
  "expiry_hours": 24
}
```

**Response:**
```json
{
  "request_id": "req_123456",
  "status": "active",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

### Match Trade

**POST** `/api/v1/p2p/match`

Match an offer with a request.

**Request Body:**
```json
{
  "offer_id": "offer_123456",
  "request_id": "req_123456"
}
```

**Response:**
```json
{
  "trade_id": "trade_123456",
  "status": "matched",
  "energy_amount_kwh": 5,
  "price_per_kwh": 95,
  "total_cost": 475
}
```

---

## Health Check

### Health Check

**GET** `/health`

Check service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Readiness Check

**GET** `/health/ready`

Check if service is ready to accept traffic.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication token missing or invalid |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INVALID_REQUEST` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `INSUFFICIENT_BALANCE` | Insufficient balance for operation |
| `METER_NOT_FOUND` | Meter ID not found |
| `HOUSEHOLD_NOT_FOUND` | Household ID not found |
| `SETTLEMENT_FAILED` | Settlement transaction failed |
| `PROPOSAL_NOT_ACTIVE` | Proposal is not in voting state |
| `TRADE_EXPIRED` | Trade offer/request has expired |
| `INTERNAL_ERROR` | Internal server error |

---

## WebSocket Endpoints

### Meter Readings Stream

**WS** `/ws/meters/{meter_id}/readings`

Subscribe to real-time meter readings.

**Message Format:**
```json
{
  "meter_id": "MTR-0001",
  "consumption_kwh": 5.5,
  "timestamp": 1705314000000
}
```

### Grid Load Stream

**WS** `/ws/grid/load`

Subscribe to real-time grid load updates.

**Message Format:**
```json
{
  "current_load": 85.6,
  "capacity": 120.0,
  "utilization": 71.3,
  "timestamp": 1705314000000
}
```

### Settlement Updates

**WS** `/ws/settlements`

Subscribe to settlement status updates.

**Message Format:**
```json
{
  "settlement_id": "set_123456",
  "status": "completed",
  "transaction_hash": "stellar_tx_hash",
  "timestamp": 1705314000000
}
```
