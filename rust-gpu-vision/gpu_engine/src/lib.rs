//! # GPU Engine モジュール
//! WebAssemblyとしてコンパイルされ、JavaScript側と連携するためのルートモジュールです。
//! ここで各ファイルを読み込み、外部に公開する構造体を指定します。

mod engine;
mod params;
mod pipeline;
mod processor;

// JS側から `new GpuProcessor()` のように呼び出せるように公開します
pub use processor::GpuProcessor;
