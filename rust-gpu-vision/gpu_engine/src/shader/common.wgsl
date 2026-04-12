// ==========================================
// 共通定義 & 頂点シェーダー
// ==========================================

// JS/Rust側から渡されるパラメータ構造体
// ※メモリの並び順が完全に一致している必要があります

// --- 共通定義の更新 ---
struct GlowPattern {
    target_h: f32,
    target_s: f32,
    target_v: f32,
    range_h: f32,
    range_s: f32,
    range_v: f32,
    glow_h: f32,
    glow_s: f32,
    glow_v: f32,
    glow_color_blend: f32,
    glow_intensity: f32,
    is_active: f32,
}

struct FilterParams {
    patterns: array<GlowPattern, 3>,
    blur_size: f32,
    mode: f32,
    decay_rate: f32,
    attack_rate: f32,
    blur_samples: f32,
    blur_direction: f32,
    decouple_spread: f32,
    blur_angle: f32,
}

// 外部からバインドされるリソース（テクスチャや変数）
@group(0) @binding(0) var t_camera: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;
@group(0) @binding(2) var<uniform> params: FilterParams;
@group(0) @binding(3) var t_prev_glow: texture_2d<f32>;

// 頂点シェーダーからフラグメントシェーダーへ渡すデータ
struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

// --- 頂点シェーダー ---
// 頂点バッファを使わずに、頂点インデックス(0~2)だけで画面全体を覆う大きな三角形を生成する軽量な手法
@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    let x = f32(i32(in_vertex_index << 1u) & 2) * 2.0 - 1.0;
    let y = f32(i32(in_vertex_index & 2u)) * -2.0 + 1.0;
    out.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    out.tex_coords = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    return out;
}

// --- ユーティリティ関数 ---
// RGB空間からHSV（色相、彩度、明度）空間への変換
fn rgb_to_hsv(c: vec3<f32>) -> vec3<f32> {
    let k = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let p = mix(vec4<f32>(c.bg, k.wz), vec4<f32>(c.gb, k.xy), step(c.b, c.g));
    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV空間からRGB空間への変換
fn hsv_to_rgb(h: f32, s: f32, v: f32) -> vec3<f32> {
    let k = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(vec3<f32>(h) + k.xyz) * 6.0 - k.www);
    return v * mix(k.xxx, clamp(p - k.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), s);
}

// RGBから輝度（人間が感じる明るさ）を計算 (NTSC係数を使用)
fn get_luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}