#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, Env, Map, String, Symbol,
    Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MeterStatus {
    Active,
    Inactive,
    Suspended,
    Tampered,
}

#[contracttype]
#[derive(Clone)]
pub struct MeterInfo {
    pub meter_id: Bytes,
    pub household_address: Address,
    pub location: String,
    pub installation_date: u64,
    pub status: MeterStatus,
    pub trust_score: u32,
    pub last_reading: u64,
    pub last_reading_timestamp: u64,
    pub operator_address: Address,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Meters,
    HouseholdMeters,
    OperatorMeters,
    MeterCount,
}

#[contract]
pub struct EnergyMeterRegistry;

#[contractimpl]
impl EnergyMeterRegistry {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::MeterCount, &0u32);
    }

    pub fn register_meter(
        env: Env,
        meter_id: Bytes,
        household_address: Address,
        location: String,
        operator_address: Address,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        let meter_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MeterCount)
            .unwrap();

        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap_or_else(|| Map::new(&env));
        if meters.contains_key(&meter_id) {
            panic!("meter already registered");
        }

        let timestamp = env.ledger().timestamp();
        let meter_info = MeterInfo {
            meter_id: meter_id.clone(),
            household_address: household_address.clone(),
            location,
            installation_date: timestamp,
            status: MeterStatus::Active,
            trust_score: 100,
            last_reading: 0,
            last_reading_timestamp: timestamp,
            operator_address: operator_address.clone(),
        };

        let mut meters_updated = meters;
        meters_updated.set(meter_id.clone(), meter_info);
        env.storage()
            .instance()
            .set(&DataKey::Meters, &meters_updated);

        let mut household_meters: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&DataKey::HouseholdMeters)
            .unwrap_or_else(|| Map::new(&env));
        let mut meters_list = household_meters
            .get(household_address.clone())
            .unwrap_or_else(|| Vec::new(&env));
        meters_list.push_back(meter_id.clone());
        household_meters.set(household_address.clone(), meters_list);
        env.storage()
            .instance()
            .set(&DataKey::HouseholdMeters, &household_meters);

        let mut operator_meters: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&DataKey::OperatorMeters)
            .unwrap_or_else(|| Map::new(&env));
        let mut op_meters_list = operator_meters
            .get(operator_address.clone())
            .unwrap_or_else(|| Vec::new(&env));
        op_meters_list.push_back(meter_id.clone());
        operator_meters.set(operator_address.clone(), op_meters_list);
        env.storage()
            .instance()
            .set(&DataKey::OperatorMeters, &operator_meters);

        env.storage()
            .instance()
            .set(&DataKey::MeterCount, &(meter_count + 1));

        env.events().publish(
            (symbol_short!("meter_reg"), meter_id),
            (household_address, operator_address),
        );
    }

    pub fn update_reading(env: Env, meter_id: Bytes, reading: u64) {
        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap();

        let mut meter_info = meters
            .get(meter_id.clone())
            .unwrap_or_else(|| panic!("meter not found"));

        meter_info.household_address.require_auth();

        if reading < meter_info.last_reading {
            panic!("reading cannot be less than last reading");
        }

        let timestamp = env.ledger().timestamp();
        meter_info.last_reading = reading;
        meter_info.last_reading_timestamp = timestamp;

        let mut meters_updated = meters;
        meters_updated.set(meter_id.clone(), meter_info);
        env.storage()
            .instance()
            .set(&DataKey::Meters, &meters_updated);

        env.events()
            .publish((symbol_short!("meter_upd"), meter_id), (reading, timestamp));
    }

    pub fn suspend_meter(env: Env, meter_id: Bytes, reason: String) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap();
        let mut meter_info = meters
            .get(meter_id.clone())
            .unwrap_or_else(|| panic!("meter not found"));

        meter_info.status = MeterStatus::Suspended;

        let mut meters_updated = meters;
        meters_updated.set(meter_id.clone(), meter_info);
        env.storage()
            .instance()
            .set(&DataKey::Meters, &meters_updated);

        env.events()
            .publish((symbol_short!("meter_sus"), meter_id), reason);
    }

    pub fn reactivate_meter(env: Env, meter_id: Bytes) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap();
        let mut meter_info = meters
            .get(meter_id.clone())
            .unwrap_or_else(|| panic!("meter not found"));

        meter_info.status = MeterStatus::Active;

        let mut meters_updated = meters;
        meters_updated.set(meter_id.clone(), meter_info);
        env.storage()
            .instance()
            .set(&DataKey::Meters, &meters_updated);

        env.events()
            .publish(symbol_short!("meter_act"), meter_id);
    }

    pub fn update_trust_score(env: Env, meter_id: Bytes, score: u32) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        if score > 100 {
            panic!("trust score must be between 0 and 100");
        }

        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap();
        let mut meter_info = meters
            .get(meter_id.clone())
            .unwrap_or_else(|| panic!("meter not found"));

        meter_info.trust_score = score;

        let mut meters_updated = meters;
        meters_updated.set(meter_id.clone(), meter_info);
        env.storage()
            .instance()
            .set(&DataKey::Meters, &meters_updated);
    }

    pub fn get_meter(env: Env, meter_id: Bytes) -> MeterInfo {
        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap();
        meters
            .get(meter_id)
            .unwrap_or_else(|| panic!("meter not found"))
    }

    pub fn get_household_meters(env: Env, household_address: Address) -> Vec<Bytes> {
        let household_meters: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&DataKey::HouseholdMeters)
            .unwrap_or_else(|| Map::new(&env));
        household_meters
            .get(household_address)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_operator_meters(env: Env, operator_address: Address) -> Vec<Bytes> {
        let operator_meters: Map<Address, Vec<Bytes>> = env
            .storage()
            .instance()
            .get(&DataKey::OperatorMeters)
            .unwrap_or_else(|| Map::new(&env));
        operator_meters
            .get(operator_address)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_meter_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MeterCount)
            .unwrap()
    }

    pub fn meter_exists(env: Env, meter_id: Bytes) -> bool {
        let meters: Map<Bytes, MeterInfo> = env
            .storage()
            .instance()
            .get(&DataKey::Meters)
            .unwrap_or_else(|| Map::new(&env));
        meters.contains_key(&meter_id)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }

    pub fn evt_meter_registered(_env: Env) -> Symbol {
        symbol_short!("meter_reg")
    }
}

mod test;
