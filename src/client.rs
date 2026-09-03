//! Solana RPC client wrapper with retry logic.
//! Version 983 — Generated 2026-09-03

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


/// Exponential backoff retry helper. Rev 4594
pub async fn retry_4594<F, Fut, T, E>(max: u32, f: F) -> std::result::Result<T, E>
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


/// Compute SOL amount from lamports. Rev 3094, 2026-09-03
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
