import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../core/api_client.dart';
import '../../core/token_store.dart';

class AppUser {
  AppUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.hasPassword,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String displayName;
  final bool hasPassword;
  final String? avatarUrl;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        email: j['email'] as String,
        displayName: j['displayName'] as String,
        hasPassword: j['hasPassword'] as bool? ?? true,
        avatarUrl: j['avatarUrl'] as String?,
      );
}

class DeviceSession {
  DeviceSession(this.id, this.name, this.current);
  final String id;
  final String name;
  final bool current;
}

/// Set with --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>. Empty hides nothing; the
/// backend answers 501 if Google sign-in is not configured there.
const _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStore _tokens;

  Future<String> _deviceName() async {
    try {
      final info = DeviceInfoPlugin();
      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          final a = await info.androidInfo;
          return '${a.brand} ${a.model}';
        case TargetPlatform.iOS:
          return (await info.iosInfo).name;
        default:
          return defaultTargetPlatform.name;
      }
    } catch (_) {
      return 'Unknown device';
    }
  }

  Future<AppUser> _finish(Map<String, dynamic> data) async {
    await _tokens.save(
      access: data['accessToken'] as String,
      refresh: data['refreshToken'] as String,
    );
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<AppUser?> restore() async {
    if (await _tokens.refreshToken == null) return null;
    try {
      final r = await _api.dio.get('/users/me');
      return AppUser.fromJson(r.data as Map<String, dynamic>);
    } catch (_) {
      // Rejected or unreachable: show sign-in. Tokens are only wiped when the server
      // rejects them (see ApiClient), so a launch while offline does not lose the session.
      return null;
    }
  }

  Future<AppUser> register(String email, String password, String name) async {
    final r = await _api.dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'displayName': name,
      'deviceName': await _deviceName(),
    });
    return _finish(r.data as Map<String, dynamic>);
  }

  Future<AppUser> login(String email, String password) async {
    final r = await _api.dio.post('/auth/login', data: {
      'email': email,
      'password': password,
      'deviceName': await _deviceName(),
    });
    return _finish(r.data as Map<String, dynamic>);
  }

  /// Returns null if the person closed the Google sheet.
  Future<AppUser?> signInWithGoogle() async {
    final google = GoogleSignIn(
      scopes: const ['email'],
      serverClientId: _googleServerClientId.isEmpty ? null : _googleServerClientId,
    );
    final account = await google.signIn();
    if (account == null) return null;
    final idToken = (await account.authentication).idToken;
    if (idToken == null) throw StateError('Google did not return an ID token');
    final r = await _api.dio.post('/auth/google', data: {
      'idToken': idToken,
      'deviceName': await _deviceName(),
    });
    return _finish(r.data as Map<String, dynamic>);
  }

  bool get appleAvailable =>
      defaultTargetPlatform == TargetPlatform.iOS ||
      defaultTargetPlatform == TargetPlatform.macOS;

  Future<AppUser?> signInWithApple() async {
    try {
      final c = await SignInWithApple.getAppleIDCredential(scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ]);
      final name = [c.givenName, c.familyName].whereType<String>().join(' ').trim();
      final r = await _api.dio.post('/auth/apple', data: {
        'identityToken': c.identityToken,
        if (name.isNotEmpty) 'displayName': name,
        'deviceName': await _deviceName(),
      });
      return _finish(r.data as Map<String, dynamic>);
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return null;
      rethrow;
    }
  }

  Future<void> forgotPassword(String email) =>
      _api.dio.post('/auth/forgot-password', data: {'email': email});

  Future<void> resetPassword(String token, String password) =>
      _api.dio.post('/auth/reset-password', data: {'token': token, 'password': password});

  Future<List<DeviceSession>> devices() async {
    final r = await _api.dio.get('/users/me/devices');
    return (r.data as List)
        .map((d) => DeviceSession(d['id'] as String, d['deviceName'] as String, d['current'] as bool))
        .toList();
  }

  Future<void> removeDevice(String id) => _api.dio.delete('/users/me/devices/$id');

  Future<void> signOut() async {
    final rt = await _tokens.refreshToken;
    try {
      if (rt != null) await _api.dio.post('/auth/logout', data: {'refreshToken': rt});
    } catch (_) {
      // Signing out locally must work even offline.
    }
    await _tokens.clear();
  }

  Future<void> deleteAccount(String? password) async {
    await _api.dio.delete('/users/me', data: {if (password != null) 'password': password});
    await _tokens.clear();
  }
}
