# TWA 네이티브 보강 (선택)

Bubblewrap `npm run twa:init` 후 Android 프로젝트가 생기면, Intent URL만으로 설정 이동이 안 되는 기기를 위해 아래를 적용할 수 있습니다.

## 1. 웹만으로 되는 경우 (기본)

`src/lib/site-twa-client.ts` 가 Android Intent URL을 사용합니다.

- 알림: `APP_NOTIFICATION_SETTINGS`
- 위치: `APPLICATION_DETAILS_SETTINGS` (앱 정보 → 권한)

대부분의 **Play Store TWA** 에서 추가 네이티브 코드 없이 동작합니다.

## 2. LauncherActivity 교체 (Intent 실패 시)

`twa/android/app/src/main/java/.../LauncherActivity.java` 를 커스텀 클래스로 바꿉니다.

```java
package YOUR.PACKAGE;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class CustomLauncherActivity extends LauncherActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }

  public static void openNotificationSettings(String packageName) {
    Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
    intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getApplicationContext().startActivity(intent);
  }

  public static void openAppDetails(String packageName) {
    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    intent.setData(Uri.parse("package:" + packageName));
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getApplicationContext().startActivity(intent);
  }
}
```

`AndroidManifest.xml` 의 `LauncherActivity` 항목을 `CustomLauncherActivity` 로 변경합니다.

웹 ↔ 네이티브 브릿지가 필요하면 Digital Asset Links + Custom Tabs PostMessage 또는
커스텀 URL 스킴(`yourapp://open-settings/notifications`)을 추가로 등록하세요.

## 3. Play Console 패키지명

웹의 `/api/twa-config` 와 Intent URL은 **Play Console에 등록한 package name** 과 같아야 합니다.

```env
TWA_ANDROID_PACKAGE_NAME=kr.chu.hallapass
```

## 4. iOS

TWA는 Android 전용입니다. iOS 홈 화면 PWA는 설정 앱 딥링크를 지원하지 않습니다.
