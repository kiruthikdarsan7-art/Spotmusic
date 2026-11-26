import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/auth_controller.dart';
import 'features/auth/forgot_password_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/auth/reset_password_screen.dart';
import 'features/auth/welcome_screen.dart';
import 'features/catalog/album_screen.dart';
import 'features/catalog/home_tab.dart';
import 'features/catalog/search_tab.dart';
import 'features/player/now_playing_screen.dart';
import 'features/profile/profile_tab.dart';
import 'features/shell/shell_screen.dart';

/// Lets go_router re-run its redirect whenever the auth state changes, without rebuilding the router.
class _AuthRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

const _publicPaths = {'/welcome', '/login', '/register', '/forgot-password', '/reset-password'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh();
  ref.listen(authControllerProvider, (_, __) => refresh.ping());
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.isLoading) return null; // splash shows at '/'
      final signedIn = auth.value != null;
      final path = state.uri.path;
      if (!signedIn) return _publicPaths.contains(path) ? null : '/welcome';
      if (_publicPaths.contains(path) && path != '/reset-password') return '/';
      return null;
    },
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (c, s, shell) => ref.watch(authControllerProvider).isLoading
            ? const Scaffold(body: Center(child: CircularProgressIndicator()))
            : ShellScreen(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (c, s) => const HomeTab())]),
          StatefulShellBranch(routes: [GoRoute(path: '/search', builder: (c, s) => const SearchTab())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (c, s) => const ProfileTab())]),
        ],
      ),
      GoRoute(path: '/album/:id', builder: (c, s) => AlbumScreen(id: s.pathParameters['id']!)),
      GoRoute(
        path: '/player',
        pageBuilder: (c, s) => CustomTransitionPage(
          key: s.pageKey,
          child: const NowPlayingScreen(),
          transitionsBuilder: (c, a, _, child) => SlideTransition(
            position: Tween(begin: const Offset(0, 1), end: Offset.zero)
                .animate(CurvedAnimation(parent: a, curve: Curves.easeOutCubic)),
            child: child,
          ),
        ),
      ),
      GoRoute(path: '/welcome', builder: (c, s) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/register', builder: (c, s) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (c, s) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (c, s) => ResetPasswordScreen(token: s.uri.queryParameters['token'] ?? ''),
      ),
    ],
  );
});
