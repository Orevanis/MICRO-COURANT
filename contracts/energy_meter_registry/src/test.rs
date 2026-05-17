#![cfg(test)]

use soroban_sdk::{testutils::Accounts as _, Address, Bytes, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());

    let stored_admin = EnergyMeterRegistry::get_admin(env);
    assert_eq!(stored_admin, admin);
}

#[test]
fn test_register_meter() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0001");
    let location = String::from_slice(&env, b"Zone A - Sector 1");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        location,
        operator.clone(),
    );

    // Verify meter was registered
    let meter = EnergyMeterRegistry::get_meter(env.clone(), meter_id.clone());
    assert_eq!(meter.meter_id, meter_id);
    assert_eq!(meter.household_address, household);
    assert_eq!(meter.operator_address, operator);
    assert_eq!(meter.status, MeterStatus::Active);
    assert_eq!(meter.trust_score, 100);

    // Verify meter exists
    assert!(EnergyMeterRegistry::meter_exists(env.clone(), meter_id.clone()));
}

#[test]
fn test_update_reading() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0002");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );

    // Update reading
    EnergyMeterRegistry::update_reading(env.clone(), meter_id.clone(), 50);

    let meter = EnergyMeterRegistry::get_meter(env.clone(), meter_id);
    assert_eq!(meter.last_reading, 50);
}

#[test]
fn test_suspend_meter() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0003");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );

    // Suspend meter
    EnergyMeterRegistry::suspend_meter(env.clone(), meter_id.clone(), String::from_slice(&env, b"Non-payment"));

    let meter = EnergyMeterRegistry::get_meter(env.clone(), meter_id);
    assert_eq!(meter.status, MeterStatus::Suspended);
}

#[test]
fn test_reactivate_meter() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0004");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );

    // Suspend then reactivate
    EnergyMeterRegistry::suspend_meter(env.clone(), meter_id.clone(), String::from_slice(&env, b"Test"));
    EnergyMeterRegistry::reactivate_meter(env.clone(), meter_id.clone());

    let meter = EnergyMeterRegistry::get_meter(env.clone(), meter_id);
    assert_eq!(meter.status, MeterStatus::Active);
}

#[test]
fn test_update_trust_score() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0005");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );

    // Update trust score
    EnergyMeterRegistry::update_trust_score(env.clone(), meter_id.clone(), 75);

    let meter = EnergyMeterRegistry::get_meter(env.clone(), meter_id);
    assert_eq!(meter.trust_score, 75);
}

#[test]
fn test_invalid_trust_score() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0006");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id.clone(),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );

    // Try to set invalid trust score (> 100)
    let result = std::panic::catch_unwind(|| {
        EnergyMeterRegistry::update_trust_score(env.clone(), meter_id.clone(), 150);
    });

    assert!(result.is_err());
}

#[test]
fn test_get_household_meters() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household1 = Address::generate(&env);
    let household2 = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id1 = Bytes::from_slice(&env, b"MTR-0007");
    let meter_id2 = Bytes::from_slice(&env, b"MTR-0008");

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id1.clone(),
        household1.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );
    EnergyMeterRegistry::register_meter(
        env.clone(),
        meter_id2.clone(),
        household2.clone(),
        String::from_slice(&env, b"Zone B"),
        operator.clone(),
    );

    // Get household meters
    let meters = EnergyMeterRegistry::get_household_meters(env.clone(), household1);
    assert_eq!(meters.len(), 1);
    assert_eq!(meters.get(0).unwrap(), meter_id1);
}

#[test]
fn test_get_meter_count() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);

    EnergyMeterRegistry::initialize(env.clone(), admin.clone());

    let initial_count = EnergyMeterRegistry::get_meter_count(env.clone());
    assert_eq!(initial_count, 0);

    // Register meters
    EnergyMeterRegistry::register_meter(
        env.clone(),
        Bytes::from_slice(&env, b"MTR-0009"),
        household.clone(),
        String::from_slice(&env, b"Zone A"),
        operator.clone(),
    );
    EnergyMeterRegistry::register_meter(
        env.clone(),
        Bytes::from_slice(&env, b"MTR-0010"),
        household.clone(),
        String::from_slice(&env, b"Zone B"),
        operator.clone(),
    );

    let new_count = EnergyMeterRegistry::get_meter_count(env.clone());
    assert_eq!(new_count, 2);
}
