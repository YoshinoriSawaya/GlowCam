//! # パイプラインの描画処理
//! 毎フレーム実行される、実際のGPUコマンドの構築と発行を行います。

use super::FilterPipeline;
use crate::params::FilterParams;
use web_sys::HtmlVideoElement;
use wgpu::util::DeviceExt;

impl FilterPipeline {
    /// 映像データとパラメータを受け取り、2段階のパス（蓄積と合成）を実行します。
    pub fn execute(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        video: HtmlVideoElement,
        params: &FilterParams,
        frame_view: &wgpu::TextureView,
        frame_count: usize,
    ) {
        // 今のフレームの入力データを準備
        let video_view = self.prepare_video_texture(device, queue, video);
        let params_buffer = self.create_params_buffer(device, params);

        // フレームごとに「読み込み用」と「書き込み用」のテクスチャを入れ替える（ピンポン処理）
        let (read_glow, write_glow) = if frame_count % 2 == 0 {
            (&self.glow_view_a, &self.glow_view_b)
        } else {
            (&self.glow_view_b, &self.glow_view_a)
        };

        // 各パス向けに、リソースを実際にバインド（紐付け）したグループを作成
        let bind_accum = self.create_bind_group(device, &video_view, &params_buffer, read_glow);
        let bind_comp = self.create_bind_group(device, &video_view, &params_buffer, write_glow);

        // Pass 1: 特定の色を抽出してぼかし、過去の光とブレンドして write_glow に保存
        let mut encoder =
            device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

        // Pass 2: 元のカメラ映像と Pass 1 で作った光を合成して、最終画面(frame_view) に出力
        self.record_pass(
            &mut encoder,
            write_glow,
            &self.pipeline_accumulate,
            &bind_accum,
            "Accumulate",
        );
        self.record_pass(
            &mut encoder,
            frame_view,
            &self.pipeline_composite,
            &bind_comp,
            "Composite",
        );

        queue.submit(Some(encoder.finish()));
    }

    /// HTMLのvideo要素から画像データを取得し、GPU上のテクスチャにコピーします。
    fn prepare_video_texture(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        video: HtmlVideoElement,
    ) -> wgpu::TextureView {
        let size = wgpu::Extent3d {
            width: 640,
            height: 480,
            depth_or_array_layers: 1,
        };
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Video Texture"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::COPY_DST
                | wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        queue.copy_external_image_to_texture(
            &wgpu::CopyExternalImageSourceInfo {
                source: wgpu::ExternalImageSource::HTMLVideoElement(video),
                origin: wgpu::Origin2d::ZERO,
                flip_y: false,
            },
            wgpu::CopyExternalImageDestInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
                color_space: wgpu::PredefinedColorSpace::Srgb,
                premultiplied_alpha: false,
            },
            size,
        );
        texture.create_view(&wgpu::TextureViewDescriptor::default())
    }

    /// JSから受け取ったパラメータ構造体を、シェーダーが読めるGPUバッファに変換します。
    fn create_params_buffer(&self, device: &wgpu::Device, params: &FilterParams) -> wgpu::Buffer {
        device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Params Buffer"),
            contents: bytemuck::cast_slice(&[*params]),
            usage: wgpu::BufferUsages::UNIFORM,
        })
    }

    /// 実際に使用するリソース（カメラ映像、パラメータ、参照用Glowテクスチャ）をスロットに登録します。
    fn create_bind_group(
        &self,
        device: &wgpu::Device,
        video: &wgpu::TextureView,
        params: &wgpu::Buffer,
        glow: &wgpu::TextureView,
    ) -> wgpu::BindGroup {
        device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(video),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&self.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: params.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::TextureView(glow),
                },
            ],
            label: None,
        })
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
