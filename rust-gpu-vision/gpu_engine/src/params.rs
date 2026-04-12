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

// --- 構造体の定義 ---
#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct FilterParams {
    pub patterns: [GlowPattern; 3], // 144 bytes
    pub blur_size: f32,
    pub mode: f32,
    pub decay_rate: f32,
    pub attack_rate: f32, // ここまでで 160 bytes

    // ▼ 新規追加 (計16バイト追加して 176 bytes にする)
    pub blur_samples: f32,    // サンプリング数 (4.0 または 8.0)
    pub blur_direction: f32,  // 方向 (0.0: 全方位, 1.0: 横方向, 2.0: 縦方向)
    pub decouple_spread: f32, // 拡散の切り離し (0.0: Decay連動(従来), 1.0: 独立)
    pub blur_angle: f32,      // アライメント調整用のダミー変数（常に0でOK）
} // 計: 176 bytes (16の倍数なので安全)
