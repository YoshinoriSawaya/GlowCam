// ==========================================
// Pass 1: 発光部分の抽出と蓄積 (Accumulate)
// ==========================================

@fragment
fn fs_accumulate(in: VertexOutput) -> @location(0) vec4<f32> {
    // --- 準備設定 ---
    let unit = 1.0 / vec2<f32>(640.0, 480.0);
    let b = params.blur_size;
    let dr = params.decay_rate;

    // パラメータを安全に整数(u32)に変換
    let decouple_mode = u32(params.decouple_spread + 0.5);
    let dir_mode = u32(params.blur_direction + 0.5);
    let samples_mode = u32(params.blur_samples + 0.5);

    // 1フレームあたりの移動ステップを計算
    var step_dist = b;
    if decouple_mode == 0u {
        // 0: 従来通り Decay に連動（Decayが強い＝消えやすいほど、一歩を小さくして拡散を抑える）
        step_dist = b * (1.0 - dr);
    }

    // --- 1. 現在のフレームから発光体を抽出 ---
    // 現在の座標(中心)を基準に周囲5点サンプリングし、ノイズ耐性を高める
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

        // 3つのパターンをループして色判定
        for (var p = 0u; p < 3u; p++) {
            let pat = params.patterns[p];
            if pat.is_active < 0.5 { continue; }

            // 色相の距離
            var h_diff = abs(s_hsv.x - pat.target_h / 360.0);
            if h_diff > 0.5 { h_diff = 1.0 - h_diff; }

            let h_limit = max(pat.range_h / 360.0, 0.001);
            let h_mask = 1.0 - smoothstep(h_limit * feather_ratio, h_limit, h_diff);

            // 彩度と明度の距離
            let s_limit = max(pat.range_s, 0.001);
            let s_mask = 1.0 - smoothstep(s_limit * feather_ratio, s_limit, abs(s_hsv.y - pat.target_s));

            let v_limit = max(pat.range_v, 0.001);
            let v_mask = 1.0 - smoothstep(v_limit * feather_ratio, v_limit, abs(s_hsv.z - pat.target_v));

            let final_mask = h_mask * s_mask * v_mask;

            // 発光色の合成（指定色へのシフト）
            let glow_h_norm = pat.glow_h / 360.0;
            var target_h_diff = glow_h_norm - s_hsv.x;
            if target_h_diff > 0.5 { target_h_diff -= 1.0; }
            if target_h_diff < -0.5 { target_h_diff += 1.0; }

            let final_h = fract(s_hsv.x + target_h_diff * pat.glow_color_blend + 1.0);
            let final_s = mix(s_hsv.y, pat.glow_s, pat.glow_color_blend);
            let final_v = mix(1.0, pat.glow_v, pat.glow_color_blend);

            pixel_glow += hsv_to_rgb(final_h, final_s, final_v) * final_mask * pat.glow_intensity;
        }
        current_raw_glow += pixel_glow;
    }
    let current_glow = current_raw_glow / 5.0;

    // --- 2. 蓄積（過去フレーム）のサンプリング方向計算 ---
    var prev_glow_sum = vec3<f32>(0.0);
    var sample_count = 0.0;

    if dir_mode == 0u {
        // --- 全方位 (Radial) モード ---
        let s = step_dist;
        let d = step_dist * 0.707;

        if samples_mode >= 8u { // High Quality (8 samples)
            let prev_offsets = array<vec2<f32>, 8>(
                vec2<f32>(s, 0.0), vec2<f32>(-s, 0.0), vec2<f32>(0.0, s), vec2<f32>(0.0, -s),
                vec2<f32>(d, d), vec2<f32>(-d, d), vec2<f32>(d, -d), vec2<f32>(-d, -d)
            );
            for (var j = 0u; j < 8u; j++) {
                prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j] * unit).rgb;
            }
            sample_count = 8.0;
        } else { // Low Quality (4 samples)
            let prev_offsets = array<vec2<f32>, 4>(
                vec2<f32>(s, 0.0), vec2<f32>(-s, 0.0), vec2<f32>(0.0, s), vec2<f32>(0.0, -s)
            );
            for (var j = 0u; j < 4u; j++) {
                prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j] * unit).rgb;
            }
            sample_count = 4.0;
        }
    } else {
        // --- 指向性 (Directional) モード ---

        // 1. 基準となる角度を決定
        var base_angle: f32 = 0.0;
        var is_bidirectional: bool = false;

        if dir_mode == 1u {
            base_angle = 0.0;           // 横基準
            is_bidirectional = true;
        } else if dir_mode == 2u {
            base_angle = 90.0;          // 縦基準 (度数法で計算)
            is_bidirectional = true;
        } else {
            base_angle = 0.0;           // カスタム基準
            is_bidirectional = false;
        }

        // 2. 基準角度に blur_angle を加算して最終的なラジアンを計算
        let final_angle_deg = base_angle + params.blur_angle;
        let angle_rad = final_angle_deg * 0.01745329;

        let dir_vec = vec2<f32>(cos(angle_rad), sin(angle_rad));
        let ortho_vec = vec2<f32>(-dir_vec.y, dir_vec.x);

        if samples_mode >= 8u {
            // High Quality
            var prev_offsets: array<vec2<f32>, 8>;

            if is_bidirectional {
                // 双方向: プラス方向とマイナス方向に均等にサンプリング
                prev_offsets = array<vec2<f32>, 8>(
                    dir_vec * step_dist * 0.5,
                    dir_vec * -step_dist * 0.5,
                    dir_vec * step_dist * 1.0,
                    dir_vec * -step_dist * 1.0,
                    (dir_vec * 0.75 + ortho_vec * 0.1) * step_dist,
                    (dir_vec * -0.75 - ortho_vec * 0.1) * step_dist,
                    (dir_vec * 1.0 - ortho_vec * 0.2) * step_dist,
                    (dir_vec * -1.0 + ortho_vec * 0.2) * step_dist
                );
            } else {
                // 片方向: 全て「マイナス方向」にサンプリング
                prev_offsets = array<vec2<f32>, 8>(
                    dir_vec * -step_dist * 0.25,
                    dir_vec * -step_dist * 0.5,
                    dir_vec * -step_dist * 0.75,
                    dir_vec * -step_dist * 1.0,
                    (dir_vec * -0.5 + ortho_vec * 0.1) * step_dist,
                    (dir_vec * -0.5 - ortho_vec * 0.1) * step_dist,
                    (dir_vec * -1.0 + ortho_vec * 0.2) * step_dist,
                    (dir_vec * -1.0 - ortho_vec * 0.2) * step_dist
                );
            }

            for (var j = 0u; j < 8u; j++) {
                prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j] * unit).rgb;
            }
            sample_count = 8.0;
        } else {
            // Low Quality
            var prev_offsets: array<vec2<f32>, 4>;

            if is_bidirectional {
                // 双方向: 前後に2点ずつ
                prev_offsets = array<vec2<f32>, 4>(
                    dir_vec * step_dist * 0.5,
                    dir_vec * -step_dist * 0.5,
                    dir_vec * step_dist * 1.0,
                    dir_vec * -step_dist * 1.0
                );
            } else {
                // 片方向: 過去方向へ4点
                prev_offsets = array<vec2<f32>, 4>(
                    dir_vec * -step_dist * 0.25,
                    dir_vec * -step_dist * 0.5,
                    dir_vec * -step_dist * 0.75,
                    dir_vec * -step_dist * 1.0
                );
            }

            for (var j = 0u; j < 4u; j++) {
                prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j] * unit).rgb;
            }
            sample_count = 4.0;
        }
    }

    let prev_glow = prev_glow_sum / sample_count;

    // --- 3. 最終ブレンド処理 ---
    var final_glow: vec3<f32>;
    let cur_lum = get_luminance(current_glow);
    let prev_lum = get_luminance(prev_glow);

    if cur_lum > prev_lum {
        // 発生源の光が強い場合は Attack Rate でブレンド（輝きの立ち上がり）
        final_glow = mix(prev_glow, current_glow, params.attack_rate);
    } else {
        // 過去の光は Decay Rate で減衰しながら残像となる
        final_glow = prev_glow * dr;
    }

    return vec4<f32>(final_glow, 1.0);
}