/**
 * GitHub Pages 배포용으로 dist/를 후처리한다.
 * - index.html에 iOS 홈 화면 추가용 메타 태그와 apple-touch-icon 주입
 * - SPA 딥링크 새로고침이 404가 되지 않도록 404.html을 index.html로 복제
 *
 * 사용법: node scripts/prepare-pages.js (expo export --platform web 이후 실행)
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = '/lotto-angle-app';
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

let html = fs.readFileSync(indexPath, 'utf8');

const metas = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="텍스트뷰어" />',
  `<link rel="apple-touch-icon" href="${BASE_URL}/apple-touch-icon.png" />`,
  `<link rel="icon" type="image/png" href="${BASE_URL}/apple-touch-icon.png" />`,
].join('\n    ');

if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</title>', `</title>\n    ${metas}`);
}
fs.writeFileSync(indexPath, html);

fs.copyFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), path.join(distDir, 'apple-touch-icon.png'));
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

console.log('pages ready:', distDir);
