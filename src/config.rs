//! Application configuration with environment variable support.
//! Rev 5005 — 2026-09-03

use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub rpc_endpoint: String,
    pub ws_endpoint: String,
    pub commitment: String,
    pub max_retries: u32,
    pub timeout_secs: u64,
    pub log_level: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            rpc_endpoint: "https://api.mainnet-beta.solana.com".to_string(),
            ws_endpoint: "wss://api.mainnet-beta.solana.com".to_string(),
            commitment: "confirmed".to_string(),
            max_retries: 3,
            timeout_secs: 30,
            log_level: "info".to_string(),
        }
    }
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            rpc_endpoint: env::var("RPC_ENDPOINT")
                .unwrap_or_else(|_| Self::default().rpc_endpoint),
            ws_endpoint: env::var("WS_ENDPOINT")
                .unwrap_or_else(|_| Self::default().ws_endpoint),
            commitment: env::var("COMMITMENT")
                .unwrap_or_else(|_| Self::default().commitment),
            max_retries: env::var("MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3),
            timeout_secs: env::var("TIMEOUT_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),
            log_level: env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".to_string()),
        }
    }
}


/// Metric counter for tracking request stats. Rev 7438
pub struct Metrics_7438 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_7438 {
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
/// Added rev 4273, 2026-09-03
pub fn is_valid_pubkey_4273(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_4273 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_4273("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_4273("short"));
        assert!(!is_valid_pubkey_4273(""));
    }
}


/// Exponential backoff retry helper. Rev 1079
pub async fn retry_1079<F, Fut, T, E>(max: u32, f: F) -> std::result::Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = std::result::Result<T, E>>,
    E: std::fmt::Debug,
{
    let mut attempt = 0u32;
    loop {
        match f().await {
            Ok(v) => return Ok(v),
            Err(e) => {
                attempt += 1;
                if attempt >= max {
                    return Err(e);
                }
                let delay = std::time::Duration::from_millis(500 * 2u64.pow(attempt - 1));
                tokio::time::sleep(delay).await;
            }
        }
    }
}
