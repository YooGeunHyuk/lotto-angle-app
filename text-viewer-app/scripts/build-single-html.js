/**
 * `expo export --platform web` 결과물(dist/)을 외부 요청 없이 동작하는
 * 단일 HTML 파일로 합친다. JS 번들은 인라인 <script>로, 앱이 쓰는
 * Ionicons 폰트는 data URI @font-face로 포함한다.
 *
 * 사용법: node scripts/build-single-html.js [출력경로]
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const outPath = process.argv[2] || path.join(distDir, 'single.html');

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
const bundleName = fs.readdirSync(jsDir).find((f) => f.endsWith('.js'));
if (!bundleName) throw new Error('JS bundle not found in dist');
let bundle = fs.readFileSync(path.join(jsDir, bundleName), 'utf8');
// 인라인 <script> 안에서 태그가 조기 종료되지 않도록 이스케이프
bundle = bundle.replace(/<\/script/g, '<\\/script');

const fontsDir = path.join(
  distDir,
  'assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts',
);
const ioniconsFile = fs.readdirSync(fontsDir).find((f) => f.startsWith('Ionicons'));
if (!ioniconsFile) throw new Error('Ionicons font not found in dist');
const fontB64 = fs.readFileSync(path.join(fontsDir, ioniconsFile)).toString('base64');

const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
const iconB64 = fs.existsSync(iconPath) ? fs.readFileSync(iconPath).toString('base64') : null;

const html = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="텍스트뷰어" />
${iconB64 ? `<link rel="apple-touch-icon" href="data:image/png;base64,${iconB64}" />` : ''}
<title>말하는 텍스트뷰어</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { overflow: hidden; }
  #root { display: flex; height: 100%; flex: 1; }
  @font-face {
    font-family: 'Ionicons';
    src: url(data:font/ttf;base64,${fontB64}) format('truetype');
    font-display: block;
  }
</style>
<div id="root"></div>
<script>${bundle}</script>
`;

fs.writeFileSync(outPath, html);
console.log(`written: ${outPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
