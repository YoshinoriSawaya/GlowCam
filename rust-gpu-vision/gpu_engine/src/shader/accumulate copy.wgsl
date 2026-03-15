// ==========================================
// Pass 1: 発光部分の抽出と蓄積 (Accumulate)
// ==========================================

@fragment
fn fs_accumulate(in: VertexOutput) -> @location(0) vec4<f32> {
    // 角度(360度)で渡ってくる色相を 0.0~1.0 に正規化
    let target_h_norm = params.target_h / 360.0;
    let range_h_norm = params.range_h / 360.0;

    // ピクセル単位の移動量を計算 (640x480前提)
    let unit = 1.0 / vec2<f32>(640.0, 480.0);
    let b = params.blur_size;

    // 現在のピクセルの周囲4点＋中心の計5点をサンプリングするためのオフセット配列
    let offsets = array<vec2<f32>, 5>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(b, b) * unit, vec2<f32>(-b, b) * unit,
        vec2<f32>(b, -b) * unit, vec2<f32>(-b, -b) * unit
    );

    var current_raw_glow = vec3<f32>(0.0);

    for (var i = 0u; i < 5u; i++) {
        let s_rgb = textureSample(t_camera, s_diffuse, in.tex_coords + offsets[i]).rgb;
        let s_hsv = rgb_to_hsv(s_rgb);
        
        // 1. 抽出条件（前回のまま）
        var h_diff = abs(s_hsv.x - params.target_h / 360.0);
        if (h_diff > 0.5) { h_diff = 1.0 - h_diff; }
        
        let h_mask = 1.0 - smoothstep(0.0, max(params.range_h / 360.0, 0.001), h_diff);
        let s_mask = 1.0 - smoothstep(0.0, max(params.range_s, 0.001), abs(s_hsv.y - params.target_s));
        let v_mask = 1.0 - smoothstep(0.0, max(params.range_v, 0.001), abs(s_hsv.z - params.target_v));
        
        let final_mask = h_mask * s_mask * v_mask;

        // --- 2. 発光色を指定色(Glow HSV)へ「寄せる」処理 ---
        let glow_h_norm = params.glow_h / 360.0;
        
        // 色相(Hue)の補間（円環の最短距離を計算して寄せる）
        var target_h_diff = glow_h_norm - s_hsv.x;
        if (target_h_diff > 0.5) { target_h_diff -= 1.0; }
        if (target_h_diff < -0.5) { target_h_diff += 1.0; }
        // fract と +1.0 で値がマイナスになるのを防ぐ
        let final_h = fract(s_hsv.x + target_h_diff * params.glow_color_blend + 1.0);
        
        // 彩度と明度は単純な線形補間 (mix)
        let final_s = mix(s_hsv.y, params.glow_s, params.glow_color_blend);
        let final_v = mix(1.0, params.glow_v, params.glow_color_blend); // ベースの明度は1.0(Max)として寄せる

        // 計算した最終的な色と、マスク強度を掛けて足し合わせる
        current_raw_glow += hsv_to_rgb(final_h, final_s, final_v) * final_mask;
    }

    // 5サンプルの平均をとり、Glow強度を掛ける
    let current_glow = (current_raw_glow / 5.0) * params.glow_intensity;
    

    // --- 2. 前フレームを「4方向」からサンプリングして混ぜる ---
    // これにより、光が上下左右にじわじわ広がっていく
    let prev_offsets = array<vec2<f32>, 4>(
        vec2<f32>(b, 0.0) * unit,  // 右
        vec2<f32>(-b, 0.0) * unit, // 左
        vec2<f32>(0.0, b) * unit,  // 上
        vec2<f32>(0.0, -b) * unit  // 下
    );

    var prev_glow_sum = vec3<f32>(0.0);
    for (var j = 0u; j < 4u; j++) {
        prev_glow_sum += textureSample(t_prev_glow, s_diffuse, in.tex_coords + prev_offsets[j]).rgb;
    }
    // 4箇所の平均をとる（拡散）
    let prev_glow = prev_glow_sum / 4.0;


    // 1フレーム前の発光状態を取得
    // let prev_glow = textureSample(t_prev_glow, s_diffuse, in.tex_coords).rgb;


    // アタック（光が強くなる時）とディケイ（光が弱まる時）でブレンド率を変える
    var final_glow: vec3<f32>;
    if (get_luminance(current_glow) > get_luminance(prev_glow)) {
        // 新しい光の方が強い場合は、attack_rate の速度で光らせる
        final_glow = mix(prev_glow, current_glow, params.attack_rate);
    } else {
        // 新しい光が弱い（または無い）場合は、decay_rate を掛けて徐々に消していく（残像）
        final_glow = prev_glow * params.decay_rate;
    }

    return vec4<f32>(final_glow, 1.0);
}
