// Config plugin: 시스템 글자크기(fontScale)와 화면 확대/축소(densityDpi)에 앱 UI가
// 영향받지 않도록 네이티브 레벨에서 기기 기본값으로 고정한다.
//
// 왜 둘 다 + 두 파일?
//  - 삼성 등 One UI엔 "글자 크기"(fontScale) 외에 "화면 확대/축소"(densityDpi)가 따로 있어
//    densityDpi가 커지면 글자뿐 아니라 아이콘·여백·레이아웃이 통째로 커진다. fontScale만으론 못 막음.
//  - React Native(특히 newArch)는 화면 밀도를 Activity가 아니라 Application 컨텍스트에서 읽는
//    경로가 있어 MainActivity만 고치면 안 먹는 경우가 있다. 그래서 MainApplication도 같이 고정.
//  - DENSITY_DEVICE_STABLE = 사용자의 화면확대 설정을 무시한 기기 출고 기본 밀도(API 24+).
const { withMainActivity, withMainApplication } = require('@expo/config-plugins');

function ensureImports(src, imports) {
  let out = src;
  for (const imp of imports) {
    if (!out.includes(imp)) {
      // 첫 import 줄 앞에 끼워넣기(패키지 선언 다음).
      out = out.replace(/(^import [^\n]+\n)/m, `${imp}\n$1`);
    }
  }
  return out;
}

const ACTIVITY_METHODS = `  // 시스템 글자크기(fontScale)·화면확대(densityDpi)를 기기 기본값으로 고정 — UI가 시스템 설정에 흔들리지 않게.
  override fun attachBaseContext(newBase: Context) {
    val configuration = Configuration(newBase.resources.configuration)
    configuration.fontScale = 1.0f
    configuration.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
    super.attachBaseContext(newBase.createConfigurationContext(configuration))
  }

  override fun getResources(): Resources {
    val resources = super.getResources()
    val config = resources.configuration
    if (config.fontScale != 1.0f || config.densityDpi != DisplayMetrics.DENSITY_DEVICE_STABLE) {
      config.fontScale = 1.0f
      config.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
      val metrics = resources.displayMetrics
      metrics.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
      metrics.density = DisplayMetrics.DENSITY_DEVICE_STABLE / 160f
      @Suppress("DEPRECATION")
      metrics.scaledDensity = metrics.density
      @Suppress("DEPRECATION")
      resources.updateConfiguration(config, metrics)
    }
    return resources
  }`;

const APPLICATION_METHOD = `  // RN이 Application 컨텍스트에서 밀도를 읽는 경로까지 막기 위해 여기서도 고정.
  override fun attachBaseContext(base: Context) {
    val configuration = Configuration(base.resources.configuration)
    configuration.fontScale = 1.0f
    configuration.densityDpi = DisplayMetrics.DENSITY_DEVICE_STABLE
    super.attachBaseContext(base.createConfigurationContext(configuration))
  }`;

function withActivity(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') return cfg;
    let src = cfg.modResults.contents;
    src = ensureImports(src, [
      'import android.content.Context',
      'import android.content.res.Configuration',
      'import android.content.res.Resources',
      'import android.util.DisplayMetrics',
    ]);
    if (!src.includes('override fun attachBaseContext')) {
      // onCreate 앞에 메서드 삽입.
      src = src.replace(
        /(\n\s*override fun onCreate\()/,
        `\n${ACTIVITY_METHODS}\n$1`,
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withApplication(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') return cfg;
    let src = cfg.modResults.contents;
    src = ensureImports(src, [
      'import android.content.Context',
      'import android.util.DisplayMetrics',
    ]);
    if (!src.includes('override fun attachBaseContext')) {
      // onCreate 앞에 메서드 삽입.
      src = src.replace(
        /(\n\s*override fun onCreate\(\))/,
        `\n${APPLICATION_METHOD}\n$1`,
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withFontScaleLock(config) {
  return withApplication(withActivity(config));
};
