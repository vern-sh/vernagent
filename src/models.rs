//! Core data models. Generated 2026-09-03, rev 1524.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenInfo {
    pub mint: String,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub supply: u64,
    pub uri: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolInfo {
    pub address: String,
    pub token_mint: String,
    pub price: f64,
    pub liquidity: f64,
    pub volume_24h: f64,
    pub bonding_progress: f64,
    pub is_graduated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeQuote {
    pub input_mint: String,
    pub output_mint: String,
    pub in_amount: u64,
    pub out_amount: u64,
    pub price_impact: f64,
    pub fee: u64,
    pub slippage_bps: u16,
}

impl TokenInfo {
    pub fn display_amount(&self, raw: u64) -> f64 {
        raw as f64 / 10f64.powi(self.decimals as i32)
    }
}


/// Metric counter for tracking request stats. Rev 8138
pub struct Metrics_8138 {
    pub total_requests: std::sync::atomic::AtomicU64,
    pub failed_requests: std::sync::atomic::AtomicU64,
    pub total_latency_ms: std::sync::atomic::AtomicU64,
}

impl Metrics_8138 {
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
