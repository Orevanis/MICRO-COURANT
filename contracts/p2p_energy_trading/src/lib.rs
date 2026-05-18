#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Vec};

/// Trade status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TradeStatus {
    Open,
    Matched,
    Settled,
    Cancelled,
}

/// Energy offer
#[contracttype]
#[derive(Clone)]
pub struct EnergyOffer {
    pub offer_id: u64,
    pub producer_address: Address,
    pub energy_amount_kwh: u64,
    pub price_per_kwh: u64, // in stroops
    pub expiry_timestamp: u64,
    pub status: TradeStatus,
    pub created_at: u64,
}

/// Energy request
#[contracttype]
#[derive(Clone)]
pub struct EnergyRequest {
    pub request_id: u64,
    pub consumer_address: Address,
    pub energy_amount_kwh: u64,
    pub max_price_per_kwh: u64, // in stroops
    pub expiry_timestamp: u64,
    pub status: TradeStatus,
    pub created_at: u64,
}

/// Trade execution
#[contracttype]
#[derive(Clone)]
pub struct TradeExecution {
    pub trade_id: u64,
    pub offer_id: u64,
    pub request_id: u64,
    pub producer_address: Address,
    pub consumer_address: Address,
    pub energy_amount_kwh: u64,
    pub price_per_kwh: u64,
    pub total_cost: u64,
    pub timestamp: u64,
    pub status: TradeStatus,
}

/// Contract storage keys
const ADMIN: soroban_sdk::Symbol = soroban_sdk::symbol!("ADMIN");
const OFFERS: soroban_sdk::Symbol = soroban_sdk::symbol!("OFFERS");
const REQUESTS: soroban_sdk::Symbol = soroban_sdk::symbol!("REQUESTS");
const TRADES: soroban_sdk::Symbol = soroban_sdk::symbol!("TRADES");
const OFFER_COUNTER: soroban_sdk::Symbol = soroban_sdk::symbol!("OFFER_COUNTER");
const REQUEST_COUNTER: soroban_sdk::Symbol = soroban_sdk::symbol!("REQUEST_COUNTER");
const TRADE_COUNTER: soroban_sdk::Symbol = soroban_sdk::symbol!("TRADE_COUNTER");
const SETTLEMENT_CONTRACT: soroban_sdk::Symbol = soroban_sdk::symbol!("SETTLEMENT_CONTRACT");

/// Events
const EVT_OFFER_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol!("OFFER_CREATED");
const EVT_REQUEST_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol!("REQUEST_CREATED");
const EVT_TRADE_MATCHED: soroban_sdk::Symbol = soroban_sdk::symbol!("TRADE_MATCHED");
const EVT_TRADE_SETTLED: soroban_sdk::Symbol = soroban_sdk::symbol!("TRADE_SETTLED");

#[contract]
pub struct P2PEnergyTrading;

#[contractimpl]
impl P2PEnergyTrading {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&OFFER_COUNTER, &0u64);
        env.storage().instance().set(&REQUEST_COUNTER, &0u64);
        env.storage().instance().set(&TRADE_COUNTER, &0u64);
    }

    /// Set settlement contract address
    pub fn set_settlement_contract(env: Env, settlement_contract: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();
        env.storage()
            .instance()
            .set(&SETTLEMENT_CONTRACT, &settlement_contract);
    }

    /// Create energy offer (producer)
    pub fn create_offer(
        env: Env,
        producer_address: Address,
        energy_amount_kwh: u64,
        price_per_kwh: u64,
        expiry_hours: u64,
    ) -> u64 {
        producer_address.require_auth();

        let timestamp = env.ledger().timestamp();
        let expiry_timestamp = timestamp + (expiry_hours * 3600);

        let offer_counter: u64 = env
            .storage()
            .instance()
            .get(&OFFER_COUNTER)
            .unwrap()
            .unwrap();
        let offer_id = offer_counter + 1;

        let offer = EnergyOffer {
            offer_id,
            producer_address: producer_address.clone(),
            energy_amount_kwh,
            price_per_kwh,
            expiry_timestamp,
            status: TradeStatus::Open,
            created_at: timestamp,
        };

        let mut offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&OFFERS)
            .unwrap_or_else(|| Map::new(&env));
        offers.set(offer_id, offer);
        env.storage().instance().set(&OFFERS, &offers);
        env.storage().instance().set(&OFFER_COUNTER, &offer_id);

        // Emit event
        env.events().publish(
            (EVT_OFFER_CREATED, producer_address),
            (offer_id, energy_amount_kwh, price_per_kwh),
        );

        offer_id
    }

    /// Create energy request (consumer)
    pub fn create_request(
        env: Env,
        consumer_address: Address,
        energy_amount_kwh: u64,
        max_price_per_kwh: u64,
        expiry_hours: u64,
    ) -> u64 {
        consumer_address.require_auth();

        let timestamp = env.ledger().timestamp();
        let expiry_timestamp = timestamp + (expiry_hours * 3600);

        let request_counter: u64 = env
            .storage()
            .instance()
            .get(&REQUEST_COUNTER)
            .unwrap()
            .unwrap();
        let request_id = request_counter + 1;

        let request = EnergyRequest {
            request_id,
            consumer_address: consumer_address.clone(),
            energy_amount_kwh,
            max_price_per_kwh,
            expiry_timestamp,
            status: TradeStatus::Open,
            created_at: timestamp,
        };

        let mut requests: Map<u64, EnergyRequest> = env
            .storage()
            .instance()
            .get(&REQUESTS)
            .unwrap_or_else(|| Map::new(&env));
        requests.set(request_id, request);
        env.storage().instance().set(&REQUESTS, &requests);
        env.storage()
            .instance()
            .set(&REQUEST_COUNTER, &request_id);

        // Emit event
        env.events().publish(
            (EVT_REQUEST_CREATED, consumer_address),
            (request_id, energy_amount_kwh, max_price_per_kwh),
        );

        request_id
    }

    /// Match offer and request (automated matching)
    pub fn match_trade(env: Env, offer_id: u64, request_id: u64) -> u64 {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let mut offers: Map<u64, EnergyOffer> =
            env.storage().instance().get(&OFFERS).unwrap().unwrap();
        let mut requests: Map<u64, EnergyRequest> =
            env.storage().instance().get(&REQUESTS).unwrap().unwrap();

        let mut offer = offers
            .get(offer_id)
            .unwrap_or_else(|| panic!("offer not found"));
        let mut request = requests
            .get(request_id)
            .unwrap_or_else(|| panic!("request not found"));

        // Validate trade
        if offer.status != TradeStatus::Open {
            panic!("offer is not open");
        }
        if request.status != TradeStatus::Open {
            panic!("request is not open");
        }
        if offer.price_per_kwh > request.max_price_per_kwh {
            panic!("price exceeds consumer's maximum");
        }
        if offer.energy_amount_kwh < request.energy_amount_kwh {
            panic!("insufficient energy amount");
        }

        let timestamp = env.ledger().timestamp();
        let trade_counter: u64 = env
            .storage()
            .instance()
            .get(&TRADE_COUNTER)
            .unwrap()
            .unwrap();
        let trade_id = trade_counter + 1;

        // Use the consumer's max price or producer's price (whichever is lower)
        let final_price = offer.price_per_kwh.min(request.max_price_per_kwh);
        let energy_amount = request.energy_amount_kwh.min(offer.energy_amount_kwh);
        let total_cost = energy_amount.checked_mul(final_price).unwrap();

        // Capture addresses before moving into trade struct
        let producer_addr = offer.producer_address.clone();
        let consumer_addr = request.consumer_address.clone();

        let trade = TradeExecution {
            trade_id,
            offer_id,
            request_id,
            producer_address: producer_addr.clone(),
            consumer_address: consumer_addr.clone(),
            energy_amount_kwh: energy_amount,
            price_per_kwh: final_price,
            total_cost,
            timestamp,
            status: TradeStatus::Matched,
        };

        // Update offer and request status
        offer.status = TradeStatus::Matched;
        request.status = TradeStatus::Matched;

        offers.set(offer_id, offer);
        env.storage().instance().set(&OFFERS, &offers);

        requests.set(request_id, request);
        env.storage().instance().set(&REQUESTS, &requests);

        // Store trade
        let mut trades: Map<u64, TradeExecution> = env
            .storage()
            .instance()
            .get(&TRADES)
            .unwrap_or_else(|| Map::new(&env));
        trades.set(trade_id, trade);
        env.storage().instance().set(&TRADES, &trades);
        env.storage().instance().set(&TRADE_COUNTER, &trade_id);

        // Emit event
        env.events().publish(
            (EVT_TRADE_MATCHED, trade_id),
            (producer_addr, consumer_addr, total_cost),
        );

        trade_id
    }

    /// Settle trade
    pub fn settle_trade(env: Env, trade_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap().unwrap();
        admin.require_auth();

        let mut trades: Map<u64, TradeExecution> =
            env.storage().instance().get(&TRADES).unwrap().unwrap();
        let mut trade = trades
            .get(trade_id)
            .unwrap_or_else(|| panic!("trade not found"));

        if trade.status != TradeStatus::Matched {
            panic!("trade is not matched");
        }

        // Capture fields before mutating
        let producer_addr = trade.producer_address.clone();
        let consumer_addr = trade.consumer_address.clone();
        let trade_total_cost = trade.total_cost;

        trade.status = TradeStatus::Settled;

        trades.set(trade_id, trade);
        env.storage().instance().set(&TRADES, &trades);

        // Emit event
        env.events().publish(
            (EVT_TRADE_SETTLED, trade_id),
            (producer_addr, consumer_addr, trade_total_cost),
        );
    }

    /// Cancel offer
    pub fn cancel_offer(env: Env, offer_id: u64) {
        let offers: Map<u64, EnergyOffer> =
            env.storage().instance().get(&OFFERS).unwrap().unwrap();
        let offer = offers
            .get(offer_id)
            .unwrap_or_else(|| panic!("offer not found"));

        offer.producer_address.require_auth();

        if offer.status != TradeStatus::Open {
            panic!("offer is not open");
        }

        let mut offers_updated = offers;
        let mut offer_updated = offer;
        offer_updated.status = TradeStatus::Cancelled;
        offers_updated.set(offer_id, offer_updated);
        env.storage().instance().set(&OFFERS, &offers_updated);
    }

    /// Cancel request
    pub fn cancel_request(env: Env, request_id: u64) {
        let requests: Map<u64, EnergyRequest> =
            env.storage().instance().get(&REQUESTS).unwrap().unwrap();
        let request = requests
            .get(request_id)
            .unwrap_or_else(|| panic!("request not found"));

        request.consumer_address.require_auth();

        if request.status != TradeStatus::Open {
            panic!("request is not open");
        }

        let mut requests_updated = requests;
        let mut request_updated = request;
        request_updated.status = TradeStatus::Cancelled;
        requests_updated.set(request_id, request_updated);
        env.storage()
            .instance()
            .set(&REQUESTS, &requests_updated);
    }

    /// Get offer
    pub fn get_offer(env: Env, offer_id: u64) -> EnergyOffer {
        let offers: Map<u64, EnergyOffer> =
            env.storage().instance().get(&OFFERS).unwrap().unwrap();
        offers
            .get(offer_id)
            .unwrap_or_else(|| panic!("offer not found"))
    }

    /// Get request
    pub fn get_request(env: Env, request_id: u64) -> EnergyRequest {
        let requests: Map<u64, EnergyRequest> =
            env.storage().instance().get(&REQUESTS).unwrap().unwrap();
        requests
            .get(request_id)
            .unwrap_or_else(|| panic!("request not found"))
    }

    /// Get trade
    pub fn get_trade(env: Env, trade_id: u64) -> TradeExecution {
        let trades: Map<u64, TradeExecution> =
            env.storage().instance().get(&TRADES).unwrap().unwrap();
        trades
            .get(trade_id)
            .unwrap_or_else(|| panic!("trade not found"))
    }

    /// Get open offers
    pub fn get_open_offers(env: Env, limit: u32) -> Vec<EnergyOffer> {
        let offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&OFFERS)
            .unwrap_or_else(|| Map::new(&env));
        let timestamp = env.ledger().timestamp();

        let mut result = Vec::new(&env);
        let mut count = 0;

        for (_, offer) in offers.iter() {
            if offer.status == TradeStatus::Open && offer.expiry_timestamp > timestamp {
                result.push_back(offer);
                count += 1;
                if count >= limit {
                    break;
                }
            }
        }

        result
    }

    /// Get open requests
    pub fn get_open_requests(env: Env, limit: u32) -> Vec<EnergyRequest> {
        let requests: Map<u64, EnergyRequest> = env
            .storage()
            .instance()
            .get(&REQUESTS)
            .unwrap_or_else(|| Map::new(&env));
        let timestamp = env.ledger().timestamp();

        let mut result = Vec::new(&env);
        let mut count = 0;

        for (_, request) in requests.iter() {
            if request.status == TradeStatus::Open && request.expiry_timestamp > timestamp {
                result.push_back(request);
                count += 1;
                if count >= limit {
                    break;
                }
            }
        }

        result
    }

    /// Get user's trades
    pub fn get_user_trades(env: Env, user_address: Address, limit: u32) -> Vec<TradeExecution> {
        let trades: Map<u64, TradeExecution> = env
            .storage()
            .instance()
            .get(&TRADES)
            .unwrap_or_else(|| Map::new(&env));

        let mut result = Vec::new(&env);
        let mut count = 0;

        for (_, trade) in trades.iter() {
            if trade.producer_address == user_address || trade.consumer_address == user_address {
                result.push_back(trade);
                count += 1;
                if count >= limit {
                    break;
                }
            }
        }

        result
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap().unwrap()
    }
}
