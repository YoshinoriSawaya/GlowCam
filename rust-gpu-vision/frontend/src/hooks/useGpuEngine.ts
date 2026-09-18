import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GlowParams, GlowPattern } from './useGlowParams';

import init, { GpuProcessor } from "../../../gpu_engine/pkg/gpu_engine";

// --- 軽量化設定 ---
// スマホでの発熱・バッテリー消費を抑えるため、描画は既定で30fpsに制限する
const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// 処理対象の映像解像度（GPUパイプライン側の前提と一致させる必要がある）
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;

export type CameraFacing = 'user' | 'environment';

export interface UseGpuEngineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    paramsRef: React.MutableRefObject<GlowParams>;
    initialFacing?: CameraFacing;
}

/** getUserMedia等の失敗理由を、スマホユーザーにも分かりやすい日本語メッセージに変換する */
function describeMediaError(err: unknown): string {
    if (err instanceof DOMException) {
        switch (err.name) {
            case 'NotAllowedError':
            case 'SecurityError':
                return 'カメラの使用が許可されませんでした。ブラウザの設定でこのサイトのカメラアクセスを許可してから、ページを再読み込みしてください。';
            case 'NotFoundError':
            case 'OverconstrainedError':
                return '利用できるカメラが見つかりませんでした。端末にカメラが接続されているか確認してください。';
            case 'NotReadableError':
                return 'カメラを起動できませんでした。他のアプリがカメラを使用中の可能性があります。そのアプリを閉じてから再度お試しください。';
            default:
                return `カメラの起動に失敗しました (${err.name})`;
        }
    }
    return `予期しないエラーが発生しました: ${String(err)}`;
}

export function useGpuEngine({ videoRef, canvasRef, paramsRef, initialFacing = 'environment' }: UseGpuEngineProps) {
    const [status, setStatus] = useState("Initializing...");
    const [fps, setFps] = useState(0);
    // WebGPU自体が使えない環境かどうか（フォールバック表示の切り替えに使用）
    const [isSupported, setIsSupported] = useState(true);
    // ユーザーに見せる用のエラーメッセージ（カメラ許可エラーなど）
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraFacing>(initialFacing);

    const processorRef = useRef<GpuProcessor | null>(null); // GpuProcessorが正しくimportされれば <GpuProcessor | null> に変更
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const lastFrameRef = useRef(0);
    const streamRef = useRef<MediaStream | null>(null);
    const runningRef = useRef(true);
    const requestHandleRef = useRef<number>(0);
    // renderLoop本体をrefに保持し、visibilitychangeからの再開でも同じ関数を呼べるようにする
    const renderLoopFnRef = useRef<((time: number) => void) | null>(null);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        // WebGPU非対応ブラウザ（iOSの古いSafariや一部Androidブラウザなど）では
        // navigator.gpu 自体が存在しないため、ここで早期に検出してフォールバック表示に切り替える
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
            setIsSupported(false);
            setStatus("WebGPU Unsupported");
            return;
        }

        let active = true;
        runningRef.current = true;

        async function setup() {
            try {
                await init();
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: CAPTURE_WIDTH },
                        height: { ideal: CAPTURE_HEIGHT },
                        facingMode: { ideal: facing },
                    }
                });
                streamRef.current = stream;

                if (videoRef.current && canvasRef.current && active) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();

                    // 実際にカメラから届いた解像度をcanvasに反映する。
                    // スマホでは指定した解像度通りに来るとは限らず、端末の向き(portrait/landscape)
                    // によって幅と高さが入れ替わって届くこともあるため、videoWidth/videoHeightという
                    // 「実測値」を使う（Rust側 GpuProcessor.create もこのcanvasサイズを読んで
                    // 処理解像度を動的に合わせる）
                    const actualWidth = videoRef.current.videoWidth || CAPTURE_WIDTH;
                    const actualHeight = videoRef.current.videoHeight || CAPTURE_HEIGHT;
                    canvasRef.current.width = actualWidth;
                    canvasRef.current.height = actualHeight;

                    // CSS側の見た目の縦横比もカメラの実アスペクト比に合わせる
                    // (以前はCSSで4:3固定だったため、縦長のスマホカメラ映像だと引き伸ばされていた)
                    canvasRef.current.style.aspectRatio = `${actualWidth} / ${actualHeight}`;

                    const processor = await GpuProcessor.create(canvasRef.current);
                    processorRef.current = processor;
                    setStatus("Running GPU Pipeline");
                    setErrorMessage(null);

                    const renderLoop = (time: number) => {
                        if (!active || !runningRef.current) return;
                        requestHandleRef.current = requestAnimationFrame(renderLoop);

                        // FPSキャップ: 目標間隔に満たない場合は処理をスキップして
                        // モバイル端末のGPU負荷・発熱・バッテリー消費を抑える
                        if (time - lastFrameRef.current < FRAME_INTERVAL_MS) return;
                        lastFrameRef.current = time;

                        if (videoRef.current && processorRef.current && paramsRef.current) {
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
                        }
                    };
                    renderLoopFnRef.current = renderLoop;
                    requestHandleRef.current = requestAnimationFrame(renderLoop);
                }
            } catch (err) {
                setErrorMessage(describeMediaError(err));
                setStatus(`Error: ${err}`);
            }
        }

        // タブがバックグラウンドに回ったら描画ループとカメラ映像を止め、
        // フォアグラウンドに戻ったら再開する（発熱・バッテリー対策）
        const handleVisibilityChange = () => {
            if (document.hidden) {
                runningRef.current = false;
                if (requestHandleRef.current) cancelAnimationFrame(requestHandleRef.current);
                videoRef.current?.pause();
            } else if (active && processorRef.current && renderLoopFnRef.current) {
                runningRef.current = true;
                lastFrameRef.current = 0;
                videoRef.current?.play().catch(() => {});
                requestHandleRef.current = requestAnimationFrame(renderLoopFnRef.current);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        setup();
        return () => {
            active = false;
            runningRef.current = false;
            renderLoopFnRef.current = null;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (requestHandleRef.current) cancelAnimationFrame(requestHandleRef.current);
            stopStream();
            // カメラ切替(facing変更)のたびに新しいGpuProcessor/WebGPU surfaceが作られるため、
            // 前のインスタンスのWASMメモリ・GPUリソースを解放してから破棄する
            const proc = processorRef.current as unknown as { free?: () => void } | null;
            proc?.free?.();
            processorRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasRef, videoRef, paramsRef, facing, stopStream]);

    const switchCamera = useCallback(() => {
        setFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
    }, []);

    return { status, fps, isSupported, errorMessage, facing, switchCamera };
}
