#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, Env, Map, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BillingMode {
    Prepaid,
    Postpaid,
}

#[contracttype]
#[derive(Clone)]
pub struct UsageRecord {
    pub meter_id: Bytes,
    pub household_address: Address,
    pub consumption_kwh: u64,
    pub timestamp: u64,
    pub tariff_rate: u64,
    pub cost: u64,
    pub subsidy_applied: u64,
    pub final_cost: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct BalanceInfo {
    pub household_address: Address,
    pub current_balance: i64,
    pub billing_mode: BillingMode,
    pub last_billing_cycle: u64,
    pub total_consumption: u64,
    pub total_paid: u64,
}

#[contract]
pub struct ConsumptionBilling;

#[contractimpl]
impl ConsumptionBilling {
    pub fn initialize(env: Env, admin: Address, initial_tariff_rate: u64, admin_threshold: u32) {
        if env.storage().instance().has(&Symbol::new(&env, "ADMIN")) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TARIFF_RATE"), &initial_tariff_rate);

        let mut admin_multisig: Vec<Address> = Vec::new(&env);
        admin_multisig.push_back(admin.clone());
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN_MULTISIG"), &admin_multisig);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN_THRESHOLD"), &admin_threshold);
    }

    pub fn add_admin(env: Env, new_admin: Address) {
        let caller: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        caller.require_auth();

        let mut admin_multisig: Vec<Address> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN_MULTISIG"))
            .unwrap_or_else(|| Vec::new(&env));

        for admin in admin_multisig.iter() {
            if admin == new_admin {
                panic!("admin already exists");
            }
        }
        admin_multisig.push_back(new_admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN_MULTISIG"), &admin_multisig);
    }

    pub fn set_tariff_rate(env: Env, rate: u64) {
        let caller: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        caller.require_auth();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TARIFF_RATE"), &rate);
    }

    pub fn set_subsidy_contract(env: Env, subsidy_contract: Address) {
        let caller: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        caller.require_auth();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SUBSIDY_CTR"), &subsidy_contract);
    }

    pub fn set_settlement_contract(env: Env, settlement_contract: Address) {
        let caller: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        caller.require_auth();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SETTLE_CTR"), &settlement_contract);
    }

    pub fn register_household(
        env: Env,
        household_address: Address,
        billing_mode: BillingMode,
        initial_balance: i64,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "BALANCES"))
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
            .set(&Symbol::new(&env, "BALANCES"), &balances_updated);
    }

    pub fn record_usage(
        env: Env,
        meter_id: Bytes,
        household_address: Address,
        consumption_kwh: u64,
    ) -> UsageRecord {
        if env
            .storage()
            .instance()
            .has(&Symbol::new(&env, "REENTRANT"))
        {
            panic!("reentrancy detected");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REENTRANT"), &true);

        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let tariff_rate: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "TARIFF_RATE"))
            .unwrap();

        let cost = consumption_kwh
            .checked_mul(tariff_rate)
            .unwrap_or_else(|| panic!("arithmetic overflow"));
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
            .get(&Symbol::new(&env, "USAGE_RECORDS"))
            .unwrap_or_else(|| Map::new(&env));

        usage_records.set((meter_id.clone(), timestamp), usage_record.clone());
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "USAGE_RECORDS"), &usage_records);

        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "BALANCES"))
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
            .unwrap_or_else(|| panic!("overflow"));

        let mut balances_updated = balances;
        balances_updated.set(household_address.clone(), balance_info);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "BALANCES"), &balances_updated);

        env.events().publish(
            (
                Symbol::new(&env, "USAGE_RECORDED"),
                household_address.clone(),
            ),
            (meter_id, consumption_kwh, final_cost),
        );
        env.events().publish(
            (Symbol::new(&env, "BAL_DEDUCTED"), household_address),
            final_cost,
        );

        env.storage()
            .instance()
            .remove(&Symbol::new(&env, "REENTRANT"));

        usage_record
    }

    pub fn add_balance(env: Env, household_address: Address, amount: i64) {
        if env
            .storage()
            .instance()
            .has(&Symbol::new(&env, "REENTRANT"))
        {
            panic!("reentrancy detected");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REENTRANT"), &true);

        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "BALANCES"))
            .unwrap();
        let mut balance_info = balances
            .get(household_address.clone())
            .unwrap_or_else(|| panic!("household not registered"));

        balance_info.current_balance = balance_info.current_balance.saturating_add(amount);
        balance_info.total_paid = balance_info
            .total_paid
            .checked_add(amount as u64)
            .unwrap_or_else(|| panic!("overflow"));

        let mut balances_updated = balances;
        balances_updated.set(household_address.clone(), balance_info);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "BALANCES"), &balances_updated);

        env.events().publish(
            (Symbol::new(&env, "BAL_ADDED"), household_address),
            amount,
        );

        env.storage()
            .instance()
            .remove(&Symbol::new(&env, "REENTRANT"));
    }

    pub fn get_balance(env: Env, household_address: Address) -> BalanceInfo {
        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "BALANCES"))
            .unwrap();
        balances
            .get(household_address)
            .unwrap_or_else(|| panic!("household not registered"))
    }

    pub fn get_meter_usage(env: Env, meter_id: Bytes, limit: u32) -> Vec<UsageRecord> {
        let usage_records: Map<(Bytes, u64), UsageRecord> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "USAGE_RECORDS"))
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

    pub fn get_tariff_rate(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "TARIFF_RATE"))
            .unwrap()
    }

    pub fn check_balance(env: Env, household_address: Address, required_amount: u64) -> bool {
        let balances: Map<Address, BalanceInfo> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "BALANCES"))
            .unwrap();
        let balance_info = balances
            .get(household_address)
            .unwrap_or_else(|| panic!("household not registered"));
        balance_info.current_balance >= required_amount as i64
    }

    pub fn process_billing_cycle(env: Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();
        let timestamp = env.ledger().timestamp();
        env.events()
            .publish((Symbol::new(&env, "BILLING_CYCLE"),), timestamp);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap()
    }
}
