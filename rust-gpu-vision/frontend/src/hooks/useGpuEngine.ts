import React, { useState, useRef, useEffect } from 'react';
import type { GlowParams, GlowPattern } from './useGlowParams';

import init, { GpuProcessor } from "../../../gpu_engine/pkg/gpu_engine";


export interface UseGpuEngineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    paramsRef: React.MutableRefObject<GlowParams>;
}

export function useGpuEngine({ videoRef, canvasRef, paramsRef }: UseGpuEngineProps) {
    const [status, setStatus] = useState("Initializing...");
    const [fps, setFps] = useState(0);

    const processorRef = useRef<GpuProcessor | null>(null); // GpuProcessorが正しくimportされれば <GpuProcessor | null> に変更
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
                        if (active && videoRef.current && processorRef.current && paramsRef.current) {
                            const p = paramsRef.current;

                            const floatData: number[] = [];

                            // 1. 各パターンのデータを追加
                            p.patterns.forEach((pat: GlowPattern) => {
                                floatData.push(
                                    pat.targetH, pat.targetS, pat.targetV,
                                    pat.rangeH, pat.rangeS, pat.rangeV,
                                    pat.glowH, pat.glowS, pat.glowV,
                                    pat.glowColorBlend,
                                    pat.glowIntensity,
                                    pat.isActive
                                );
                            });

                            // 2. 全体設定を追加
                            floatData.push(
                                p.blurSize,
                                p.mode,
                                p.decayRate,
                                p.attackRate,
                                // --- 新規パラメータを順番通りに追加 ---
                                p.blurSamples,
                                p.blurDirection,
                                p.decoupleSpread,
                                p.blurAngle
                            );

                            // 3. パディング処理
                            while (floatData.length % 4 !== 0) {
                                floatData.push(0.0);
                            }

                            const floatParams = new Float32Array(floatData);

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