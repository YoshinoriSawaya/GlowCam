//! # メインプロセッサ (JSインターフェース)
//! JavaScript側から直接操作される窓口です。
//! エンジン（土台）とパイプライン（描画ロジック）を連携させます。

use wasm_bindgen::prelude::*;
use web_sys::{HtmlCanvasElement, HtmlVideoElement};

use crate::engine::GpuEngine;
// 修正ポイント: GlowPattern もインポートする
use crate::params::{FilterParams, GlowPattern};
use crate::pipeline::FilterPipeline;

/// JSに公開されるメインクラス。毎フレームの処理状態を保持します。
#[wasm_bindgen]
pub struct GpuProcessor {
    engine: GpuEngine,
    pipeline: FilterPipeline,
    frame_count: usize,
}

#[wasm_bindgen]
impl GpuProcessor {
    pub async fn create(canvas: HtmlCanvasElement) -> Result<GpuProcessor, JsValue> {
        let engine = GpuEngine::new(canvas).await?;
        let pipeline = FilterPipeline::new(&engine.device, &engine.config);

        Ok(GpuProcessor {
            engine,
            pipeline,
            frame_count: 0,
        })
    }

    pub fn process_frame(&mut self, video: HtmlVideoElement, params_raw: &[f32]) {
        self.frame_count += 1;

        // JSからの配列データをRustの新しい構造体にマッピング
        let params = FilterParams {
            patterns: [
                GlowPattern {
                    target_h: params_raw[0],
                    target_s: params_raw[1],
                    target_v: params_raw[2],
                    range_h: params_raw[3],
                    range_s: params_raw[4],
                    range_v: params_raw[5],
                    glow_h: params_raw[6],
                    glow_s: params_raw[7],
                    glow_v: params_raw[8],
                    glow_color_blend: params_raw[9],
                    glow_intensity: params_raw[10],
                    is_active: params_raw[11],
                },
                GlowPattern {
                    target_h: params_raw[12],
                    target_s: params_raw[13],
                    target_v: params_raw[14],
                    range_h: params_raw[15],
                    range_s: params_raw[16],
                    range_v: params_raw[17],
                    glow_h: params_raw[18],
                    glow_s: params_raw[19],
                    glow_v: params_raw[20],
                    glow_color_blend: params_raw[21],
                    glow_intensity: params_raw[22],
                    is_active: params_raw[23],
                },
                GlowPattern {
                    target_h: params_raw[24],
                    target_s: params_raw[25],
                    target_v: params_raw[26],
                    range_h: params_raw[27],
                    range_s: params_raw[28],
                    range_v: params_raw[29],
                    glow_h: params_raw[30],
                    glow_s: params_raw[31],
                    glow_v: params_raw[32],
                    glow_color_blend: params_raw[33],
                    glow_intensity: params_raw[34],
                    is_active: params_raw[35],
                },
            ],
            blur_size: params_raw[36],
            mode: params_raw[37],
            decay_rate: params_raw[38],
            attack_rate: params_raw[39],
        };

        let frame = match self.engine.surface.get_current_texture() {
            Ok(f) => f,
            Err(_) => return,
        };

        let view = frame
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        self.pipeline.execute(
            &self.engine.device,
            &self.engine.queue,
            video,
            &params,
            &view,
            self.frame_count,
        );

        frame.present();
    }
}
