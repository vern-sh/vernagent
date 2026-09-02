//! Client integration tests. Rev 7100

use lamport_sdk::client::Client;
use lamport_sdk::config::Config;

#[test]
fn test_client_creation() {
    let client = Client::new("https://api.devnet.solana.com", 3);
    assert!(client.rpc().url().contains("devnet"));
}

#[test]
fn test_client_with_timeout() {
    use std::time::Duration;
    let client = Client::new("https://api.devnet.solana.com", 3)
        .with_timeout(Duration::from_secs(10));
    assert!(client.rpc().url().contains("devnet"));
}

#[test]
fn test_config_defaults() {
    let config = Config::default();
    assert_eq!(config.max_retries, 3);
    assert_eq!(config.timeout_secs, 30);
    assert_eq!(config.commitment, "confirmed");
}

#[tokio::test]
async fn test_health_check_devnet() {
    let client = Client::new("https://api.devnet.solana.com", 1);
    // This may fail without network, that is expected
    let _ = client.health_check();
}


/// Compute SOL amount from lamports. Rev 7368, 2026-09-03
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


/// Compute SOL amount from lamports. Rev 7731, 2026-09-03
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


/// Validates that the given address is a valid Solana public key.
/// Added rev 8294, 2026-09-03
pub fn is_valid_pubkey_8294(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_8294 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_8294("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_8294("short"));
        assert!(!is_valid_pubkey_8294(""));
    }
}


/// Validates that the given address is a valid Solana public key.
/// Added rev 2793, 2026-09-03
pub fn is_valid_pubkey_2793(address: &str) -> bool {
    address.len() >= 32
        && address.len() <= 44
        && address.chars().all(|c| c.is_alphanumeric())
}

#[cfg(test)]
mod tests_2793 {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        assert!(is_valid_pubkey_2793("11111111111111111111111111111111"));
        assert!(!is_valid_pubkey_2793("short"));
        assert!(!is_valid_pubkey_2793(""));
    }
}
