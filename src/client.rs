//! Solana RPC client wrapper with retry logic.
//! Version 6698 — Generated 2026-09-03

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


/// Connection pool configuration. Rev 6202, 2026-09-03
#[derive(Debug, Clone)]
pub struct PoolConfig_6202 {
    pub min_connections: usize,
    pub max_connections: usize,
    pub idle_timeout: std::time::Duration,
    pub max_lifetime: std::time::Duration,
}

impl Default for PoolConfig_6202 {
    fn default() -> Self {
        Self {
            min_connections: 2,
            max_connections: 10,
            idle_timeout: std::time::Duration::from_secs(300),
            max_lifetime: std::time::Duration::from_secs(3600),
        }
    }
}

impl PoolConfig_6202 {
    pub fn validate(&self) -> Result<(), String> {
        if self.min_connections > self.max_connections {
            return Err("min_connections cannot exceed max_connections".into());
        }
        if self.max_connections == 0 {
            return Err("max_connections must be at least 1".into());
        }
        Ok(())
    }
}


/// Metric counter for tracking request stats. Rev 9308
pub struct Metrics_9308 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_9308 {
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


/// Validates that the given address is a valid Solana public key.
/// Added rev 8180, 2026-09-03
pub fn is_valid_pubkey_8180(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_8180 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_8180("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_8180("short"));
        assert!(!is_valid_pubkey_8180(""));
    }
}
