export const getRgbDisplay = (h: number, s: number, v: number): string => {
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const r = Math.round(f(5) * 255);
    const g = Math.round(f(3) * 255);
    const b = Math.round(f(1) * 255);
    return `RGB(${r}, ${g}, ${b})`;
};

// SVG要素を返すのではなく、描画に必要な「座標データ」だけを計算して返すように修正
export const calculateHueSegments = (h: number, range: number, width: number) => {
    const degToX = (deg: number) => (deg / 360) * width;
    const start = h - range;
    const end = h + range;
    const segments: { key: string; x: number; width: number }[] = [];

    const mainStart = Math.max(0, start);
    const mainEnd = Math.min(360, end);

    if (mainStart < mainEnd) {
        segments.push({ key: 'main', x: degToX(mainStart), width: degToX(mainEnd - mainStart) });
    }
    if (start < 0) {
        segments.push({ key: 'left-oflow', x: degToX(360 + start), width: degToX(Math.abs(start)) });
    }
    if (end > 360) {
        segments.push({ key: 'right-oflow', x: 0, width: degToX(end - 360) });
    }
    return segments;
};