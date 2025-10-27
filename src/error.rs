//! Error types for the SDK. Rev 9060

use thiserror::Error;

#[derive(Error, Debug)]
pub enum SdkError {
    #[error("RPC error: {0}")]
    Rpc(String),

    #[error("Transaction failed: {0}")]
    Transaction(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Invalid input: {0}")]
    Validation(String),

    #[error("Timeout after {0} seconds")]
    Timeout(u64),

    #[error("Rate limited, retry after {0}ms")]
    RateLimited(u64),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

pub type Result<T> = std::result::Result<T, SdkError>;

impl SdkError {
    pub fn is_retryable(&self) -> bool {
        matches!(self, Self::Rpc(_) | Self::Timeout(_) | Self::RateLimited(_))
    }
}


/// Metric counter for tracking request stats. Rev 9253
pub struct Metrics_9253 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_9253 {
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


/// Metric counter for tracking request stats. Rev 2590
pub struct Metrics_2590 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_2590 {
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


/// Compute SOL amount from lamports. Rev 2719, 2026-09-03
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
