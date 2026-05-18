#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, Env, Map, Vec};

/// Billing mode
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BillingMode {
    Prepaid,
    Postpaid,
}

/// Usage record structure
#[contracttype]
#[derive(Clone)]
pub struct UsageRecord {
    pub meter_id: Bytes,
    pub household_address: Address,
    pub consumption_kwh: u64,
    pub timestamp: u64,
    pub tariff_rate: u64, // in stroops per kWh
    pub cost: u64,        // in stroops
    pub subsidy_applied: u64,
    pub final_cost: u64,
}

/// Balance information
#[contracttype]
#[derive(Clone)]
pub struct BalanceInfo {
    pub household_address: Address,
    pub current_balance: i64, // in stroops (can be negative for postpaid)
    pub billing_mode: BillingMode,
    pub last_billing_cycle: u64,
    pub total_consumption: u64,
    pub total_paid: u64,
}

/// Contract storage keys
const ADMIN: soroban_sdk::Symbol = soroban_sdk::symbol!("ADMIN");
const ADMIN_MULTISIG: soroban_sdk::Symbol = soroban_sdk::symbol!("ADMIN_MULTISIG");
const ADMIN_THRESHOLD: soroban_sdk::Symbol = soroban_sdk::symbol!("ADMIN_THRESHOLD");
const USAGE_RECORDS: soroban_sdk::Symbol = soroban_sdk::symbol!("USAGE_RECORDS");
const USAGE_LRU: soroban_sdk::Symbol = soroban_sdk::symbol!("USAGE_LRU");
const BALANCES: soroban_sdk::Symbol = soroban_sdk::symbol!("BALANCES");
const TARIFF_RATE: soroban_sdk::Symbol = soroban_sdk::symbol!("TARIFF_RATE");
const SUBSIDY_CONTRACT: soroban_sdk::Symbol = soroban_sdk::symbol!("SUBSIDY_CONTRACT");
const REENTRANCY_GUARD: soroban_sdk::Symbol = soroban_sdk::symbol!("REENTRANCY_GUARD");

/// Events
const EVT_USAGE_RECORDED: soroban_sdk::Symbol = soroban_sdk::symbol!("USAGE_RECORDED");
const EVT_BALANCE_DEDUCTED: soroban_sdk::Symbol = soroban_sdk::symbol!("BALANCE_DEDUCTED");
const EVT_BALANCE_ADDED: soroban_sdk::Symbol = soroban_sdk::symbol!("BALANCE_ADDED");
const EVT_BILLING_CYCLE: soroban_sdk::Symbol = soroban_sdk::symbol!("BILLING_CYCLE");

#[contract]
pub struct ConsumptionBilling;

#[contractimpl]
impl ConsumptionBilling {
    /// Initialize the contract with multi-sig admin support
    pub fn initialize(env: Env, admin: Address, initial_tariff_rate: u64, admin_threshold: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage()
            .instance()
            .set(&TARIFF_RATE, &initial_tariff_rate);

        let mut admin_multisig: Vec<Address> = Vec::new(&env);
        admin_multisig.push_back(admin.clone());
        env.storage()
            .instance()
            .set(&ADMIN_MULTISIG, &admin_multisig);

        env.storage()
            .instance()
            .set(&ADMIN_THRESHOLD, &admin_threshold);
    }

    /// Add a new admin to multi-sig (requires existing admin approval)
    pub fn add_admin(env: Env, new_admin: Address) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        let mut admin_multisig: Vec<Address> = env
            .storage()
            .instance()
            .get(&ADMIN_MULTISIG)
            .unwrap_or_else(|| Vec::new(&env));

        for admin in admin_multisig.iter() {
            if admin == new_admin {
                panic!("admin already exists");
            }
        }

        admin_multisig.push_back(new_admin);
        env.storage()
            .instance()
            .set(&ADMIN_MULTISIG, &admin_multisig);
    }

    /// Remove an admin from multi-sig (requires existing admin approval)
    pub fn remove_admin(env: Env, admin_to_remove: Address) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        let admin_multisig: Vec<Address> = env
            .storage()
            .instance()
            .get(&ADMIN_MULTISIG)
            .unwrap_or_else(|| Vec::new(&env));

        if admin_multisig.len() <= 1 {
            panic!("cannot remove last admin");
        }

        let mut new_admin_multisig: Vec<Address> = Vec::new(&env);
        let mut found = false;

        for admin in admin_multisig.iter() {
            if admin != admin_to_remove {
                new_admin_multisig.push_back(admin.clone());
            } else {
                found = true;
            }
        }

        if !found {
            panic!("admin not found");
        }

        env.storage()
            .instance()
            .set(&ADMIN_MULTISIG, &new_admin_multisig);
    }

    /// Set admin threshold (minimum signatures required)
    pub fn set_admin_threshold(env: Env, threshold: u32) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        let admin_multisig: Vec<Address> = env
            .storage()
            .instance()
            .get(&ADMIN_MULTISIG)
            .unwrap_or_else(|| Vec::new(&env));

        if threshold == 0 || threshold > admin_multisig.len() as u32 {
            panic!("invalid threshold");
        }

        env.storage()
            .instance()
            .set(&ADMIN_THRESHOLD, &threshold);
    }

    fn is_authorized_admin(env: &Env, caller: &Address) -> bool {
        let admin_multisig: Vec<Address> = env
            .storage()
            .instance()
            .get(&ADMIN_MULTISIG)
            .unwrap_or_else(|| Vec::new(env));

        for admin in admin_multisig.iter() {
            if admin == *caller {
                return true;
            }
        }

        false
    }

    /// Set tariff rate (admin only with multi-sig check)
    pub fn set_tariff_rate(env: Env, rate: u64) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        if !Self::is_authorized_admin(&env, &caller) {
            panic!("unauthorized admin");
        }

        env.storage().instance().set(&TARIFF_RATE, &rate);
    }

    /// Set subsidy contract address (admin only with multi-sig check)
    pub fn set_subsidy_contract(env: Env, subsidy_contract: Address) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        if !Self::is_authorized_admin(&env, &caller) {
            panic!("unauthorized admin");
        }

        env.storage()
            .instance()
            .set(&SUBSIDY_CONTRACT, &subsidy_contract);
    }

    /// Set settlement contract address (admin only with multi-sig check)
    pub fn set_settlement_contract(env: Env, settlement_contract: Address) {
        let caller: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        caller.require_auth();

        if !Self::is_authorized_admin(&env, &caller) {
            panic!("unauthorized admin");
        }

        // Stored under a dedicated key; BILLING_CONTRACT was a misnomer in the original
        const SETTLEMENT_CONTRACT_KEY: soroban_sdk::Symbol = soroban_sdk::symbol!("SETTLE_CTR");
        env.storage()
            .instance()
            .set(&SETTLEMENT_CONTRACT_KEY, &settlement_contract);
    }

    /// Register household for billing
    pub fn register_household(
        env: Env,
        household_address: Address,
        billing_mode: BillingMode,
        initial_balance: i64,
    ) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&BALANCES)
            .unwrap_or_else(|| Map::new(&env));

        if balances.contains_key(&household_address) {
            panic!("household already registered");
        }

        let timestamp = env.ledger().timestamp();

        let balance_info = BalanceInfo {
            household_address: household_address.clone(),
            current_balance: initial_balance,
            billing_mode,
            last_billing_cycle: timestamp,
            total_consumption: 0,
            total_paid: 0,
        };

        let mut balances_updated = balances;
        balances_updated.set(household_address, balance_info);
        env.storage()
            .instance()
            .set(&BALANCES, &balances_updated);
    }

    /// Record energy usage and deduct balance
    pub fn record_usage(
        env: Env,
        meter_id: Bytes,
        household_address: Address,
        consumption_kwh: u64,
    ) -> UsageRecord {
        if env.storage().instance().has(&REENTRANCY_GUARD) {
            panic!("reentrancy detected");
        }
        env.storage().instance().set(&REENTRANCY_GUARD, &true);

        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let tariff_rate: u64 = env
            .storage()
            .instance()
            .get(&TARIFF_RATE)
            .unwrap()
            .unwrap();

        let cost = consumption_kwh
            .checked_mul(tariff_rate)
            .unwrap_or_else(|| panic!("arithmetic overflow in cost calculation"));

        // Subsidy lookup is a cross-contract call; placeholder returns 0 until integrated
        let subsidy_applied: u64 = 0;
        let final_cost = cost.saturating_sub(subsidy_applied);

        let timestamp = env.ledger().timestamp();

        let usage_record = UsageRecord {
            meter_id: meter_id.clone(),
            household_address: household_address.clone(),
            consumption_kwh,
            timestamp,
            tariff_rate,
            cost,
            subsidy_applied,
            final_cost,
        };

        let mut usage_records: Map<(Bytes, u64), UsageRecord> = env
            .storage()
            .instance()
            .get(&USAGE_RECORDS)
            .unwrap_or_else(|| Map::new(&env));

        const MAX_RECORDS: u32 = 1000;

        if usage_records.len() >= MAX_RECORDS {
            let lru_list: Vec<(Bytes, u64)> = env
                .storage()
                .instance()
                .get(&USAGE_LRU)
                .unwrap_or_else(|| Vec::new(&env));

            if !lru_list.is_empty() {
                let lru_key = lru_list.first().unwrap();
                usage_records.remove(lru_key);

                let mut new_lru: Vec<(Bytes, u64)> = Vec::new(&env);
                let lru_len = lru_list.len();
                let mut idx: u32 = 1;
                while idx < lru_len {
                    new_lru.push_back(lru_list.get(idx).unwrap());
                    idx += 1;
                }
                env.storage().instance().set(&USAGE_LRU, &new_lru);
            }
        }

        usage_records.set((meter_id.clone(), timestamp), usage_record.clone());
        env.storage()
            .instance()
            .set(&USAGE_RECORDS, &usage_records);

        let mut lru_list: Vec<(Bytes, u64)> = env
            .storage()
            .instance()
            .get(&USAGE_LRU)
            .unwrap_or_else(|| Vec::new(&env));
        lru_list.push_back((meter_id.clone(), timestamp));
        env.storage().instance().set(&USAGE_LRU, &lru_list);

        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&BALANCES)
            .unwrap()
            .unwrap();
        let mut balance_info = balances
            .get(household_address.clone())
            .unwrap_or_else(|| panic!("household not registered"));

        balance_info.current_balance = balance_info
            .current_balance
            .saturating_sub(final_cost as i64);
        balance_info.total_consumption = balance_info
            .total_consumption
            .checked_add(consumption_kwh)
            .unwrap_or_else(|| panic!("arithmetic overflow in total consumption"));

        let mut balances_updated = balances;
        balances_updated.set(household_address.clone(), balance_info);
        env.storage()
            .instance()
            .set(&BALANCES, &balances_updated);

        env.events().publish(
            (EVT_USAGE_RECORDED, household_address.clone()),
            (meter_id, consumption_kwh, final_cost),
        );

        env.events().publish(
            (EVT_BALANCE_DEDUCTED, household_address),
            final_cost,
        );

        env.storage().instance().remove(&REENTRANCY_GUARD);

        usage_record
    }

    /// Add balance (payment or recharge)
    pub fn add_balance(env: Env, household_address: Address, amount: i64) {
        if env.storage().instance().has(&REENTRANCY_GUARD) {
            panic!("reentrancy detected");
        }
        env.storage().instance().set(&REENTRANCY_GUARD, &true);

        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let balances: Map<Address, BalanceInfo> =
            env.storage().instance().get(&BALANCES).unwrap().unwrap();
        let mut balance_info = balances
            .get(household_address.clone())
            .unwrap_or_else(|| panic!("household not registered"));

        balance_info.current_balance = balance_info.current_balance.saturating_add(amount);
        balance_info.total_paid = balance_info
            .total_paid
            .checked_add(amount as u64)
            .unwrap_or_else(|| panic!("arithmetic overflow in total paid"));

        let mut balances_updated = balances;
        balances_updated.set(household_address.clone(), balance_info);
        env.storage()
            .instance()
            .set(&BALANCES, &balances_updated);

        env.events()
            .publish((EVT_BALANCE_ADDED, household_address), amount);

        env.storage().instance().remove(&REENTRANCY_GUARD);
    }

    /// Get balance information
    pub fn get_balance(env: Env, household_address: Address) -> BalanceInfo {
        let balances: Map<Address, BalanceInfo> =
            env.storage().instance().get(&BALANCES).unwrap().unwrap();
        balances
            .get(household_address)
            .unwrap_or_else(|| panic!("household not registered"))
    }

    /// Get usage records for a meter
    pub fn get_meter_usage(env: Env, meter_id: Bytes, limit: u32) -> Vec<UsageRecord> {
        let usage_records: Map<(Bytes, u64), UsageRecord> = env
            .storage()
            .instance()
            .get(&USAGE_RECORDS)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        let mut count = 0;

        for (key, record) in usage_records.iter() {
            if key.0 == meter_id {
                result.push_back(record);
                count += 1;
                if count >= limit {
                    break;
                }
            }
        }

        result
    }

    /// Get current tariff rate
    pub fn get_tariff_rate(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&TARIFF_RATE)
            .unwrap()
            .unwrap()
    }

    /// Check if household has sufficient balance
    pub fn check_balance(env: Env, household_address: Address, required_amount: u64) -> bool {
        let balances: Map<Address, BalanceInfo> =
            env.storage().instance().get(&BALANCES).unwrap().unwrap();
        let balance_info = balances
            .get(household_address)
            .unwrap_or_else(|| panic!("household not registered"));
        balance_info.current_balance >= required_amount as i64
    }

    /// Process billing cycle (batch settlement trigger)
    pub fn process_billing_cycle(env: Env) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let timestamp = env.ledger().timestamp();
        env.events().publish((EVT_BILLING_CYCLE,), timestamp);
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap().unwrap()
    }
}
