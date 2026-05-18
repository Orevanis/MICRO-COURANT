use serde::{Deserialize, Serialize};

/// Billing mode for a household account.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BillingMode {
    Prepaid,
    Postpaid,
}

/// Status of a P2P energy trade.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TradeStatus {
    Open,
    Matched,
    Settled,
    Cancelled,
}

/// Status of a grid settlement record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SettlementStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// Type of settlement transaction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SettlementType {
    ConsumptionBilling,
    P2PTrade,
    SubsidyDistribution,
    Refund,
}

/// Status of a governance proposal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

/// Contract IDs for all Micro-Courant contracts.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ContractIds {
    pub meter_registry: Option<String>,
    pub billing: Option<String>,
    pub trading: Option<String>,
    pub governance: Option<String>,
    pub settlement: Option<String>,
}

/// Client configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    pub rpc_url: String,
    pub network: Network,
    pub contract_ids: ContractIds,
}

/// Stellar network selection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Network {
    Testnet,
    Public,
}

impl Network {
    pub fn passphrase(&self) -> &'static str {
        match self {
            Network::Testnet => "Test SDF Network ; September 2015",
            Network::Public => "Public Global Stellar Network ; September 2015",
        }
    }
}
