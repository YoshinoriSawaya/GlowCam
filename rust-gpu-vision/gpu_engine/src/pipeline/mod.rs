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

    // 処理対象の解像度（カメラ映像の実サイズに合わせて動的に決まる）
    pub(crate) width: u32,
    pub(crate) height: u32,

    // --- ここから: 毎フレーム作り直さず使い回すリソース（パフォーマンス最適化） ---
    // 映像コピー先のテクスチャ。以前は毎フレーム新規作成していたが、
    // 一度確保して中身だけ書き換える方式に変更した。
    pub(crate) _video_texture: wgpu::Texture,
    // ビュー自体は構築時にバインドグループへ組み込むだけで、以降self経由では読まないが
    // (バインドグループが内部で保持するので) 破棄されないよう保持しておく必要がある
    pub(crate) _video_view: wgpu::TextureView,
    // パラメータ用のGPUバッファも同様に使い回す（毎フレームqueue.write_bufferで上書き）
    pub(crate) params_buffer: wgpu::Buffer,

    // glow_view_a/bのどちらを読む/書くかで実質2パターンしか無いため、
    // 4つのバインドグループを起動時に事前生成しておく（毎フレームのcreate_bind_groupを無くす）
    pub(crate) bind_accum_read_a: wgpu::BindGroup,
    pub(crate) bind_accum_read_b: wgpu::BindGroup,
    pub(crate) bind_comp_write_a: wgpu::BindGroup,
    pub(crate) bind_comp_write_b: wgpu::BindGroup,
}
