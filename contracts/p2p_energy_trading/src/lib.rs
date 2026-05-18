#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TradeStatus {
    Open,
    Matched,
    Settled,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct EnergyOffer {
    pub offer_id: u64,
    pub producer_address: Address,
    pub energy_amount_kwh: u64,
    pub price_per_kwh: u64,
    pub expiry_timestamp: u64,
    pub status: TradeStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct EnergyRequest {
    pub request_id: u64,
    pub consumer_address: Address,
    pub energy_amount_kwh: u64,
    pub max_price_per_kwh: u64,
    pub expiry_timestamp: u64,
    pub status: TradeStatus,
    pub created_at: u64,
}

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

#[contract]
pub struct P2PEnergyTrading;

#[contractimpl]
impl P2PEnergyTrading {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&Symbol::new(&env, "ADMIN")) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "OFFER_COUNTER"), &0u64);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REQUEST_COUNTER"), &0u64);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TRADE_COUNTER"), &0u64);
    }

    pub fn set_settlement_contract(env: Env, settlement_contract: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SETTLE_CTR"), &settlement_contract);
    }

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
            .get(&Symbol::new(&env, "OFFER_COUNTER"))
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
            .get(&Symbol::new(&env, "OFFERS"))
            .unwrap_or_else(|| Map::new(&env));
        offers.set(offer_id, offer);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "OFFERS"), &offers);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "OFFER_COUNTER"), &offer_id);

        env.events().publish(
            (Symbol::new(&env, "OFFER_CREATED"), producer_address),
            (offer_id, energy_amount_kwh, price_per_kwh),
        );

        offer_id
    }

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
            .get(&Symbol::new(&env, "REQUEST_COUNTER"))
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
            .get(&Symbol::new(&env, "REQUESTS"))
            .unwrap_or_else(|| Map::new(&env));
        requests.set(request_id, request);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REQUESTS"), &requests);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REQUEST_COUNTER"), &request_id);

        env.events().publish(
            (Symbol::new(&env, "REQ_CREATED"), consumer_address),
            (request_id, energy_amount_kwh, max_price_per_kwh),
        );

        request_id
    }

    pub fn match_trade(env: Env, offer_id: u64, request_id: u64) -> u64 {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let mut offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "OFFERS"))
            .unwrap();
        let mut requests: Map<u64, EnergyRequest> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "REQUESTS"))
            .unwrap();

        let mut offer = offers
            .get(offer_id)
            .unwrap_or_else(|| panic!("offer not found"));
        let mut request = requests
            .get(request_id)
            .unwrap_or_else(|| panic!("request not found"));

        if offer.status != TradeStatus::Open {
            panic!("offer is not open");
        }
        if request.status != TradeStatus::Open {
            panic!("request is not open");
        }
        if offer.price_per_kwh > request.max_price_per_kwh {
            panic!("price exceeds consumer maximum");
        }
        if offer.energy_amount_kwh < request.energy_amount_kwh {
            panic!("insufficient energy amount");
        }

        let timestamp = env.ledger().timestamp();
        let trade_counter: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "TRADE_COUNTER"))
            .unwrap();
        let trade_id = trade_counter + 1;

        let final_price = offer.price_per_kwh.min(request.max_price_per_kwh);
        let energy_amount = request.energy_amount_kwh.min(offer.energy_amount_kwh);
        let total_cost = energy_amount.checked_mul(final_price).unwrap();

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

        offer.status = TradeStatus::Matched;
        request.status = TradeStatus::Matched;
        offers.set(offer_id, offer);
        requests.set(request_id, request);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "OFFERS"), &offers);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "REQUESTS"), &requests);

        let mut trades: Map<u64, TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "TRADES"))
            .unwrap_or_else(|| Map::new(&env));
        trades.set(trade_id, trade);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TRADES"), &trades);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TRADE_COUNTER"), &trade_id);

        env.events().publish(
            (Symbol::new(&env, "TRADE_MATCHED"), trade_id),
            (producer_addr, consumer_addr, total_cost),
        );

        trade_id
    }

    pub fn settle_trade(env: Env, trade_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let mut trades: Map<u64, TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "TRADES"))
            .unwrap();
        let mut trade = trades
            .get(trade_id)
            .unwrap_or_else(|| panic!("trade not found"));

        if trade.status != TradeStatus::Matched {
            panic!("trade is not matched");
        }

        let producer_addr = trade.producer_address.clone();
        let consumer_addr = trade.consumer_address.clone();
        let trade_total_cost = trade.total_cost;

        trade.status = TradeStatus::Settled;
        trades.set(trade_id, trade);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "TRADES"), &trades);

        env.events().publish(
            (Symbol::new(&env, "TRADE_SETTLED"), trade_id),
            (producer_addr, consumer_addr, trade_total_cost),
        );
    }

    pub fn cancel_offer(env: Env, offer_id: u64) {
        let offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "OFFERS"))
            .unwrap();
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
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "OFFERS"), &offers_updated);
    }

    pub fn get_offer(env: Env, offer_id: u64) -> EnergyOffer {
        let offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "OFFERS"))
            .unwrap();
        offers
            .get(offer_id)
            .unwrap_or_else(|| panic!("offer not found"))
    }

    pub fn get_request(env: Env, request_id: u64) -> EnergyRequest {
        let requests: Map<u64, EnergyRequest> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "REQUESTS"))
            .unwrap();
        requests
            .get(request_id)
            .unwrap_or_else(|| panic!("request not found"))
    }

    pub fn get_trade(env: Env, trade_id: u64) -> TradeExecution {
        let trades: Map<u64, TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "TRADES"))
            .unwrap();
        trades
            .get(trade_id)
            .unwrap_or_else(|| panic!("trade not found"))
    }

    pub fn get_open_offers(env: Env, limit: u32) -> Vec<EnergyOffer> {
        let offers: Map<u64, EnergyOffer> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "OFFERS"))
            .unwrap_or_else(|| Map::new(&env));
        let timestamp = env.ledger().timestamp();
        let mut result = Vec::new(&env);
        let mut count = 0u32;
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

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap()
    }
}
