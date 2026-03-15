struct FilterParams {
    target_h: f32, range_h: f32,
    target_s: f32, range_s: f32,
    target_v: f32, range_v: f32,
    glow_intensity: f32, blur_size: f32,
    mode: f32,
    decay_rate: f32,
    attack_rate: f32,
    _pad3: f32,
}

@group(0) @binding(0) var t_camera: texture_2d<f32>;
@group(0) @binding(1) var s_diffuse: sampler;
@group(0) @binding(2) var<uniform> params: FilterParams;
@group(0) @binding(3) var t_prev_glow: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> VertexOutput {
    var out: VertexOutput;
    let x = f32(i32(in_vertex_index << 1u) & 2) * 2.0 - 1.0;
    let y = f32(i32(in_vertex_index & 2u)) * -2.0 + 1.0;
    out.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    out.tex_coords = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    return out;
}

fn rgb_to_hsv(c: vec3<f32>) -> vec3<f32> {
    let k = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    let p = mix(vec4<f32>(c.bg, k.wz), vec4<f32>(c.gb, k.xy), step(c.b, c.g));
    let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
    let d = q.x - min(q.w, q.y);
    let e = 1.0e-10;
    return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv_to_rgb(h: f32, s: f32, v: f32) -> vec3<f32> {
    let k = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(vec3<f32>(h) + k.xyz) * 6.0 - k.www);
    return v * mix(k.xxx, clamp(p - k.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), s);
}

// 輝度計算
fn get_luminance(rgb: vec3<f32>) -> f32 {
    return dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@fragment
fn fs_accumulate(in: VertexOutput) -> @location(0) vec4<f32> {
    let target_h_norm = params.target_h / 360.0;
    let range_h_norm = params.range_h / 360.0;
    let unit = 1.0 / vec2<f32>(640.0, 480.0);
    let b = params.blur_size;

    // 4角＋中心サンプリング
    let offsets = array<vec2<f32>, 5>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(b, b) * unit, vec2<f32>(-b, b) * unit,
        vec2<f32>(b, -b) * unit, vec2<f32>(-b, -b) * unit
    );

    var current_raw_glow = vec3<f32>(0.0);
    for (var i = 0u; i < 5u; i++) {
        let s_rgb = textureSample(t_camera, s_diffuse, in.tex_coords + offsets[i]).rgb;
        let s_hsv = rgb_to_hsv(s_rgb);
        
        var h_diff = abs(s_hsv.x - target_h_norm);
        if (h_diff > 0.5) { h_diff = 1.0 - h_diff; }
        
        let mask = (1.0 - smoothstep(0.0, range_h_norm, h_diff))
                 * smoothstep(params.target_s - 0.2, params.target_s, s_hsv.y)
                 * smoothstep(params.target_v - 0.2, params.target_v, s_hsv.z);
        
        current_raw_glow += hsv_to_rgb(target_h_norm, 1.0, 1.0) * mask;
    }
    
    let current_glow = (current_raw_glow / 5.0) * params.glow_intensity;
    let prev_glow = textureSample(t_prev_glow, s_diffuse, in.tex_coords).rgb;

    // アタック（光り始め）とリリース（減衰）の分離
    var final_glow: vec3<f32>;
    if (get_luminance(current_glow) > get_luminance(prev_glow)) {
        final_glow = mix(prev_glow, current_glow, params.attack_rate);
    } else {
        final_glow = prev_glow * params.decay_rate;
    }

    return vec4<f32>(final_glow, 1.0);
}

@fragment
fn fs_composite(in: VertexOutput) -> @location(0) vec4<f32> {
    let B = textureSample(t_camera, s_diffuse, in.tex_coords).rgb;
    let L = textureSample(t_prev_glow, s_diffuse, in.tex_coords).rgb;
    
    var final_rgb: vec3<f32>;
    let mode = u32(params.mode);

    switch (mode) {
        case 0u: { // Glow Dodge
            final_rgb = min(B + (B * L) / max(vec3<f32>(1.0) - L, vec3<f32>(0.001)), vec3<f32>(1.0));
        }
        case 1u: { // Color Dodge
            final_rgb = B / max(vec3<f32>(1.0) - L, vec3<f32>(0.001));
        }
        case 2u: { // Add
            final_rgb = B + L;
        }
        case 3u: { // Overlay
            let is_high = step(vec3<f32>(0.5), B);
            final_rgb = mix(2.0 * B * L, 1.0 - 2.0 * (1.0 - B) * (1.0 - L), is_high);
        }
        case 4u: { // Screen
            final_rgb = 1.0 - (1.0 - B) * (1.0 - L);
        }
        default: {
            final_rgb = B + L;
        }
    }

    return vec4<f32>(clamp(final_rgb, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
}