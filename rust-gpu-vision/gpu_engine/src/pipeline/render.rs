//! # パイプラインの描画処理
//! 毎フレーム実行される、実際のGPUコマンドの構築と発行を行います。

use super::FilterPipeline;
use crate::params::FilterParams;
use web_sys::HtmlVideoElement;

impl FilterPipeline {
    /// 映像データとパラメータを受け取り、2段階のパス（蓄積と合成）を実行します。
    ///
    /// パフォーマンス上の注意: 映像用テクスチャ・パラメータ用バッファ・バインドグループは
    /// すべて起動時(setup.rs)に確保済みのものを使い回す。ここで毎フレームやるのは
    /// 「既存リソースへの書き込み」と「どの組み合わせを使うかの選択」だけで、
    /// device.create_texture / create_buffer / create_bind_group は一切呼ばない。
    pub fn execute(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        video: HtmlVideoElement,
        params: &FilterParams,
        frame_view: &wgpu::TextureView,
        frame_count: usize,
    ) {
        // 今のフレームの映像データを、確保済みのテクスチャに上書きコピーする
        self.update_video_texture(queue, video);
        // パラメータも確保済みバッファに上書きするだけ（毎フレームの新規GPUバッファ確保を回避）
        queue.write_buffer(&self.params_buffer, 0, bytemuck::cast_slice(&[*params]));

        // フレームごとに「読み込み用」と「書き込み用」のglowテクスチャを入れ替える（ピンポン処理）。
        // 組み合わせは2パターンしか無いので、対応する事前生成済みバインドグループを選ぶだけ。
        let (bind_accum, bind_comp, write_glow) = if frame_count % 2 == 0 {
            (&self.bind_accum_read_a, &self.bind_comp_write_b, &self.glow_view_b)
        } else {
            (&self.bind_accum_read_b, &self.bind_comp_write_a, &self.glow_view_a)
        };

        // Pass 1: 特定の色を抽出してぼかし、過去の光とブレンドして write_glow に保存
        let mut encoder =
            device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

        // Pass 2: 元のカメラ映像と Pass 1 で作った光を合成して、最終画面(frame_view) に出力
        self.record_pass(
            &mut encoder,
            write_glow,
            &self.pipeline_accumulate,
            bind_accum,
            "Accumulate",
        );
        self.record_pass(
            &mut encoder,
            frame_view,
            &self.pipeline_composite,
            bind_comp,
            "Composite",
        );

        queue.submit(Some(encoder.finish()));
    }

    /// HTMLのvideo要素から画像データを取得し、確保済みのGPUテクスチャに上書きコピーします。
    /// (以前は毎フレーム新規テクスチャを作っていたが、テクスチャ自体はsetup.rsで一度だけ確保済み)
    fn update_video_texture(&self, queue: &wgpu::Queue, video: HtmlVideoElement) {
        let size = wgpu::Extent3d {
            width: self.width,
            height: self.height,
            depth_or_array_layers: 1,
        };
        queue.copy_external_image_to_texture(
            &wgpu::CopyExternalImageSourceInfo {
                source: wgpu::ExternalImageSource::HTMLVideoElement(video),
                origin: wgpu::Origin2d::ZERO,
                flip_y: false,
            },
            wgpu::CopyExternalImageDestInfo {
                texture: &self._video_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
                color_space: wgpu::PredefinedColorSpace::Srgb,
                premultiplied_alpha: false,
            },
            size,
        );
    }

    /// エンコーダに対して、どのパイプラインで、どのバインドグループを使い、どこに描画するかを記録します。
    fn record_pass(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        view: &wgpu::TextureView,
        pipeline: &wgpu::RenderPipeline,
        bind_group: &wgpu::BindGroup,
        label: &str,
    ) {
        let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some(label),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        rpass.set_pipeline(pipeline);
        rpass.set_bind_group(0, bind_group, &[]);
        rpass.draw(0..3, 0..1);
    }
}
