import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/token_store.dart';
import 'auth_repository.dart';

final tokenStoreProvider = Provider<TokenStore>((_) => TokenStore());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    ref.read(tokenStoreProvider),
    // Refresh was rejected by the server: drop to the signed-out state.
    onSignedOut: () => ref.read(authControllerProvider.notifier).forceSignedOut(),
  );
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider), ref.read(tokenStoreProvider)),
);

/// null = signed out, AppUser = signed in. Loading while the app checks stored tokens.
final authControllerProvider =
    AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

class AuthController extends AsyncNotifier<AppUser?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AppUser?> build() => _repo.restore();

  void forceSignedOut() => state = const AsyncData(null);

  /// Runs a sign-in call. Errors are returned as text for the form; the auth state only changes on success.
  Future<String?> _run(Future<AppUser?> Function() action) async {
    try {
      final user = await action();
      if (user != null) state = AsyncData(user);
      return null;
    } catch (e) {
      return friendlyError(e);
    }
  }

  Future<String?> login(String email, String password) =>
      _run(() => _repo.login(email.trim().toLowerCase(), password));

  Future<String?> register(String email, String password, String name) =>
      _run(() => _repo.register(email.trim().toLowerCase(), password, name.trim()));

  Future<String?> google() => _run(_repo.signInWithGoogle);

  Future<String?> apple() => _run(_repo.signInWithApple);

  Future<void> signOut() async {
    await _repo.signOut();
    state = const AsyncData(null);
  }

  Future<String?> deleteAccount(String? password) async {
    try {
      await _repo.deleteAccount(password);
      state = const AsyncData(null);
      return null;
    } catch (e) {
      return friendlyError(e);
    }
  }
}
