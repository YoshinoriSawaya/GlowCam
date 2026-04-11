//! # パイプラインのセットアップ
//! アプリ起動時に一度だけ実行される、シェーダーのコンパイルやGPUリソースの確保を行います。

use super::FilterPipeline;

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
        let (glow_a, glow_b, view_a, view_b) = Self::create_glow_textures(device);

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
        }
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
                        min_binding_size: wgpu::BufferSize::new(160),
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
    ) -> (
        wgpu::Texture,
        wgpu::Texture,
        wgpu::TextureView,
        wgpu::TextureView,
    ) {
        let desc = wgpu::TextureDescriptor {
            label: Some("Glow Texture"),
            size: wgpu::Extent3d {
                width: 640,
                height: 480,
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
}
