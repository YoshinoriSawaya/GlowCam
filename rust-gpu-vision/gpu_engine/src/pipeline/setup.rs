//! # パイプラインのセットアップ
//! アプリ起動時に一度だけ実行される、シェーダーのコンパイルやGPUリソースの確保を行います。

use super::FilterPipeline;
use crate::params::FilterParams;

impl FilterPipeline {
    /// 3つのWGSLファイルを結合してコンパイルし、パイプライン全体を構築します。
    pub fn new(device: &wgpu::Device, config: &wgpu::SurfaceConfiguration) -> Self {
        let shader_src = format!(
            "{}\n{}\n{}",
            include_str!("../shader/common.wgsl"),
            include_str!("../shader/accumulate.wgsl"),
            include_str!("../shader/composite.wgsl")
        );

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_src.into()),
        });

        let sampler = device.create_sampler(&wgpu::SamplerDescriptor::default());
        let bind_group_layout = Self::create_bind_group_layout(device);
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        // 過去フレームを保持するためのピンポン用テクスチャを2枚作成
        // (サイズは実際のcanvas解像度=configの値に合わせる。以前は640x480固定だった)
        let (glow_a, glow_b, view_a, view_b) =
            Self::create_glow_textures(device, config.width, config.height);

        // 映像コピー先のテクスチャとパラメータ用バッファは、以前は毎フレーム
        // 作り直していたが、ここで一度だけ確保して使い回すようにする。
        let video_texture = Self::create_video_texture(device, config.width, config.height);
        let video_view = video_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let params_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Params Buffer"),
            size: std::mem::size_of::<FilterParams>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // glow_view_a/bのどちらを読む/書くかは実質2パターンしか無いため、
        // 組み合わせ4つ分のバインドグループを先に作っておく
        // (video_view・params_bufferは今後書き換わらないので使い回して問題ない)
        let bind_accum_read_a = Self::create_bind_group(
            device, &bind_group_layout, &video_view, &sampler, &params_buffer, &view_a,
        );
        let bind_accum_read_b = Self::create_bind_group(
            device, &bind_group_layout, &video_view, &sampler, &params_buffer, &view_b,
        );
        let bind_comp_write_a = Self::create_bind_group(
            device, &bind_group_layout, &video_view, &sampler, &params_buffer, &view_a,
        );
        let bind_comp_write_b = Self::create_bind_group(
            device, &bind_group_layout, &video_view, &sampler, &params_buffer, &view_b,
        );

        Self {
            pipeline_accumulate: Self::create_pipeline(
                device,
                &pipeline_layout,
                &shader,
                wgpu::TextureFormat::Rgba8Unorm,
                "fs_accumulate",
            ),
            pipeline_composite: Self::create_pipeline(
                device,
                &pipeline_layout,
                &shader,
                config.format,
                "fs_composite",
            ),
            bind_group_layout,
            _glow_tex_a: glow_a,
            _glow_tex_b: glow_b,
            glow_view_a: view_a,
            glow_view_b: view_b,
            sampler,
            width: config.width,
            height: config.height,
            _video_texture: video_texture,
            _video_view: video_view,
            params_buffer,
            bind_accum_read_a,
            bind_accum_read_b,
            bind_comp_write_a,
            bind_comp_write_b,
        }
    }

    /// 実際に使用するリソース（カメラ映像、パラメータ、参照用Glowテクスチャ）をスロットに登録します。
    /// (以前はrender.rsの&selfメソッドだったが、起動時に事前生成するためstatic関数に変更)
    fn create_bind_group(
        device: &wgpu::Device,
        layout: &wgpu::BindGroupLayout,
        video: &wgpu::TextureView,
        sampler: &wgpu::Sampler,
        params: &wgpu::Buffer,
        glow: &wgpu::TextureView,
    ) -> wgpu::BindGroup {
        device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(video),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(sampler),
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

    /// シェーダーに渡すリソース（カメラ映像、サンプラ、パラメータ、過去フレーム）の「型」と「順番」を定義します。
    fn create_bind_group_layout(device: &wgpu::Device) -> wgpu::BindGroupLayout {
        device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Video Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: wgpu::BufferSize::new(176),
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
            ],
        })
    }

    /// 指定されたエントリーポイント（関数名）をもとに、RenderPipeline（描画手順書）を作成します。
    fn create_pipeline(
        device: &wgpu::Device,
        layout: &wgpu::PipelineLayout,
        shader: &wgpu::ShaderModule,
        format: wgpu::TextureFormat,
        entry_point: &str,
    ) -> wgpu::RenderPipeline {
        device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some(&format!("Pipeline {}", entry_point)),
            layout: Some(layout),
            vertex: wgpu::VertexState {
                module: shader,
                entry_point: Some("vs_main"),
                buffers: &[],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: shader,
                entry_point: Some(entry_point),
                targets: &[Some(wgpu::ColorTargetState {
                    format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        })
    }

    /// 残像（Glow）効果を計算するために、前回の結果を保存しておくテクスチャを2枚生成します。
    fn create_glow_textures(
        device: &wgpu::Device,
        width: u32,
        height: u32,
    ) -> (
        wgpu::Texture,
        wgpu::Texture,
        wgpu::TextureView,
        wgpu::TextureView,
    ) {
        let desc = wgpu::TextureDescriptor {
            label: Some("Glow Texture"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        };
        let tex_a = device.create_texture(&desc);
        let tex_b = device.create_texture(&desc);
        let view_a = tex_a.create_view(&wgpu::TextureViewDescriptor::default());
        let view_b = tex_b.create_view(&wgpu::TextureViewDescriptor::default());
        (tex_a, tex_b, view_a, view_b)
    }

    /// カメラ映像をコピーする先のテクスチャを1枚生成します。
    /// 以前は毎フレーム(render.rs内で)作り直していたが、起動時に一度だけ確保して使い回す。
    fn create_video_texture(device: &wgpu::Device, width: u32, height: u32) -> wgpu::Texture {
        device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Video Texture"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::COPY_DST
                | wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        })
    }
}
