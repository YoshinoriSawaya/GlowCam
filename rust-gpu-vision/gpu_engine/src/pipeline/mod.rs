//! # パイプライン定義
//! シェーダーのコンパイル結果や、描画に必要な設定（レイアウト、テクスチャ）をまとめたモジュールです。

mod render;
mod setup;

/// 2つの描画パス（発光抽出と最終合成）を実行するための各種リソースを保持します。
pub struct FilterPipeline {
    pub(crate) pipeline_accumulate: wgpu::RenderPipeline,
    pub(crate) pipeline_composite: wgpu::RenderPipeline,
    pub(crate) bind_group_layout: wgpu::BindGroupLayout,

    // テクスチャ自体はドロップされないように保持しておく必要がある
    pub(crate) _glow_tex_a: wgpu::Texture,
    pub(crate) _glow_tex_b: wgpu::Texture,

    // 実際に読み書きに使うのはこちらのView
    pub(crate) glow_view_a: wgpu::TextureView,
    pub(crate) glow_view_b: wgpu::TextureView,
    pub(crate) sampler: wgpu::Sampler,
}
