use crate::error::SdkError;
use crate::types::ClientConfig;

/// Off-chain client for the Micro-Courant smart contracts.
///
/// # Example
/// ```no_run
/// use micro_courant_sdk::{MicroCourantClient, types::{ClientConfig, Network, ContractIds}};
///
/// let client = MicroCourantClient::new(ClientConfig {
///     rpc_url: "https://soroban-testnet.stellar.org".into(),
///     network: Network::Testnet,
///     contract_ids: ContractIds {
///         billing: Some("C...".into()),
///         ..Default::default()
///     },
/// });
/// ```
pub struct MicroCourantClient {
    pub config: ClientConfig,
}

impl MicroCourantClient {
    pub fn new(config: ClientConfig) -> Self {
        Self { config }
    }

    /// Returns the contract ID for the billing contract, or an error if not configured.
    pub fn billing_contract_id(&self) -> Result<&str, SdkError> {
        self.config
            .contract_ids
            .billing
            .as_deref()
            .ok_or(SdkError::MissingContractId("billing"))
    }

    /// Returns the contract ID for the trading contract, or an error if not configured.
    pub fn trading_contract_id(&self) -> Result<&str, SdkError> {
        self.config
            .contract_ids
            .trading
            .as_deref()
            .ok_or(SdkError::MissingContractId("trading"))
    }

    /// Returns the contract ID for the governance contract, or an error if not configured.
    pub fn governance_contract_id(&self) -> Result<&str, SdkError> {
        self.config
            .contract_ids
            .governance
            .as_deref()
            .ok_or(SdkError::MissingContractId("governance"))
    }

    /// Returns the contract ID for the settlement contract, or an error if not configured.
    pub fn settlement_contract_id(&self) -> Result<&str, SdkError> {
        self.config
            .contract_ids
            .settlement
            .as_deref()
            .ok_or(SdkError::MissingContractId("settlement"))
    }

    /// Returns the contract ID for the meter registry contract, or an error if not configured.
    pub fn meter_registry_contract_id(&self) -> Result<&str, SdkError> {
        self.config
            .contract_ids
            .meter_registry
            .as_deref()
            .ok_or(SdkError::MissingContractId("meter_registry"))
    }
}
