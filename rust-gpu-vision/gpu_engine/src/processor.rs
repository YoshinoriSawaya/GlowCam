//! # メインプロセッサ (JSインターフェース)
//! JavaScript側から直接操作される窓口です。
//! エンジン（土台）とパイプライン（描画ロジック）を連携させます。

use wasm_bindgen::prelude::*;
use web_sys::{HtmlCanvasElement, HtmlVideoElement};

use crate::engine::GpuEngine;
use crate::params::FilterParams;
use crate::pipeline::FilterPipeline;

/// JSに公開されるメインクラス。毎フレームの処理状態を保持します。
#[wasm_bindgen]
pub struct GpuProcessor {
    engine: GpuEngine,
    pipeline: FilterPipeline,
    frame_count: usize, // ピンポン処理（テクスチャの切り替え）に使うフレームカウンター
}

#[wasm_bindgen]
impl GpuProcessor {
    /// 初期化処理。JS側で `await GpuProcessor.create(canvas)` のように呼ばれます。
    pub async fn create(canvas: HtmlCanvasElement) -> Result<GpuProcessor, JsValue> {
        // 土台の作成
        let engine = GpuEngine::new(canvas).await?;
        // 描画ロジックの作成
        let pipeline = FilterPipeline::new(&engine.device, &engine.config);

        Ok(GpuProcessor {
            engine,
            pipeline,
            frame_count: 0,
        })
    }

    /// 毎フレーム呼ばれるメインループ処理。ビデオフレームとパラメータを受け取って描画します。
    pub fn process_frame(&mut self, video: HtmlVideoElement, params_raw: &[f32]) {
        self.frame_count += 1;

        // JSからの配列データをRustの構造体にマッピング
        let params = FilterParams {
            target_h: params_raw[0],
            target_s: params_raw[1], // 順番を揃えました
            target_v: params_raw[2],
            range_h: params_raw[3],
            range_s: params_raw[4],
            range_v: params_raw[5],
            glow_h: params_raw[6],
            glow_s: params_raw[7],
            glow_v: params_raw[8],
            glow_color_blend: params_raw[9], // 新規: 色の寄せ具合
            glow_intensity: params_raw[10],
            blur_size: params_raw[11],
            mode: params_raw[12],
            decay_rate: params_raw[13],
            attack_rate: params_raw[14],
            _pad: 0.0,
        };

        // 描画先の画面(SurfaceTexture)を取得。最小化時などは失敗するのでスキップ。
        let frame = match self.engine.surface.get_current_texture() {
            Ok(f) => f,
            Err(_) => return, // 取得失敗時はスキップ
        };
        let view = frame
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        // パイプラインに具体的な描画指示を丸投げする
        self.pipeline.execute(
            &self.engine.device,
            &self.engine.queue,
            video,
            &params,
            &view,
            self.frame_count,
        );

        // 完了したフレームを画面に表示
        frame.present();
    }
}
