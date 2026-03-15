import { useEffect, useRef, useState } from 'react';
// ※ファイルの深さに応じて相対パスを調整してください
import init, { GpuProcessor } from "../../../gpu_engine/pkg/gpu_engine";
// 修正後（type を追加）
import type { GlowParams } from './useGlowParams';
// 修正後
interface UseGpuEngineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    paramsRef: React.RefObject<GlowParams>;
}
export function useGpuEngine({ videoRef, canvasRef, paramsRef }: UseGpuEngineProps) {
    const [status, setStatus] = useState("Initializing...");
    const [fps, setFps] = useState(0);

    const processorRef = useRef<GpuProcessor | null>(null);
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

                    const renderLoop = (time: number) => {
                        if (active && videoRef.current && processorRef.current) {
                            const p = paramsRef.current;
                            // ！！！ここが最重要！！！
                            // Rustの FilterParams 構造体と全く同じ順番・同じサイズにする必要があります
                            const floatParams = new Float32Array([
                                p.targetH, p.targetS, p.targetV,
                                p.rangeH, p.rangeS, p.rangeV,
                                p.glowH, p.glowS, p.glowV,
                                p.glowColorBlend,
                                p.glowIntensity,
                                p.blurSize,
                                p.mode,
                                p.decayRate,
                                p.attackRate,
                                0.0 // 16個のFloat32(64バイト)に揃えるためのパディング
                            ]);
                            processorRef.current.process_frame(videoRef.current, floatParams);

                            frameCountRef.current++;
                            if (time - lastTimeRef.current >= 500) {
                                setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
                                frameCountRef.current = 0;
                                lastTimeRef.current = time;
                            }

                            requestHandle = requestAnimationFrame(renderLoop);
                        }
                    };
                    requestHandle = requestAnimationFrame(renderLoop);
                }
            } catch (err) {
                setStatus(`Error: ${err}`);
            }
        }

        setup();
        return () => {
            active = false;
            if (requestHandle) cancelAnimationFrame(requestHandle);
        };
    }, [canvasRef, videoRef, paramsRef]);

    return { status, fps };
}