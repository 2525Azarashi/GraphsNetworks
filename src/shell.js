// Shared HTML shell — used by the Hono worker (Cloudflare) and the static build (Vercel)
export const shell = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>てん と せん — グラフ・ネットワーク理論</title>
<meta name="description" content="グラフ・ネットワーク理論を、サカイ先輩とリョウガくんの対話と、さわれるアニメーションで直感的に学ぶ学習サイト。">
<meta name="theme-color" content="#FFF7EC">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cline x1='16' y1='44' x2='48' y2='20' stroke='%232B2A4C' stroke-width='6' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='44' r='11' fill='%23FF8FB1' stroke='%232B2A4C' stroke-width='4'/%3E%3Ccircle cx='48' cy='20' r='11' fill='%2381DCC5' stroke='%232B2A4C' stroke-width='4'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Zen+Maru+Gothic:wght@500;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="/static/css/app.css">
</head>
<body>
<div id="bg-dots" aria-hidden="true"></div>
<header id="site-header"></header>
<main id="app" tabindex="-1"></main>
<div id="curtain" aria-hidden="true"></div>
<div id="cursor" aria-hidden="true"><svg><line id="cursor-line"/><circle id="cursor-tail" r="4"/><circle id="cursor-head" r="9"/></svg></div>
<div id="toast" role="status" aria-live="polite"></div>
<script type="module" src="/static/js/main.js"></script>
</body>
</html>`
