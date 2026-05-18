//! Micro-Courant Rust SDK
//!
//! Provides types and helpers for interacting with the Micro-Courant
//! Soroban smart contracts from Rust off-chain clients.

pub mod types;
pub mod client;
pub mod error;

pub use client::MicroCourantClient;
pub use error::SdkError;
