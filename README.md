# Equal Earth Projection Map

OpenLayers と PMTiles を使った Equal Earth 投影の国別地図ビューアです。
Natural Earth の国ポリゴンと国名ラベルを、EPSG:8857 の Equal Earth 投影で表示します。

## Features

- Equal Earth projection (`EPSG:8857`)
- PMTiles に格納した MVT の表示
- `countries` レイヤーによる国ポリゴン表示
- `country_labels` レイヤーによる国名表示
- データが存在する z0〜5 のタイルを、表示上は z10 までオーバーズーム
- 現在の表示位置を URL ハッシュに同期

URL ハッシュは `#z/x/y` 形式です。`x` と `y` は Equal Earth 投影座標の中心位置、`z` はズームレベルです。

例:

```text
#6/1234567.89/-456789.12
```

## Requirements

- Node.js 22 以降
- npm
- `public/countries.pmtiles`

## Local Development

依存関係をインストールします。

```bash
npm ci
```

開発サーバーを起動します。

```bash
npm run dev
```

表示された URL をブラウザで開きます。通常は次の URL です。

```text
http://localhost:5173/equal-earth-projection-map/
```

本番用ビルドは次のコマンドで作成できます。

```bash
npm run build
```

生成された `dist` は次のコマンドで確認できます。

```bash
npm run preview
```

## PMTiles

ビューアは `public/countries.pmtiles` を読み込みます。PMTiles には次の MVT レイヤーを含めます。

| レイヤー | ジオメトリ | 主なプロパティ |
| --- | --- | --- |
| `countries` | Polygon | `id`, `name` |
| `country_labels` | Point | `id`, `name` |

PMTiles のデータズーム範囲は z0〜5 です。z6〜10 では z5 のデータをオーバーズーム表示します。

PMTiles を生成する場合は、PostGIS の `public.countries` と `public.country_labels` を用意し、生成スクリプトの接続情報を環境に合わせて設定してください。生成スクリプトは Equal Earth の EPSG:8857、MVT extent 4096、タイルバッファ 64 を使用します。

生成後、出力されたファイルを次の場所に配置します。

```text
public/countries.pmtiles
```

## GitHub Pages Deployment

`.github/workflows/deploy-pages.yml` により、`master` または `main` への push で自動デプロイされます。GitHub Actions の手動実行にも対応しています。

リポジトリの Settings > Pages で、公開元として **GitHub Actions** を選択してください。

公開 URL:

```text
https://hirofumikanda.github.io/equal-earth-projection-map/
```

GitHub Pages 用のベースパスは `vite.config.js` で次のように設定されています。

```javascript
base: '/equal-earth-projection-map/'
```

リポジトリ名を変更する場合は、この値と公開 URL を合わせて変更してください。

## Project Structure

```text
.
├── public/
│   └── countries.pmtiles
├── src/
│   ├── main.js
│   └── style.css
├── .github/workflows/
│   └── deploy-pages.yml
├── index.html
├── package.json
└── vite.config.js
```

## License and Source Data

MIT