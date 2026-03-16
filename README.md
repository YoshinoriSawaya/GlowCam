以下に概要を記すが、直AIのため、後ほど修正


# GlowCam

Webカメラの映像をリアルタイムで光らせる（Glowエフェクトを付与する）Webアプリケーションです。
RustとWebGPU (WGSL) を活用し、ブラウザ上で高速かつリッチな映像処理を実現しています。

🌐 **Live Demo:** [https://glow-cam-inu.glow-cam-inu.workers.dev/](https://glow-cam-inu.glow-cam-inu.workers.dev/)

## 📝 概要 (About)
デバイスのWebカメラから取得した映像ストリームに対して、リアルタイムで発光（Glow / Bloom）エフェクトを適用します。
重い画像処理をブラウザ上で快適に動作させるため、コアロジックにRust、GPUレンダリングにWebGPUを採用しています。

## ✨ 主な機能 (Features)
- Webカメラ映像のリアルタイム取得と描画
- WGSLカスタムシェーダーによるGlowエフェクトの適用
- （※ここに追加の機能があれば記載：例 - エフェクトの強さ・しきい値のパラメータ調整など）

## 🛠 技術スタック (Tech Stack)
- **コアロジック:** Rust (WebAssembly)
- **グラフィックス・シェーダー:** WebGPU / WGSL
- **フロントエンド:** TypeScript
- **ホスティング:** Cloudflare Workers (エッジ環境)

## 📁 ディレクトリ構成 (Architecture)
- `rust-gpu-vision/` : Rustで記述された画像処理・コンピュータビジョンのコアモジュール（Wasmビルド用）
- `package.json` / `settings.json` : フロントエンドおよびプロジェクト全体の設定

## 🚀 使い方 (Usage)
1. Live DemoのURLにアクセスします。
2. ブラウザのカメラ使用許可を求められたら「許可」を選択します。
3. （※パラメータの調整方法や、画面上の操作などがあればここに記載します）

## 💻 ローカル開発環境の構築 (Getting Started)

### 前提条件 (Prerequisites)
- Node.js (v18以上推奨)
- Rust ツールチェーン (`rustup`, `cargo`)
- `wasm-pack` (RustコードのWasmコンパイル用)
- WebGPUをサポートしている最新のブラウザ (Chrome, Edge推奨)

### セットアップ (Setup)

```bash
# リポジトリのクローン
git clone [https://github.com/YoshinoriSawaya/GlowCam.git](https://github.com/YoshinoriSawaya/GlowCam.git)
cd GlowCam

# フロントエンドの依存パッケージをインストール
npm install

# RustコードをWebAssemblyにビルド（※ビルドコマンドは実際の設定に合わせて変更してください）
cd rust-gpu-vision
wasm-pack build --target web
cd ..

# ローカル開発サーバーの起動
npm run dev

```

## 🗺 今後の展望 (TODO)

* [ ] エフェクトのパラメータ（光の強度、半径など）をUIから調整可能にする
* [ ] 複数のシェーダーエフェクトの追加
* [ ] パフォーマンスのさらなる最適化（WebGPUのパイプライン調整など）

## 🐛 既知の課題・イシュー (Issues)

* [ ] WebGPU非対応ブラウザ（一部の古い環境やSafariなど）でのフォールバック処理、またはエラーハンドリング
* [ ] （※その他、現在開発中で直面している課題があれば記載）

## 📄 ライセンス (License)

This project is licensed under the [MIT License](https://www.google.com/search?q=LICENSE).
