# COE - セキュアなヘルスログアプリ

自律神経や服薬を記録するためのPWAヘルスログアプリです。

## 技術スタック

- **フレームワーク:** Next.js 14+ (App Router)
- **言語:** TypeScript (Strict mode)
- **スタイリング:** Tailwind CSS v4 (Deep Navy ダークモード)
- **DB/State:** Dexie.js (IndexedDB), dexie-react-hooks
- **バリデーション:** Zod
- **アイコン:** Lucide React

## アーキテクチャ原則

### 1. アトミック化 & モジュール化
- **UIコンポーネント (`components/ui/`)**: 純粋なUIパーツ（Atoms/Molecules）
- **機能コンポーネント (`components/features/`)**: ドメインロジックを持つ機能単位（Organisms）
- **レイアウト (`components/layout/`)**: ヘッダー、ボトムナビ、モバイル用ラッパー

### 2. セキュア設計 (Secure by Design)
- ユーザー入力は必ず **Zod** でバリデーション
- UIコンポーネントから直接DBを操作せず、**カスタムフック**を経由
- XSS対策: `lib/sanitize.ts` でサニタイズ関数を提供

### 3. オフラインファースト
- **Dexie.js** (IndexedDB) を正とし、電波がない状態でも動作

## ディレクトリ構造

```
src/
  app/                 # App Routerのページ
  components/
    ui/                # [Atoms/Molecules] 汎用UI (Button, Card, Input)
    features/          # [Organisms] 機能単位 (今後実装)
    layout/            # [Templates] Header, BottomNav, MobileLayout
  db/                  # Dexieの設定ファイル
  hooks/               # DBアクセス用のカスタムフック (useDayLog, useEventLogs)
  lib/                 # Zodスキーマ, ユーティリティ関数, 定数
  types/               # グローバルな型定義
```

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## データベーススキーマ

### DayLog
日次ログ（睡眠、覚醒度、片頭痛前駆症状、モード、生理、総合評価、夕食量、メモなど）

### EventLog
イベントログ（症状、服薬、トリガー、食事）

### RegimenHistory
服薬履歴（メンテナンス、減量、増量）

### Settings
アプリ設定

## カスタムフック

- `useDayLog(date)`: 特定日のDayLogを取得・更新
- `useDayLogs(startDate, endDate)`: 日付範囲でDayLogを取得
- `useEventLogs(date)`: 特定日のEventLogを取得・追加・更新・削除
- `useEventLogsByRange(startDate, endDate, type?)`: 日付範囲でEventLogを取得

## デザインシステム

### カラーテーマ: "Quiet Observer"
- **ライトモード背景:** `bg-slate-50`
- **ダークモード背景:** `bg-brand-950` (Deep Navy - #0B1221)
- **アクセントカラー:** `brand-400` (#38BDF8)

## 開発ガイドライン

1. **型安全性**: `any` の使用は禁止。TypeScript Strict modeを維持
2. **バリデーション**: すべてのユーザー入力はZodスキーマで検証
3. **DBアクセス**: UIコンポーネントから直接DBを操作せず、カスタムフックを使用
4. **XSS対策**: ユーザー入力の表示時は `sanitizeText()` または `sanitizeWithLineBreaks()` を使用
5. **コンポーネント設計**: `components/ui/` は純粋なUIのみ、ドメインロジックは持たせない

## ライセンス

Private
