import 'dart:async';

import 'package:dio/dio.dart';

import 'token_store.dart';

/// Set at build time: flutter run --dart-define=API_BASE_URL=https://api.example.com
/// 10.0.2.2 is the host machine as seen from the Android emulator.
const kApiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');

/// Dio client that attaches the access token and, on a 401, refreshes it once and retries.
/// Refreshes are serialised: the server rotates refresh tokens, so two parallel refreshes
/// would look like token theft and sign the device out.
class ApiClient {
  ApiClient(this._tokens, {required this.onSignedOut}) {
    dio = Dio(BaseOptions(
      baseUrl: kApiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
    ));
    _plain = Dio(dio.options.copyWith());
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) async {
        final t = await _tokens.accessToken;
        if (t != null) o.headers['Authorization'] = 'Bearer $t';
        h.next(o);
      },
      onError: (e, h) async {
        final req = e.requestOptions;
        final is401 = e.response?.statusCode == 401;
        if (!is401 || req.extra['retried'] == true || req.path.startsWith('/auth/')) {
          return h.next(e);
        }
        if (!await _refresh()) return h.next(e);
        req.extra['retried'] = true;
        try {
          return h.resolve(await dio.fetch(req));
        } on DioException catch (e2) {
          return h.next(e2);
        }
      },
    ));
  }

  final TokenStore _tokens;
  final void Function() onSignedOut;
  late final Dio dio;
  late final Dio _plain;
  Completer<bool>? _refreshing;

  Future<bool> _refresh() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight.future;
    final c = _refreshing = Completer<bool>();
    () async {
      try {
        final rt = await _tokens.refreshToken;
        if (rt == null) throw StateError('no refresh token');
        final r = await _plain.post('/auth/refresh', data: {'refreshToken': rt});
        await _tokens.save(
          access: r.data['accessToken'] as String,
          refresh: r.data['refreshToken'] as String,
        );
        c.complete(true);
      } on DioException catch (e) {
        // Only a definite rejection ends the session; a network blip keeps the user signed in.
        final code = e.response?.statusCode;
        if (code == 401 || code == 403) {
          await _tokens.clear();
          onSignedOut();
        }
        c.complete(false);
      } catch (_) {
        await _tokens.clear();
        onSignedOut();
        c.complete(false);
      } finally {
        _refreshing = null;
      }
    }();
    return c.future;
  }
}

/// Turns a failed request into a sentence a person can read.
String friendlyError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      final m = data['message'];
      return m is List ? m.join('\n') : m.toString();
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return 'Can\'t reach SpotMusic. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
