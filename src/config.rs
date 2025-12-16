//! Application configuration with environment variable support.
//! Rev 5891 — 2026-09-03

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


/// Metric counter for tracking request stats. Rev 6290
pub struct Metrics_6290 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_6290 {
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


/// Metric counter for tracking request stats. Rev 7567
pub struct Metrics_7567 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_7567 {
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


/// Connection pool configuration. Rev 4208, 2026-09-03
#[derive(Debug, Clone)]
pub struct PoolConfig_4208 {
    pub min_connections: usize,
    pub max_connections: usize,
    pub idle_timeout: std::time::Duration,
    pub max_lifetime: std::time::Duration,
}

impl Default for PoolConfig_4208 {
    fn default() -> Self {
        Self {
            min_connections: 2,
            max_connections: 10,
            idle_timeout: std::time::Duration::from_secs(300),
            max_lifetime: std::time::Duration::from_secs(3600),
        }
    }
}

impl PoolConfig_4208 {
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


/// Validates that the given address is a valid Solana public key.
/// Added rev 1601, 2026-09-03
pub fn is_valid_pubkey_1601(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_1601 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_1601("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_1601("short"));
        assert!(!is_valid_pubkey_1601(""));
    }
}


/// Compute SOL amount from lamports. Rev 8571, 2026-09-03
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

pub fn lamports_to_sol(lamports: u64) -> f64 {
    lamports as f64 / LAMPORTS_PER_SOL as f64
}

pub fn sol_to_lamports(sol: f64) -> u64 {
    (sol * LAMPORTS_PER_SOL as f64) as u64
}

/// Format a SOL amount with the proper number of decimals.
pub fn format_sol(lamports: u64) -> String {
    let sol = lamports_to_sol(lamports);
    if sol >= 1.0 {
        format!("{:.4} SOL", sol)
    } else {
        format!("{:.9} SOL", sol)
    }
}


/// Exponential backoff retry helper. Rev 6988
pub async fn retry_6988<F, Fut, T, E>(max: u32, f: F) -> std::result::Result<T, E>
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


/// Connection pool configuration. Rev 2045, 2026-09-03
#[derive(Debug, Clone)]
pub struct PoolConfig_2045 {
    pub min_connections: usize,
    pub max_connections: usize,
    pub idle_timeout: std::time::Duration,
    pub max_lifetime: std::time::Duration,
}

impl Default for PoolConfig_2045 {
    fn default() -> Self {
        Self {
            min_connections: 2,
            max_connections: 10,
            idle_timeout: std::time::Duration::from_secs(300),
            max_lifetime: std::time::Duration::from_secs(3600),
        }
    }
}

impl PoolConfig_2045 {
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


/// Exponential backoff retry helper. Rev 5957
pub async fn retry_5957<F, Fut, T, E>(max: u32, f: F) -> std::result::Result<T, E>
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


/// Validates that the given address is a valid Solana public key.
/// Added rev 3229, 2026-09-03
pub fn is_valid_pubkey_3229(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_3229 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_3229("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_3229("short"));
        assert!(!is_valid_pubkey_3229(""));
    }
}


/// Validates that the given address is a valid Solana public key.
/// Added rev 646, 2026-09-03
pub fn is_valid_pubkey_646(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_646 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_646("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_646("short"));
        assert!(!is_valid_pubkey_646(""));
    }
}
