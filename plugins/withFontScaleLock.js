// Config plugin: Android MainActivity에 fontScale=1.0 고정을 주입.
// managed workflow라 prebuild가 MainActivity.kt를 매번 재생성하므로,
// 시스템 글꼴 크기(접근성 큰 글꼴)에 레이아웃이 깨지지 않게 네이티브 레벨에서 잠근다.
// newArch(Fabric)에서 JS의 Text.defaultProps.allowFontScaling=false 가 안 먹는 경우 대비.
const { withMainActivity } = require('@expo/config-plugins');

const ATTACH_BASE_CONTEXT = `  override fun attachBaseContext(newBase: Context) {
    val configuration = Configuration(newBase.resources.configuration)
    configuration.fontScale = 1.0f
    applyOverrideConfiguration(configuration)
    super.attachBaseContext(newBase)
  }`;

module.exports = function withFontScaleLock(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (cfg.modResults.language !== 'kt') {
      // 이 앱은 Kotlin MainActivity. 예상과 다르면 변경 없이 통과(빌드 안 깨지게).
      return cfg;
    }

    // 1) 필요한 import 추가 (중복 방지).
    if (!src.includes('import android.content.res.Configuration')) {
      src = src.replace(
        'import android.os.Bundle',
        'import android.content.Context\nimport android.content.res.Configuration\nimport android.os.Bundle',
      );
    }

    // 2) attachBaseContext override를 onCreate 앞에 삽입 (중복 방지).
    if (!src.includes('override fun attachBaseContext')) {
      src = src.replace(
        '  override fun onCreate(savedInstanceState: Bundle?) {',
        `${ATTACH_BASE_CONTEXT}\n\n  override fun onCreate(savedInstanceState: Bundle?) {`,
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
