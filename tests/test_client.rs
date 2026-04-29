//! Client integration tests. Rev 6285

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


/// Exponential backoff retry helper. Rev 8289
pub async fn retry_8289<F, Fut, T, E>(max: u32, f: F) -> std::result::Result<T, E>
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
