use thiserror::Error;

#[derive(Debug, Error)]
pub enum SdkError {
    #[error("contract ID not configured for {0}")]
    MissingContractId(&'static str),

    #[error("no keypair configured — read-only mode")]
    ReadOnly,

    #[error("RPC error: {0}")]
    Rpc(String),

    #[error("XDR encoding error: {0}")]
    Xdr(String),

    #[error("contract error: {0}")]
    Contract(String),
}
