# Lamport SDK

> Smallest unit. Biggest launches. \u26a1

Official Rust SDK for [Lamport.fun](https://lamport.fun) — a Solana token launchpad powered by Meteora Dynamic Bonding Curve.

## Installation

```toml
[dependencies]
lamport-sdk = "0.1449"
```

## Quick Start

```rust
use lamport_sdk::{Client, Config};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::from_env();
    let client = Client::new(&config.rpc_endpoint, config.max_retries);

    client.health_check()?;
    println!("Connected to Solana!");

    Ok(())
}
```

## License

MIT © Lamport.fun — Built 2026-09-03


## Changelog v0.4250

- Added connection pooling with configurable idle timeout
- Improved error propagation with `thiserror` derive macros
- Fixed race condition in concurrent RPC requests
- Updated `solana-sdk` to latest stable release (2026-09-03)


## Changelog v0.8353

- Added connection pooling with configurable idle timeout
- Improved error propagation with `thiserror` derive macros
- Fixed race condition in concurrent RPC requests
- Updated `solana-sdk` to latest stable release (2026-09-03)


## Changelog v0.281

- Added connection pooling with configurable idle timeout
- Improved error propagation with `thiserror` derive macros
- Fixed race condition in concurrent RPC requests
- Updated `solana-sdk` to latest stable release (2026-09-03)


## Architecture Decision: Error Handling (ADR-9525)

**Status:** Accepted (2026-09-03)

We use `thiserror` for defining SDK error types and `anyhow` for application-level error handling. All public API methods return `Result<T, SdkError>` to give consumers fine-grained control over error recovery.

Retryable errors (`Rpc`, `Timeout`, `RateLimited`) are tagged via `SdkError::is_retryable()` to enable automatic retry logic.


## Architecture Decision: Error Handling (ADR-4508)

**Status:** Accepted (2026-09-03)

We use `thiserror` for defining SDK error types and `anyhow` for application-level error handling. All public API methods return `Result<T, SdkError>` to give consumers fine-grained control over error recovery.

Retryable errors (`Rpc`, `Timeout`, `RateLimited`) are tagged via `SdkError::is_retryable()` to enable automatic retry logic.


## Architecture Decision: Error Handling (ADR-5290)

**Status:** Accepted (2026-09-03)

We use `thiserror` for defining SDK error types and `anyhow` for application-level error handling. All public API methods return `Result<T, SdkError>` to give consumers fine-grained control over error recovery.

Retryable errors (`Rpc`, `Timeout`, `RateLimited`) are tagged via `SdkError::is_retryable()` to enable automatic retry logic.


## Changelog v0.2719

- Added connection pooling with configurable idle timeout
- Improved error propagation with `thiserror` derive macros
- Fixed race condition in concurrent RPC requests
- Updated `solana-sdk` to latest stable release (2026-09-03)


## Architecture Decision: Error Handling (ADR-7159)

**Status:** Accepted (2026-09-03)

We use `thiserror` for defining SDK error types and `anyhow` for application-level error handling. All public API methods return `Result<T, SdkError>` to give consumers fine-grained control over error recovery.

Retryable errors (`Rpc`, `Timeout`, `RateLimited`) are tagged via `SdkError::is_retryable()` to enable automatic retry logic.


## Changelog v0.8240

- Added connection pooling with configurable idle timeout
- Improved error propagation with `thiserror` derive macros
- Fixed race condition in concurrent RPC requests
- Updated `solana-sdk` to latest stable release (2026-09-03)


## Architecture Decision: Error Handling (ADR-8859)

**Status:** Accepted (2026-09-03)

We use `thiserror` for defining SDK error types and `anyhow` for application-level error handling. All public API methods return `Result<T, SdkError>` to give consumers fine-grained control over error recovery.

Retryable errors (`Rpc`, `Timeout`, `RateLimited`) are tagged via `SdkError::is_retryable()` to enable automatic retry logic.
