# Shopify Function development with Rust

## Dependencies

- [Install Rust](https://www.rust-lang.org/tools/install)
- Install the WebAssembly target: `rustup target add wasm32-unknown-unknown`

## Building the function

Build this individual Function from its extension directory:

```shell
cargo build --target=wasm32-unknown-unknown --release
```

Shopify CLI also runs this command from `shopify.extension.toml` during app builds and deploys.
