// use wasm_bindgen::prelude::*;
// use web_sys::{HtmlCanvasElement, HtmlVideoElement};
// use wgpu::util::DeviceExt;

// #[repr(C)]
// #[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
// struct FilterParams {
//     target_h: f32,
//     range_h: f32,
//     target_s: f32,
//     range_s: f32,
//     target_v: f32,
//     range_v: f32,
//     glow_intensity: f32,
//     blur_size: f32,
//     mode: f32,
//     decay_rate: f32,  // ★追加: 減衰率 (0.0 ~ 1.0)
//     attack_rate: f32, // ★ _pad2 を変更
//     _pad3: f32,
// }

// #[wasm_bindgen]
// pub struct GpuProcessor {
//     device: wgpu::Device,
//     queue: wgpu::Queue,
//     surface: wgpu::Surface<'static>,
//     _config: wgpu::SurfaceConfiguration,

//     pipeline_accumulate: wgpu::RenderPipeline,
//     pipeline_composite: wgpu::RenderPipeline,

//     glow_tex_a: wgpu::Texture,
//     glow_tex_b: wgpu::Texture,
//     glow_view_a: wgpu::TextureView,
//     glow_view_b: wgpu::TextureView,

//     sampler: wgpu::Sampler,
//     frame_count: usize,
// }

// #[wasm_bindgen]
// impl GpuProcessor {
//     pub async fn create(canvas: HtmlCanvasElement) -> Result<GpuProcessor, JsValue> {
//         console_error_panic_hook::set_once();
//         let instance = wgpu::Instance::default();
//         let surface_target = wgpu::SurfaceTarget::Canvas(canvas);
//         let surface = instance
//             .create_surface(surface_target)
//             .map_err(|e| JsValue::from_str(&format!("Surface作成失敗: {}", e)))?;

//         let adapter = instance
//             .request_adapter(&wgpu::RequestAdapterOptions {
//                 compatible_surface: Some(&surface),
//                 ..Default::default()
//             })
//             .await
//             .ok_or_else(|| JsValue::from_str("GPUアダプターが見つかりません"))?;

//         let (device, queue) = adapter
//             .request_device(&wgpu::DeviceDescriptor::default(), None)
//             .await
//             .map_err(|e| JsValue::from_str(&e.to_string()))?;

//         let config = surface.get_default_config(&adapter, 640, 480).unwrap();
//         surface.configure(&device, &config);

//         let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
//             label: Some("Shader"),
//             source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
//         });

//         let sampler = device.create_sampler(&wgpu::SamplerDescriptor::default());

//         // --- BindGroupLayout: 4つのリソースを定義 ---
//         let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
//             label: Some("Video Bind Group Layout"),
//             entries: &[
//                 // 0: カメラ映像
//                 wgpu::BindGroupLayoutEntry {
//                     binding: 0,
//                     visibility: wgpu::ShaderStages::FRAGMENT,
//                     ty: wgpu::BindingType::Texture {
//                         sample_type: wgpu::TextureSampleType::Float { filterable: true },
//                         view_dimension: wgpu::TextureViewDimension::D2,
//                         multisampled: false,
//                     },
//                     count: None,
//                 },
//                 // 1: サンプラー
//                 wgpu::BindGroupLayoutEntry {
//                     binding: 1,
//                     visibility: wgpu::ShaderStages::FRAGMENT,
//                     ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
//                     count: None,
//                 },
//                 // 2: パラメータ (12個のf32 = 48バイト)
//                 wgpu::BindGroupLayoutEntry {
//                     binding: 2,
//                     visibility: wgpu::ShaderStages::FRAGMENT,
//                     ty: wgpu::BindingType::Buffer {
//                         ty: wgpu::BufferBindingType::Uniform,
//                         has_dynamic_offset: false,
//                         min_binding_size: wgpu::BufferSize::new(48),
//                     },
//                     count: None,
//                 },
//                 // 3: 過去のGlowテクスチャ (追加)
//                 wgpu::BindGroupLayoutEntry {
//                     binding: 3,
//                     visibility: wgpu::ShaderStages::FRAGMENT,
//                     ty: wgpu::BindingType::Texture {
//                         sample_type: wgpu::TextureSampleType::Float { filterable: true },
//                         view_dimension: wgpu::TextureViewDimension::D2,
//                         multisampled: false,
//                     },
//                     count: None,
//                 },
//             ],
//         });

//         let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
//             label: Some("Pipeline Layout"),
//             bind_group_layouts: &[&bind_group_layout],
//             push_constant_ranges: &[],
//         });

//         // --- パイプライン1: 発光の計算と蓄積 (fs_accumulate) ---
//         let pipeline_accumulate = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
//             label: Some("Accumulate Pipeline"),
//             layout: Some(&pipeline_layout),
//             vertex: wgpu::VertexState {
//                 module: &shader,
//                 entry_point: Some("vs_main"),
//                 buffers: &[],
//                 compilation_options: Default::default(),
//             },
//             fragment: Some(wgpu::FragmentState {
//                 module: &shader,
//                 entry_point: Some("fs_accumulate"),
//                 // 書き込み先のテクスチャフォーマットに合わせる
//                 targets: &[Some(wgpu::ColorTargetState {
//                     format: wgpu::TextureFormat::Rgba8Unorm,
//                     blend: Some(wgpu::BlendState::REPLACE),
//                     write_mask: wgpu::ColorWrites::ALL,
//                 })],
//                 compilation_options: Default::default(),
//             }),
//             primitive: wgpu::PrimitiveState::default(),
//             depth_stencil: None,
//             multisample: wgpu::MultisampleState::default(),
//             multiview: None,
//             cache: None,
//         });

//         // --- パイプライン2: 最終合成 (fs_composite) ---
//         let pipeline_composite = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
//             label: Some("Composite Pipeline"),
//             layout: Some(&pipeline_layout),
//             vertex: wgpu::VertexState {
//                 module: &shader,
//                 entry_point: Some("vs_main"),
//                 buffers: &[],
//                 compilation_options: Default::default(),
//             },
//             fragment: Some(wgpu::FragmentState {
//                 module: &shader,
//                 entry_point: Some("fs_composite"),
//                 // 画面(Surface)のフォーマットに合わせる
//                 targets: &[Some(wgpu::ColorTargetState {
//                     format: config.format,
//                     blend: Some(wgpu::BlendState::REPLACE),
//                     write_mask: wgpu::ColorWrites::ALL,
//                 })],
//                 compilation_options: Default::default(),
//             }),
//             primitive: wgpu::PrimitiveState::default(),
//             depth_stencil: None,
//             multisample: wgpu::MultisampleState::default(),
//             multiview: None,
//             cache: None,
//         });

//         // --- ピンポン用のテクスチャを2枚作成 ---
//         let glow_tex_desc = wgpu::TextureDescriptor {
//             label: Some("Glow Texture"),
//             size: wgpu::Extent3d {
//                 width: 640,
//                 height: 480,
//                 depth_or_array_layers: 1,
//             },
//             mip_level_count: 1,
//             sample_count: 1,
//             dimension: wgpu::TextureDimension::D2,
//             format: wgpu::TextureFormat::Rgba8Unorm,
//             // 読み込み(BINDING)と書き込み(RENDER_ATTACHMENT)の両方に使う
//             usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::RENDER_ATTACHMENT,
//             view_formats: &[],
//         };

//         let glow_tex_a = device.create_texture(&glow_tex_desc);
//         let glow_tex_b = device.create_texture(&glow_tex_desc);
//         let glow_view_a = glow_tex_a.create_view(&wgpu::TextureViewDescriptor::default());
//         let glow_view_b = glow_tex_b.create_view(&wgpu::TextureViewDescriptor::default());

//         Ok(GpuProcessor {
//             device,
//             queue,
//             surface,
//             _config: config,
//             pipeline_accumulate,
//             pipeline_composite,
//             glow_tex_a,
//             glow_tex_b,
//             glow_view_a,
//             glow_view_b,
//             sampler,
//             frame_count: 0,
//         })
//     }

//     pub fn process_frame(&mut self, video: HtmlVideoElement, params_raw: &[f32]) {
//         self.frame_count += 1;
//         let frame = match self.surface.get_current_texture() {
//             Ok(f) => f,
//             Err(_) => return,
//         };
//         let view = frame
//             .texture
//             .create_view(&wgpu::TextureViewDescriptor::default());

//         let video_size = wgpu::Extent3d {
//             width: 640,
//             height: 480,
//             depth_or_array_layers: 1,
//         };

//         let texture = self.device.create_texture(&wgpu::TextureDescriptor {
//             label: Some("Video Texture"),
//             size: video_size,
//             mip_level_count: 1,
//             sample_count: 1,
//             dimension: wgpu::TextureDimension::D2,
//             format: wgpu::TextureFormat::Rgba8UnormSrgb,
//             usage: wgpu::TextureUsages::TEXTURE_BINDING
//                 | wgpu::TextureUsages::COPY_DST
//                 | wgpu::TextureUsages::RENDER_ATTACHMENT,
//             view_formats: &[],
//         });

//         self.queue.copy_external_image_to_texture(
//             &wgpu::CopyExternalImageSourceInfo {
//                 source: wgpu::ExternalImageSource::HTMLVideoElement(video),
//                 origin: wgpu::Origin2d::ZERO,
//                 flip_y: false,
//             },
//             wgpu::CopyExternalImageDestInfo {
//                 texture: &texture,
//                 mip_level: 0,
//                 origin: wgpu::Origin3d::ZERO,
//                 aspect: wgpu::TextureAspect::All,
//                 color_space: wgpu::PredefinedColorSpace::Srgb,
//                 premultiplied_alpha: false,
//             },
//             video_size,
//         );

//         // 12個のパラメータ
//         let params = FilterParams {
//             target_h: params_raw[0],
//             range_h: params_raw[1],
//             target_s: params_raw[2],
//             range_s: params_raw[3],
//             target_v: params_raw[4],
//             range_v: params_raw[5],
//             glow_intensity: params_raw[6],
//             blur_size: params_raw[7],
//             mode: params_raw[8],
//             decay_rate: params_raw[9], // ★ JSから減衰率を受け取る
//             attack_rate: params_raw[10],
//             _pad3: 0.0,
//         };

//         let params_buffer = self
//             .device
//             .create_buffer_init(&wgpu::util::BufferInitDescriptor {
//                 label: Some("Params Buffer"),
//                 contents: bytemuck::cast_slice(&[params]),
//                 usage: wgpu::BufferUsages::UNIFORM,
//             });

//         let video_view = texture.create_view(&wgpu::TextureViewDescriptor::default());

//         // ピンポン判定
//         let (read_glow_view, write_glow_view) = if self.frame_count % 2 == 0 {
//             (&self.glow_view_a, &self.glow_view_b)
//         } else {
//             (&self.glow_view_b, &self.glow_view_a)
//         };

//         let bind_group_layout = self.pipeline_accumulate.get_bind_group_layout(0);

//         // Pass 1用バインドグループ
//         let bind_group_accumulate = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
//             layout: &bind_group_layout,
//             entries: &[
//                 wgpu::BindGroupEntry {
//                     binding: 0,
//                     resource: wgpu::BindingResource::TextureView(&video_view),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 1,
//                     resource: wgpu::BindingResource::Sampler(&self.sampler),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 2,
//                     resource: params_buffer.as_entire_binding(),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 3,
//                     resource: wgpu::BindingResource::TextureView(read_glow_view),
//                 },
//             ],
//             label: None,
//         });

//         // Pass 2用バインドグループ
//         let bind_group_composite = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
//             layout: &bind_group_layout,
//             entries: &[
//                 wgpu::BindGroupEntry {
//                     binding: 0,
//                     resource: wgpu::BindingResource::TextureView(&video_view),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 1,
//                     resource: wgpu::BindingResource::Sampler(&self.sampler),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 2,
//                     resource: params_buffer.as_entire_binding(),
//                 },
//                 wgpu::BindGroupEntry {
//                     binding: 3,
//                     resource: wgpu::BindingResource::TextureView(write_glow_view),
//                 },
//             ],
//             label: None,
//         });

//         let mut encoder = self
//             .device
//             .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

//         // Pass 1
//         {
//             let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
//                 label: Some("Accumulate"),
//                 color_attachments: &[Some(wgpu::RenderPassColorAttachment {
//                     view: write_glow_view, // 蓄積用テクスチャに書き込む
//                     resolve_target: None,
//                     ops: wgpu::Operations {
//                         load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
//                         store: wgpu::StoreOp::Store,
//                     },
//                 })],
//                 depth_stencil_attachment: None,
//                 timestamp_writes: None,
//                 occlusion_query_set: None,
//             });
//             rpass.set_pipeline(&self.pipeline_accumulate);
//             rpass.set_pipeline(&self.pipeline_accumulate);
//             rpass.set_bind_group(0, &bind_group_accumulate, &[]);
//             rpass.draw(0..3, 0..1);
//         }

//         // Pass 2
//         {
//             let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
//                 label: Some("Composite"),
//                 color_attachments: &[Some(wgpu::RenderPassColorAttachment {
//                     view: &view, // 最終画面(Canvas)に書き込む
//                     resolve_target: None,
//                     ops: wgpu::Operations {
//                         load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
//                         store: wgpu::StoreOp::Store,
//                     },
//                 })],
//                 depth_stencil_attachment: None,
//                 timestamp_writes: None,
//                 occlusion_query_set: None,
//             });
//             rpass.set_pipeline(&self.pipeline_composite);
//             rpass.set_bind_group(0, &bind_group_composite, &[]);
//             rpass.draw(0..3, 0..1);
//         }

//         self.queue.submit(Some(encoder.finish()));
//         frame.present();
//     }
// }
