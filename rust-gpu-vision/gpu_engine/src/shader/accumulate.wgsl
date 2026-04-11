// ==========================================
// Pass 1: 発光部分の抽出と蓄積 (Accumulate)
// ==========================================

@fragment
fn fs_accumulate(in: VertexOutput) -> @location(0) vec4<f32> {
    // --- 準備設定 ---
    let unit = 1.0 / vec2<f32>(640.0, 480.0);
    let b = params.blur_size;
    let dr = params.decay_rate;

    // 1フレームあたりの移動ステップを計算
    // Decayが高いほど1歩を小さくし、低いほど1歩を大きくすることで、
    // 「消えるまでに到達する距離」を BlurSize(b) に近似させます。
    let step_dist = b * (1.0 - dr);

    // --- 1. 現在のフレームから発光体を抽出 ---
    // 現在の座標(中心)を基準に抽出
    // ※ 周囲5点サンプリングを継続し、発生源自体にも少し厚みを持たせる
    let offsets = array<vec2<f32>, 5>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 1.0) * unit, vec2<f32>(-1.0, 1.0) * unit,
        vec2<f32>(1.0, -1.0) * unit, vec2<f32>(-1.0, -1.0) * unit
    );

    var current_raw_glow = vec3<f32>(0.0);

    let feather_ratio = 0.8;
    for (var i = 0u; i < 5u; i++) {
        let s_rgb = textureSample(t_camera, s_diffuse, in.tex_coords + offsets[i]).rgb;
        let s_hsv = rgb_to_hsv(s_rgb);

        var pixel_glow = vec3<f32>(0.0);

        // ★ 3つのパターンをループして処理
        for (var p = 0u; p < 3u; p++) {
            let pat = params.patterns[p];

            // アクティブじゃないパターンはスキップ
            if pat.is_active < 0.5 { continue; }

            var h_diff = abs(s_hsv.x - pat.target_h / 360.0);
            if h_diff > 0.5 { h_diff = 1.0 - h_diff; }

            let h_limit = max(pat.range_h / 360.0, 0.001);
            let h_mask = 1.0 - smoothstep(h_limit * feather_ratio, h_limit, h_diff);

            let s_limit = max(pat.range_s, 0.001);
            let s_mask = 1.0 - smoothstep(s_limit * feather_ratio, s_limit, abs(s_hsv.y - pat.target_s));

            let v_limit = max(pat.range_v, 0.001);
            let v_mask = 1.0 - smoothstep(v_limit * feather_ratio, v_limit, abs(s_hsv.z - pat.target_v));

            let final_mask = h_mask * s_mask * v_mask;

            // 指定色(Glow HSV)へ寄せる
            let glow_h_norm = pat.glow_h / 360.0;
            var target_h_diff = glow_h_norm - s_hsv.x;
            if target_h_diff > 0.5 { target_h_diff -= 1.0; }
            if target_h_diff < -0.5 { target_h_diff += 1.0; }

            let final_h = fract(s_hsv.x + target_h_diff * pat.glow_color_blend + 1.0);
            let final_s = mix(s_hsv.y, pat.glow_s, pat.glow_color_blend);
            let final_v = mix(1.0, pat.glow_v, pat.glow_color_blend);

            // ★ 各パターンの強度を掛けて足し合わせる
            pixel_glow += hsv_to_rgb(final_h, final_s, final_v) * final_mask * pat.glow_intensity;
        }

        current_raw_glow += pixel_glow;
    }
    // params.glow_intensity の掛け算を削除
    let current_glow = current_raw_glow / 5.0;

    // --- 2. 前フレームを「4方向」から少しずつずらしてサンプリング ---
    // 現在の座標に対して、上下左右に「一歩手前」にあった光を拾い集める
    let prev_offsets = array<vec2<f32>, 4>(
        vec2<f32>(step_dist, 0.0) * unit,  // 右方向への流れ
        vec2<f32>(-step_dist, 0.0) * unit, // 左方向への流れ
        vec2<f32>(0.0, step_dist) * unit,  // 下方向への流れ
        vec2<f32>(0.0, -step_dist) * unit// 上方向への流れ
    );

    var prev_glow_sum = vec3<f32>(0.0);
    for (var j = 0u; j < 4u; j++) {
        // prev_offsets 分だけ「外側」のピクセルから色を持ってくることで、
        // 自分のピクセルに光が「流れ込んでくる」動きになる
        prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j]).rgb;
    }

    // 4箇所の平均をとって拡散させる
    let prev_glow = prev_glow_sum / 4.0;

    // --- 3. 最終ブレンド処理 ---
    var final_glow: vec3<f32>;
    let cur_lum = get_luminance(current_glow);
    let prev_lum = get_luminance(prev_glow);

    if cur_lum > prev_lum {
        // 新しく発生した光が強い場合は、Attack Rateに従って輝かせる
        final_glow = mix(prev_glow, current_glow, params.attack_rate);
    } else {
        // 徐々に移動しながら消えていく
        final_glow = prev_glow * dr;
    }

    return vec4<f32>(final_glow, 1.0);
}