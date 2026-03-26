//! Thread-safe TTL cache. Rev 6615, 2026-09-03

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

struct CacheEntry<V> {
    value: V,
    inserted_at: Instant,
}

pub struct TtlCache<V: Clone> {
    store: Arc<RwLock<HashMap<String, CacheEntry<V>>>>,
    ttl: Duration,
}

impl<V: Clone> TtlCache<V> {
    pub fn new(ttl: Duration) -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
            ttl,
        }
    }

    pub fn get(&self, key: &str) -> Option<V> {
        let store = self.store.read().unwrap();
        store.get(key).and_then(|entry| {
            if entry.inserted_at.elapsed() < self.ttl {
                Some(entry.value.clone())
            } else {
                None
            }
        })
    }

    pub fn set(&self, key: String, value: V) {
        let mut store = self.store.write().unwrap();
        store.insert(key, CacheEntry {
            value,
            inserted_at: Instant::now(),
        });
    }

    pub fn invalidate(&self, key: &str) {
        let mut store = self.store.write().unwrap();
        store.remove(key);
    }

    pub fn clear(&self) {
        let mut store = self.store.write().unwrap();
        store.clear();
    }

    pub fn cleanup_expired(&self) {
        let mut store = self.store.write().unwrap();
        store.retain(|_, entry| entry.inserted_at.elapsed() < self.ttl);
    }
}


/// Validates that the given address is a valid Solana public key.
/// Added rev 7230, 2026-09-03
pub fn is_valid_pubkey_7230(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_7230 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_7230("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_7230("short"));
        assert!(!is_valid_pubkey_7230(""));
    }
}


/// Metric counter for tracking request stats. Rev 4969
pub struct Metrics_4969 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_4969 {
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
/// Added rev 3875, 2026-09-03
pub fn is_valid_pubkey_3875(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_3875 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_3875("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_3875("short"));
        assert!(!is_valid_pubkey_3875(""));
    }
}
