// use crate::params::FilterParams;
// use web_sys::HtmlVideoElement;
// use wgpu::util::DeviceExt;

// pub struct FilterPipeline {
//     pipeline_accumulate: wgpu::RenderPipeline,
//     pipeline_composite: wgpu::RenderPipeline,
//     bind_group_layout: wgpu::BindGroupLayout,
//     // テクスチャがドロップされないように保持しておく
//     _glow_tex_a: wgpu::Texture,
//     _glow_tex_b: wgpu::Texture,
//     glow_view_a: wgpu::TextureView,
//     glow_view_b: wgpu::TextureView,
//     sampler: wgpu::Sampler,
// }

// impl FilterPipeline {
//     pub fn new(device: &wgpu::Device, config: &wgpu::SurfaceConfiguration) -> Self {
//         let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
//             label: Some("Shader"),
//             source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
//         });

//         let sampler = device.create_sampler(&wgpu::SamplerDescriptor::default());

//         let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
//             label: Some("Video Bind Group Layout"),
//             entries: &[
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
//                 wgpu::BindGroupLayoutEntry {
//                     binding: 1,
//                     visibility: wgpu::ShaderStages::FRAGMENT,
//                     ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
//                     count: None,
//                 },
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
//             usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::RENDER_ATTACHMENT,
//             view_formats: &[],
//         };

//         let _glow_tex_a = device.create_texture(&glow_tex_desc);
//         let _glow_tex_b = device.create_texture(&glow_tex_desc);
//         let glow_view_a = _glow_tex_a.create_view(&wgpu::TextureViewDescriptor::default());
//         let glow_view_b = _glow_tex_b.create_view(&wgpu::TextureViewDescriptor::default());

//         Self {
//             pipeline_accumulate,
//             pipeline_composite,
//             bind_group_layout,
//             _glow_tex_a,
//             _glow_tex_b,
//             glow_view_a,
//             glow_view_b,
//             sampler,
//         }
//     }

//     pub fn execute(
//         &self,
//         device: &wgpu::Device,
//         queue: &wgpu::Queue,
//         video: HtmlVideoElement,
//         params: &FilterParams,
//         frame_view: &wgpu::TextureView,
//         frame_count: usize,
//     ) {
//         let video_size = wgpu::Extent3d {
//             width: 640,
//             height: 480,
//             depth_or_array_layers: 1,
//         };

//         let texture = device.create_texture(&wgpu::TextureDescriptor {
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

//         queue.copy_external_image_to_texture(
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

//         let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
//             label: Some("Params Buffer"),
//             contents: bytemuck::cast_slice(&[*params]),
//             usage: wgpu::BufferUsages::UNIFORM,
//         });

//         let video_view = texture.create_view(&wgpu::TextureViewDescriptor::default());

//         // ピンポン判定
//         let (read_glow_view, write_glow_view) = if frame_count % 2 == 0 {
//             (&self.glow_view_a, &self.glow_view_b)
//         } else {
//             (&self.glow_view_b, &self.glow_view_a)
//         };

//         let bind_group_accumulate = device.create_bind_group(&wgpu::BindGroupDescriptor {
//             layout: &self.bind_group_layout,
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

//         let bind_group_composite = device.create_bind_group(&wgpu::BindGroupDescriptor {
//             layout: &self.bind_group_layout,
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

//         let mut encoder =
//             device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

//         // Pass 1: Accumulate
//         {
//             let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
//                 label: Some("Accumulate"),
//                 color_attachments: &[Some(wgpu::RenderPassColorAttachment {
//                     view: write_glow_view,
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
//             rpass.set_bind_group(0, &bind_group_accumulate, &[]);
//             rpass.draw(0..3, 0..1);
//         }

//         // Pass 2: Composite
//         {
//             let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
//                 label: Some("Composite"),
//                 color_attachments: &[Some(wgpu::RenderPassColorAttachment {
//                     view: frame_view, // 最終画面
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

//         queue.submit(Some(encoder.finish()));
//     }
// }
