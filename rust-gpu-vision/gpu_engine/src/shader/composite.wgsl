// ==========================================
// Pass 2: 元映像との最終合成 (Composite)
// ==========================================

@fragment
fn fs_composite(in: VertexOutput) -> @location(0) vec4<f32> {
    // B = Base (元のカメラ映像)
    let B = textureSample(t_camera, s_diffuse, in.tex_coords).rgb;
    // L = Light (Pass 1で計算された光/Glow)
    let L = textureSample(t_prev_glow, s_diffuse, in.tex_coords).rgb;
    
    var final_rgb: vec3<f32>;
    let mode = u32(params.mode);


    // 選択されたブレンドモードに従ってピクセルカラーを計算
    switch (mode) {
        case 0u: { // Glow Dodge (発光ダッジ: ペイントソフトの覆い焼き発光に近い)
            final_rgb = min(B + (B * L) / max(vec3<f32>(1.0) - L, vec3<f32>(0.001)), vec3<f32>(1.0));
        }
        case 1u: { // Color Dodge (覆い焼きカラー: コントラストが高くなる)
            final_rgb = B / max(vec3<f32>(1.0) - L, vec3<f32>(0.001));
        }
        case 2u: { // Add (加算: 光の重なりを単純に足す。一番明るくなる)
            final_rgb = B + L;
        }
        case 3u: { // Overlay (オーバーレイ: 暗いところはより暗く、明るいところはより明るく)
            let is_high = step(vec3<f32>(0.5), B);
            final_rgb = mix(2.0 * B * L, 1.0 - 2.0 * (1.0 - B) * (1.0 - L), is_high);
        }
        case 4u: { // Screen (スクリーン: 物理的な光の重なりに近く、白飛びしにくい)
            final_rgb = 1.0 - (1.0 - B) * (1.0 - L);
        }
        default: { // フォールバックは加算
            final_rgb = B + L;
        }
    }

    // 値が 0.0 ~ 1.0 の範囲に収まるようにクランプして出力
    return vec4<f32>(clamp(final_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
}