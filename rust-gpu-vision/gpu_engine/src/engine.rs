//! # GPU エンジン (WGPUコア)
//! グラフィックボード（GPU）と通信するための土台となるコンポーネントを管理します。

use wasm_bindgen::prelude::*;
use web_sys::HtmlCanvasElement;

/// デバイス、キュー、描画先（Surface）など、WGPUの基本となるリソースを保持する構造体です。
pub struct GpuEngine {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: wgpu::Surface<'static>,
    pub config: wgpu::SurfaceConfiguration,
}

impl GpuEngine {
    /// HTMLのCanvas要素を受け取り、GPUデバイスを初期化して紐付けます。
    /// width/height はcanvasの実ピクセルサイズ(=カメラ映像の実解像度)に合わせて
    /// 呼び出し側(processor.rs)から渡されます。
    pub async fn new(canvas: HtmlCanvasElement, width: u32, height: u32) -> Result<Self, JsValue> {
        console_error_panic_hook::set_once();
        let instance = wgpu::Instance::default();
        let surface_target = wgpu::SurfaceTarget::Canvas(canvas);
        let surface = instance
            .create_surface(surface_target)
            .map_err(|e| JsValue::from_str(&format!("Surface作成失敗: {}", e)))?;

        // 実行環境（ブラウザ）に最適なGPUアダプタを要求
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                compatible_surface: Some(&surface),
                ..Default::default()
            })
            .await
            .ok_or_else(|| JsValue::from_str("GPUアダプターが見つかりません"))?;

        // 実際の描画コマンドを受け取る論理デバイスとキューを取得
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        // 画面のサイズやフォーマット（RGBAなど）を設定
        // (以前は640x480に固定していたが、カメラの実解像度に合わせて動的に設定する)
        let config = surface.get_default_config(&adapter, width, height).unwrap();
        surface.configure(&device, &config);

        Ok(Self {
            device,
            queue,
            surface,
            config,
        })
    }
}
