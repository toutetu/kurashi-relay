# くらしリレー アプリアイコン

くらしリレーのアプリアイコン提案と成果物をまとめたフォルダです。各 `gallery.html` はブラウザで開くと全体像（ヒーロー・5テーマ・サイズ確認）を確認でき、単体の `icon-*.svg` はそのままアイコン素材として使えます。

## ★ 採用：おやこしずく（きらきら） — `final-oyako-shizuku/`

**最終採用デザイン。** ふたつの「きぶんしずく」を立体的（つや・陰影）に、大小で並べて親子（大＝ママ／小＝あきちゃん、あきちゃんはママの80%サイズ）を表現。うしろの輪＝リレー（受け渡し）を真珠でそっと縁取り、8方向にひかる大きめのきらきらを主役に効かせています。顔・中央ハートは無し。

- 意味：**しずく2つ＝おやこの毎日／うしろの輪＝リレー／きらきら＝毎日のきらめき**
- ファイル：`gallery.html` ＋ `icon-sakura.svg`（既定）`icon-ai.svg` `icon-sora.svg` `icon-mori.svg` `icon-yoru.svg`

## きぶんカラー（5テーマ）

| キー | 名前 | tile1 | tile2 | しずく陰影(tint) |
|------|------|-------|-------|------------------|
| sakura | さくら🌸 | `#FFB4D2` | `#FF7EAF` | `#FFC9DE` |
| ai     | あい💙   | `#7C89D8` | `#4B58A6` | `#C7CEEC` |
| sora   | そら💧   | `#7FCBF2` | `#3F9FE4` | `#C7E6FA` |
| mori   | もり🌿   | `#8FD6A8` | `#46B078` | `#CDEBD9` |
| yoru   | よる🌙   | `#414574` | `#23264A` | `#AAB0E4` |

## フォルダ構成

```
docs/icons/
├── README.md
├── final-oyako-shizuku/            ★採用（おやこしずく・きらきら）
│   ├── gallery.html
│   ├── icon-sakura.svg（既定）
│   ├── icon-ai.svg / icon-sora.svg / icon-mori.svg / icon-yoru.svg
├── proposal-02-futago-shizuku/     検討：ふたごしずく（均等サイズ）
│   └── gallery.html ほか
└── proposal-01-relay-heart/        検討：リレーハート（笑顔・不採用）
    └── gallery.html ほか
```

## 経緯（採用までの流れ）

1. **proposal-01 リレーハート**（笑顔つきハート）→ 顔マークが不採用
2. **proposal-02 ふたごしずく**（均等サイズの2しずく＋中央ハート）→ 方向は好評
3. **final-oyako-shizuku**（採用）→ しずくを大小（おやこ）＆立体に、中央ハートをやめて、リレーの輪を真珠で縁取り＋きらきらを主役に

## 使い方

- ブラウザで `final-oyako-shizuku/gallery.html` を開くと、5テーマとサイズ感を確認できます。
- 単体 `icon-*.svg`（viewBox 512×512、角丸タイル込み）をアプリ／favicon／ストア用に、必要な解像度でPNG書き出しして利用してください。

## 出典

- 採用版デザインのArtifact: https://claude.ai/code/artifact/70498bc2-e912-4686-8edc-f368be5f4cef
