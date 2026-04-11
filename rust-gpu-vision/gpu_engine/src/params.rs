//! # パラメータ定義
//! JS側からGPU（シェーダー）へ渡すフィルターの調整パラメータを定義するファイルです。

/// シェーダーの `FilterParams` 構造体とメモリレイアウト（バイト列）を完全に一致させるための構造体です。
#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct GlowPattern {
    pub target_h: f32,
    pub target_s: f32,
    pub target_v: f32,
    pub range_h: f32, // 16 bytes
    pub range_s: f32,
    pub range_v: f32,
    pub glow_h: f32,
    pub glow_s: f32, // 16 bytes
    pub glow_v: f32,
    pub glow_color_blend: f32,
    pub glow_intensity: f32,
    pub is_active: f32, // 16 bytes
} // 計: 48 bytes (16の倍数なのでアライメント完璧です)

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct FilterParams {
    pub patterns: [GlowPattern; 3], // 48 * 3 = 144 bytes
    pub blur_size: f32,
    pub mode: f32,
    pub decay_rate: f32,
    pub attack_rate: f32, // 16 bytes
} // 計: 160 bytes

// #[repr(C)]
// #[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
// pub struct FilterParams {
//     // Axis 1: 抽出ターゲット
//     pub target_h: f32,
//     pub target_s: f32,
//     pub target_v: f32,

//     // Axis 2: 抽出レンジ（許容範囲）
//     pub range_h: f32,
//     pub range_s: f32,
//     pub range_v: f32,

//     // Axis 3: 最終的な発光色（寄せる先のHSV）
//     pub glow_h: f32,
//     pub glow_s: f32,
//     pub glow_v: f32,
//     pub glow_color_blend: f32, // 0.0=元の色を維持, 1.0=完全にglow_hsvの色にする

//     // その他の設定
//     pub glow_intensity: f32,
//     pub blur_size: f32,
//     pub mode: f32,
//     pub decay_rate: f32,
//     pub attack_rate: f32,
//     pub _pad: f32, // 合計16個のf32 = 64バイトでアライメント完璧
// }
