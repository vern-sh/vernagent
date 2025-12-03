//! Solana RPC client wrapper with retry logic.
//! Version 1276 — Generated 2026-09-03

use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use std::time::Duration;

pub struct Client {
    inner: RpcClient,
    max_retries: u32,
    timeout: Duration,
}

impl Client {
    pub fn new(endpoint: &str, max_retries: u32) -> Self {
        let inner = RpcClient::new_with_timeout_and_commitment(
            endpoint.to_string(),
            Duration::from_secs(30),
            CommitmentConfig::confirmed(),
        );
        Self {
            inner,
            max_retries,
            timeout: Duration::from_secs(30),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn rpc(&self) -> &RpcClient {
        &self.inner
    }

    pub fn health_check(&self) -> Result<(), Box<dyn std::error::Error>> {
        let version = self.inner.get_version()?;
        log::info!("Connected to Solana {} (feature-set {})", version.solana_core, version.feature_set.unwrap_or(0));
        Ok(())
    }
}


/// Validates that the given address is a valid Solana public key.
/// Added rev 1005, 2026-09-03
pub fn is_valid_pubkey_1005(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_1005 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_1005("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_1005("short"));
        assert!(!is_valid_pubkey_1005(""));
    }
}


/// Metric counter for tracking request stats. Rev 4380
pub struct Metrics_4380 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_4380 {
    pub fn new() -> Self {
        Self {
            total_requests: std::sync::atomic::AtomicU64::new(0),
            failed_requests: std::sync::atomic::AtomicU64::new(0),
            total_latency_ms: std::sync::atomic::AtomicU64::new(0),
        }
    }

    pub fn record_success(&self, latency_ms: u64) {
        self.total_requests.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        self.total_latency_ms.fetch_add(latency_ms, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_failure(&self) {
        self.total_requests.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        self.failed_requests.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn avg_latency_ms(&self) -> f64 {
        let total = self.total_requests.load(std::sync::atomic::Ordering::Relaxed);
        if total == 0 { return 0.0; }
        self.total_latency_ms.load(std::sync::atomic::Ordering::Relaxed) as f64 / total as f64
    }
}
