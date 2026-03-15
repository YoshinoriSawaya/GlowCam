// frontend/src/App.tsx
import { useEffect, useRef, useState } from 'react';
import init, { GpuProcessor } from "../../gpu_engine/pkg/gpu_engine";
import Wheel from '@uiw/react-color-wheel'; // ★ライブラリをインポート

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<GpuProcessor | null>(null);

  const [status, setStatus] = useState("Initializing...");
  const [fps, setFps] = useState(0); // ★追加: FPS表示用のState

  // --- 7つのパラメータを管理 ---
  // const [params, setParams] = useState({
  //   targetH: 180, rangeH: 20,
  //   targetS: 0.5, rangeS: 0.2,
  //   targetV: 0.5, rangeV: 0.2,
  //   glowIntensity: 1.0,
  //   blurSize: 0.005,
  // });

  const [params, setParams] = useState({
    targetH: 180, rangeH: 20,
    targetS: 0.5, rangeS: 0.2,
    targetV: 0.5, rangeV: 0.2,
    glowIntensity: 1.0,
    blurSize: 0.005,
    mode: 0, // ★追加: 0=ノーマル, 1=デバッグ用マスク表示, 2=エッジ抽出...など
    decayRate: 0.85, // ★ここに追加！
    attackRate: 0.08, // ★追加！(0.01〜1.0くらいが良いです)
  });

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // ★追加: FPS計算用の変数（再レンダリングをまたいで値を保持するためRefを使用）
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let active = true;
    let requestHandle: number;

    async function setup() {
      try {
        await init();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });

        if (videoRef.current && canvasRef.current && active) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const processor = await GpuProcessor.create(canvasRef.current);
          processorRef.current = processor;
          setStatus("Running GPU Pipeline");

          // ★変更: 引数にタイムスタンプ(time)を受け取るようにする
          const renderLoop = (time: number) => {
            if (active && videoRef.current && processorRef.current) {
              const p = paramsRef.current;
              const floatParams = new Float32Array([
                p.targetH, p.rangeH,
                p.targetS, p.rangeS,
                p.targetV, p.rangeV,
                p.glowIntensity,
                p.blurSize,
                p.mode,
                p.decayRate,
                p.attackRate,
                0.0
              ]);
              processorRef.current.process_frame(videoRef.current, floatParams);

              // ★追加: FPSの計算 (500ミリ秒ごとに表示を更新)
              frameCountRef.current++;
              if (time - lastTimeRef.current >= 500) {
                setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
                frameCountRef.current = 0;
                lastTimeRef.current = time;
              }

              requestHandle = requestAnimationFrame(renderLoop);
            }
          };
          // 初回呼び出し
          requestHandle = requestAnimationFrame(renderLoop);
        }
      } catch (err) {
        setStatus(`Error: ${err}`);
      }
    }

    setup();
    return () => {
      active = false;
      cancelAnimationFrame(requestHandle);
    };
  }, []);

  // // ★Target系のスライダーを除外し、RangeとFXだけを残す
  // const controls = [
  //   { label: 'Hue Range', key: 'rangeH', min: 0, max: 180, step: 1, group: 'Hue' },
  //   { label: 'Sat Range', key: 'rangeS', min: 0, max: 0.5, step: 0.01, group: 'Sat' },
  //   { label: 'Val Range', key: 'rangeV', min: 0, max: 0.5, step: 0.01, group: 'Val' },
  //   { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1, group: 'FX' },
  //   { label: 'Blur Size', key: 'blurSize', min: 0, max: 500.0, step: 0.001, group: 'FX' },
  // ];
  // スライダーUI用の設定
  const controls = [
    { label: 'Hue Range', key: 'rangeH', min: 0, max: 180, step: 1, group: 'Hue' },
    { label: 'Sat Range', key: 'rangeS', min: 0, max: 0.5, step: 0.01, group: 'Sat' },
    { label: 'Val Range', key: 'rangeV', min: 0, max: 0.5, step: 0.01, group: 'Val' },
    { label: 'Glow Power', key: 'glowIntensity', min: 0, max: 10, step: 0.1, group: 'FX' },
    { label: 'Blur Size', key: 'blurSize', min: 0, max: 500.0, step: 0.001, group: 'FX' },
    { label: 'Decay (余韻)', key: 'decayRate', min: 0, max: 0.99, step: 0.01, group: 'FX' },
    { label: 'Attack (立ち上がり)', key: 'attackRate', min: 0.01, max: 1.0, step: 0.01, group: 'FX' },
  ];
  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ padding: '20px', color: 'white', background: '#121212', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', textAlign: 'center' }}>
        GlowCam Engine: <span style={{ color: '#00ff00' }}>{status}</span>
        {/* ★追加: FPS表示バッジ */}
        {fps > 0 && (
          <span style={{ background: '#333', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', color: '#ffcc00', border: '1px solid #665500' }}>
            {fps} FPS
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* 左側：プレビューエリア */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#00ff00', marginBottom: '5px' }}>GPU Processed Output</p>
            <canvas ref={canvasRef} width="640" height="480" style={{ width: '600px', borderRadius: '12px', border: '2px solid #00ff00', boxShadow: '0 0 20px rgba(0,255,0,0.2)' }} />
          </div>
          <video ref={videoRef} style={{ width: '200px', borderRadius: '8px', border: '1px solid #444', alignSelf: 'center' }} playsInline muted />
        </div>

        {/* 右側：コントロールパネル */}
        <div style={{ background: '#1e1e1e', padding: '25px', borderRadius: '16px', width: '350px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ marginTop: 0, color: '#aaa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Filter Controls</h3>

          {/* ★追加: ターゲットカラー表示とカラーホイール */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Target Color:</span>
              <div style={{
                flexGrow: 1,
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: `hsl(${params.targetH}, ${params.targetS * 100}%, ${params.targetV * 100}%)`,
                boxShadow: `0 0 10px hsl(${params.targetH}, 100%, 50%)`
              }} />
            </div>

            <Wheel
              color={{
                h: params.targetH,
                s: params.targetS * 100, // ライブラリは0-100なので変換
                v: params.targetV * 100,  // ライブラリは0-100なので変換
                a: 0
              }}
              onChange={(color) => {
                setParams(prev => ({
                  ...prev,
                  targetH: color.hsva.h,
                  targetS: color.hsva.s / 100, // 0-1に戻す
                  targetV: color.hsva.v / 100  // 0-1に戻す
                }));
              }}
              style={{ width: '200px', height: '200px' }} // ホイールのサイズをお好みで調整
            />
          </div>

          <hr style={{ borderColor: '#333', marginBottom: '20px' }} />
          {/* 追加: ブレンドモード選択UI */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ fontSize: '13px', color: '#ddd' }}>Blend Mode</label>
            </div>
            <select
              value={params.mode}
              onChange={(e) => updateParam('mode', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2a2a2a',
                color: '#00ff00',
                border: '1px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value={0}>覆い焼き（発光）</option>
              <option value={1}>覆い焼きカラー</option>
              <option value={2}>加算（発光）</option>
              <option value={3}>オーバーレイ</option>
              <option value={4}>スクリーン</option>
            </select>
          </div>

          <hr style={{ borderColor: '#333', marginBottom: '20px' }} />
          {/* 残りのスライダー群 */}
          {controls.map((ctrl) => (
            <div key={ctrl.key} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '13px', color: '#ddd' }}>{ctrl.label}</label>
                <span style={{ fontSize: '13px', color: '#00ff00', fontWeight: 'bold' }}>
                  {ctrl.key === 'rangeH' || ctrl.key === 'targetH' ? Math.round(params[ctrl.key as keyof typeof params]) : params[ctrl.key as keyof typeof params].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={params[ctrl.key as keyof typeof params]}
                onChange={(e) => updateParam(ctrl.key, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00ff00', cursor: 'pointer' }}
              />
            </div>
          ))}

          <button
            onClick={() => setParams({
              targetH: 180,
              rangeH: 20,
              targetS: 0.5,
              rangeS: 0.2,
              targetV: 0.5,
              rangeV: 0.2,
              glowIntensity: 1.0,
              blurSize: 0.005,
              mode: 0,
              decayRate: 0.85,
              attackRate: 0.08
            })}
            style={{
              width: '100%',
              padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px'
            }}
          >
            Reset All Params
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;