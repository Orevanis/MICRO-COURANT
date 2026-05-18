#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

use crate::{EnergyMeterRegistry, EnergyMeterRegistryClient, MeterStatus};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_register_meter() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0001");
    let location = String::from_str(&env, "Zone A - Sector 1");

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.register_meter(&meter_id, &household, &location, &operator);

    let meter = client.get_meter(&meter_id);
    assert_eq!(meter.meter_id, meter_id);
    assert_eq!(meter.household_address, household);
    assert_eq!(meter.operator_address, operator);
    assert_eq!(meter.status, MeterStatus::Active);
    assert_eq!(meter.trust_score, 100);
    assert!(client.meter_exists(&meter_id));
}

#[test]
fn test_update_reading() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0002");

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.register_meter(&meter_id, &household, &String::from_str(&env, "Zone A"), &operator);
    client.update_reading(&meter_id, &50);

    let meter = client.get_meter(&meter_id);
    assert_eq!(meter.last_reading, 50);
}

#[test]
fn test_suspend_and_reactivate_meter() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0003");

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.register_meter(&meter_id, &household, &String::from_str(&env, "Zone A"), &operator);

    client.suspend_meter(&meter_id, &String::from_str(&env, "Non-payment"));
    assert_eq!(client.get_meter(&meter_id).status, MeterStatus::Suspended);

    client.reactivate_meter(&meter_id);
    assert_eq!(client.get_meter(&meter_id).status, MeterStatus::Active);
}

#[test]
fn test_update_trust_score() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);
    let meter_id = Bytes::from_slice(&env, b"MTR-0005");

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.register_meter(&meter_id, &household, &String::from_str(&env, "Zone A"), &operator);
    client.update_trust_score(&meter_id, &75);

    assert_eq!(client.get_meter(&meter_id).trust_score, 75);
}

#[test]
fn test_get_meter_count() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let household = Address::generate(&env);
    let operator = Address::generate(&env);

    let contract_id = env.register_contract(None, EnergyMeterRegistry);
    let client = EnergyMeterRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);
    assert_eq!(client.get_meter_count(), 0);

    client.register_meter(
        &Bytes::from_slice(&env, b"MTR-0009"),
        &household,
        &String::from_str(&env, "Zone A"),
        &operator,
    );
    client.register_meter(
        &Bytes::from_slice(&env, b"MTR-0010"),
        &household,
        &String::from_str(&env, "Zone B"),
        &operator,
    );

    assert_eq!(client.get_meter_count(), 2);
}
