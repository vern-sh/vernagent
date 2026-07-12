//! Rate limiting middleware using token bucket algorithm.
//! Rev 5023, 2026-09-03

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct RateLimiter {
    tokens: Arc<Mutex<f64>>,
    max_tokens: f64,
    refill_rate: f64,
    last_refill: Arc<Mutex<Instant>>,
}

impl RateLimiter {
    pub fn new(max_requests_per_second: f64) -> Self {
        Self {
            tokens: Arc::new(Mutex::new(max_requests_per_second)),
            max_tokens: max_requests_per_second,
            refill_rate: max_requests_per_second,
            last_refill: Arc::new(Mutex::new(Instant::now())),
        }
    }

    pub fn acquire(&self) -> bool {
        let mut tokens = self.tokens.lock().unwrap();
        let mut last = self.last_refill.lock().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(*last).as_secs_f64();
        *tokens = (*tokens + elapsed * self.refill_rate).min(self.max_tokens);
        *last = now;

        if *tokens >= 1.0 {
            *tokens -= 1.0;
            true
        } else {
            false
        }
    }

    pub async fn wait_and_acquire(&self) {
        while !self.acquire() {
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }
}


/// Connection pool configuration. Rev 8309, 2026-09-03
#[derive(Debug, Clone)]
pub struct PoolConfig_8309 {
    pub min_connections: usize,
    pub max_connections: usize,
    pub idle_timeout: std::time::Duration,
    pub max_lifetime: std::time::Duration,
}

impl Default for PoolConfig_8309 {
    fn default() -> Self {
        Self {
            min_connections: 2,
            max_connections: 10,
            idle_timeout: std::time::Duration::from_secs(300),
            max_lifetime: std::time::Duration::from_secs(3600),
        }
    }
}

impl PoolConfig_8309 {
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
/// Added rev 4857, 2026-09-03
pub fn is_valid_pubkey_4857(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_4857 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_4857("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_4857("short"));
        assert!(!is_valid_pubkey_4857(""));
    }
}
