"""Run from app/ after `flutter create`. Applies the Android settings the player needs.

Adds: audio/background permissions, the audio service + media button receiver,
AudioServiceActivity as the main activity, cleartext HTTP (development only), minSdk 23.
Fails loudly if an expected piece is not found, rather than producing a half-patched app.
"""
import glob
import re
import sys

MANIFEST = "android/app/src/main/AndroidManifest.xml"

PERMISSIONS = """    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>
"""

SERVICES = """        <service android:name="com.ryanheise.audioservice.AudioService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="true">
            <intent-filter>
                <action android:name="android.media.browse.MediaBrowserService"/>
            </intent-filter>
        </service>
        <receiver android:name="com.ryanheise.audioservice.MediaButtonReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MEDIA_BUTTON"/>
            </intent-filter>
        </receiver>
"""


def fail(msg):
    sys.exit(f"patch_android: {msg}")


def patch_manifest():
    s = open(MANIFEST, encoding="utf-8").read()
    if "com.ryanheise.audioservice.AudioService" in s:
        return  # already patched
    if "<application" not in s or "</application>" not in s:
        fail("unexpected AndroidManifest.xml layout")
    # Name shown under the app icon on the phone.
    s = re.sub(r'android:label="[^"]*"', 'android:label="SpotMusic"', s, count=1)
    s = s.replace("<application", PERMISSIONS + "    <application", 1)
    # Development builds talk to a plain-HTTP backend. Remove this for a release that uses HTTPS only.
    s = s.replace("<application", '<application android:usesCleartextTraffic="true"', 1)
    s = s.replace("</application>", SERVICES + "    </application>", 1)
    open(MANIFEST, "w", encoding="utf-8").write(s)


def patch_activity():
    files = glob.glob("android/app/src/main/**/MainActivity.kt", recursive=True)
    if len(files) != 1:
        fail(f"expected one MainActivity.kt, found {len(files)}")
    s = open(files[0], encoding="utf-8").read()
    if "AudioServiceActivity" in s:
        return
    s = s.replace("import io.flutter.embedding.android.FlutterActivity",
                  "import com.ryanheise.audioservice.AudioServiceActivity")
    s = s.replace(": FlutterActivity()", ": AudioServiceActivity()")
    if "AudioServiceActivity()" not in s:
        fail("could not switch MainActivity to AudioServiceActivity")
    open(files[0], "w", encoding="utf-8").write(s)


def patch_min_sdk():
    files = glob.glob("android/app/build.gradle*")
    if not files:
        fail("android/app/build.gradle(.kts) not found")
    path = files[0]
    s = open(path, encoding="utf-8").read()
    new, n = re.subn(r"minSdk(Version)?(\s*=\s*|\s+)flutter\.minSdkVersion",
                     lambda m: f"minSdk{m.group(1) or ''}{m.group(2)}23", s)
    if n == 0 and not re.search(r"minSdk(Version)?\s*=?\s*(2[3-9]|[3-9]\d)", s):
        fail("could not set minSdk 23")
    open(path, "w", encoding="utf-8").write(new)


if __name__ == "__main__":
    patch_manifest()
    patch_activity()
    patch_min_sdk()
    print("Android project patched.")
