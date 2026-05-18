# Smart Contract Development Guide

## Overview

This guide covers developing, testing, and deploying Soroban smart contracts for Micro-Courant.

## Prerequisites

- Rust 1.70.0 or higher
- Soroban CLI
- Cargo (Rust package manager)

### Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install soroban-cli

# Verify installation
soroban --version
```

## Project Structure

Each smart contract is a separate Rust project:

```
contracts/
├── energy_meter_registry/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       └── test.rs
├── consumption_billing/
├── p2p_energy_trading/
├── subsidy_governance/
└── grid_settlement/
```

## Contract Development

### 1. Create New Contract

```bash
cd contracts
soroban contract init --name new_contract
```

### 2. Define Contract Structure

```rust
use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct NewContract;

#[contractimpl]
impl NewContract {
    pub fn initialize(env: Env, admin: Address) {
        // Initialization logic
    }

    pub fn function_name(env: Env, arg1: u64) -> u64 {
        // Function logic
        42
    }
}
```

### 3. Build Contract

```bash
cd contracts/new_contract
cargo build --release --target wasm32-unknown-unknown
```

The WASM file will be at:

```
target/wasm32-unknown-unknown/release/new_contract.wasm
```

## Testing

### Unit Tests

Write tests in `src/test.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function() {
        let env = Env::default();
        let result = NewContract::function_name(env, 10);
        assert_eq!(result, 42);
    }
}
```

Run tests:

```bash
cargo test
```

### Integration Tests

Test contract interactions:

```rust
#[test]
fn test_integration() {
    let env = Env::default();
    let admin = Address::generate(&env);

    NewContract::initialize(env.clone(), admin.clone());

    let result = NewContract::function_name(env, 10);
    assert_eq!(result, 42);
}
```

## Deployment

### 1. Configure Network

```bash
# Testnet
export SOROBAN_NETWORK=testnet
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Mainnet
export SOROBAN_NETWORK=public
export SOROBAN_RPC_URL=https://mainnet.stellar.org
```

### 2. Deploy Contract

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/new_contract.wasm \
  --source GYOUR_ADDRESS
```

This returns the contract ID. Save this for future interactions.

### 3. Initialize Contract

```bash
soroban contract invoke \
  --id <contract_id> \
  --function initialize \
  --arg admin=GYOUR_ADDRESS
```

## Contract Interaction

### Invoke Function

```bash
soroban contract invoke \
  --id <contract_id> \
  --function function_name \
  --arg arg1=10
```

### Read Contract State

```bash
soroban contract read \
  --id <contract_id> \
  --key key_name
```

### Simulate Transaction

```bash
soroban contract invoke \
  --id <contract_id> \
  --function function_name \
  --arg arg1=10 \
  --simulate
```

## Contract Upgrade Pattern

Soroban contracts are immutable. To upgrade:

1. Deploy new contract version
2. Migrate state from old contract
3. Update references to new contract
4. Deprecate old contract

Example:

```rust
#[contractimpl]
impl NewContract {
    pub fn migrate_from_old(env: Env, old_contract_id: Address) {
        // Read state from old contract
        let old_state = env.read_from_contract::<OldState>(
            &old_contract_id,
            &DataKey::State
        );

        // Write to new contract
        env.storage().set(&DataKey::State, &old_state);
    }
}
```

## Best Practices

### 1. Access Control

Use role-based permissions:

```rust
#[contractimpl]
impl NewContract {
    pub fn admin_function(env: Env, admin: Address) {
        admin.require_auth();
        // Admin logic
    }
}
```

### 2. Event Emission

Emit events for important actions:

```rust
#[contractimpl]
impl NewContract {
    pub fn important_action(env: Env) {
        env.events().publish(
            (Symbol::new(&env, "action"), Symbol::new(&env, "executed")),
            ()
        );
    }
}
```

### 3. Error Handling

Use custom errors:

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    InsufficientBalance = 2,
    InvalidInput = 3,
}
```

### 4. Gas Optimization

- Minimize storage operations
- Use efficient data structures
- Batch operations when possible
- Cache frequently accessed data

### 5. Security

- Validate all inputs
- Check authorization
- Use reentrancy guards
- Implement rate limiting

## Contract-Specific Guides

### EnergyMeterRegistry

**Purpose**: Manage energy meter registration and status

**Key Functions**:

- `initialize(admin)`: Set admin address
- `register_meter(meter_id, household, location, operator)`: Register new meter
- `update_reading(meter_id, reading)`: Update meter reading
- `suspend_meter(meter_id, reason)`: Suspend meter
- `reactivate_meter(meter_id)`: Reactivate meter
- `update_trust_score(meter_id, score)`: Update trust score

**Events**:

- `meter_registered`
- `reading_updated`
- `meter_suspended`
- `meter_reactivated`

### ConsumptionBilling

**Purpose**: Handle billing calculations and balance management

**Key Functions**:

- `initialize(admin, tariff_rate)`: Set admin and tariff
- `set_tariff_rate(rate)`: Update tariff rate
- `register_household(household, billing_mode)`: Register household
- `record_usage(household, consumption_kwh)`: Record energy usage
- `add_balance(household, amount)`: Add funds to balance
- `process_billing_cycle()`: Process billing for all households

**Events**:

- `tariff_updated`
- `household_registered`
- `usage_recorded`
- `billing_processed`

### P2PEnergyTrading

**Purpose**: Enable peer-to-peer energy trading

**Key Functions**:

- `initialize(admin)`: Set admin address
- `create_offer(producer, amount, price, expiry)`: Create energy offer
- `create_request(consumer, amount, max_price, expiry)`: Create energy request
- `cancel_offer(offer_id)`: Cancel offer
- `cancel_request(request_id)`: Cancel request
- `match_trade(offer_id, request_id)`: Match offer and request
- `settle_trade(trade_id)`: Settle completed trade

**Events**:

- `offer_created`
- `request_created`
- `trade_matched`
- `trade_settled`

### SubsidyGovernance

**Purpose**: Manage community subsidies and governance

**Key Functions**:

- `initialize(admin)`: Set admin address
- `create_proposal(proposer, type, title, description)`: Create proposal
- `cast_vote(voter, proposal_id, vote_option)`: Cast vote
- `finalize_proposal(proposal_id)`: Finalize proposal
- `create_subsidy(admin, name, discount, eligible, duration)`: Create subsidy
- `apply_subsidy(household, subsidy_id)`: Apply subsidy to household
- `add_to_fund(amount)`: Add to community fund

**Events**:

- `proposal_created`
- `vote_cast`
- `proposal_finalized`
- `subsidy_created`
- `subsidy_applied`

### GridSettlement

**Purpose**: Process settlement transactions on Stellar

**Key Functions**:

- `initialize(admin, anchor, token)`: Set admin, anchor, and token
- `create_settlement(type, from, to, amount, reference)`: Create settlement
- `process_pending_settlements(batch_size)`: Process pending settlements
- `mark_settlement_failed(settlement_id)`: Mark settlement as failed
- `retry_settlement(settlement_id)`: Retry failed settlement

**Events**:

- `settlement_created`
- `settlement_processed`
- `settlement_failed`
- `settlement_retried`

## Gas Estimation

Estimate gas for transactions:

```bash
soroban contract invoke \
  --id <contract_id> \
  --function function_name \
  --arg arg1=10 \
  --simulate
```

Check the output for gas usage.

## Debugging

### Local Simulation

Use Soroban's local network for testing:

```bash
soroban network local
soroban contract deploy --wasm contract.wasm --source GADMIN...
```

### Logging

Add logging to contracts:

```rust
env.logs().append(&format!("Action performed with arg: {}", arg));
```

### State Inspection

Read contract state:

```bash
soroban contract read \
  --id <contract_id> \
  --key DataKey::State
```

## Security Considerations

### 1. Input Validation

```rust
if amount == 0 || amount > MAX_AMOUNT {
    panic_with_error!(env, Error::InvalidInput);
}
```

### 2. Authorization

```rust
admin.require_auth_for_err(&Error::Unauthorized);
```

### 3. Reentrancy Protection

```rust
let is_processing = env.storage().get(&DataKey::Processing);
if is_processing.unwrap_or(false) {
    panic_with_error!(env, Error::ReentrancyDetected);
}
env.storage().set(&DataKey::Processing, &true);
```

### 4. Overflow Protection

```rust
checked_add!(balance, amount).expect("Overflow detected");
```

## Resources

- [Soroban Documentation](https://soroban.stellar.org/docs/)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)

## Support

For contract development issues:

- Check Soroban documentation
- Review example contracts
- Create GitHub issue with contract code and error details
