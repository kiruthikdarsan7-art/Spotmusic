import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme.dart';
import 'auth_controller.dart';

class SpotMusicMark extends StatelessWidget {
  const SpotMusicMark({super.key, this.size = 36});
  final double size;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(painter: _MarkPainter()),
      );
}

class _MarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size s) {
    final c = Offset(s.width / 2, s.height / 2);
    final stroke = Paint()
      ..color = kAccent
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = s.width * 0.08;
    canvas.drawCircle(c, s.width * 0.1, Paint()..color = kAccent);
    for (final r in [0.29, 0.48]) {
      final rect = Rect.fromCircle(center: c, radius: s.width * r);
      canvas.drawArc(rect, 2.4, 1.34, false, stroke);
      canvas.drawArc(rect, -0.74, 1.34, false, stroke);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// Shared page frame for every auth screen.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, this.subtitle, required this.children, this.showBack = true});
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showBack ? AppBar(backgroundColor: Colors.transparent, elevation: 0) : null,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title,
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              if (subtitle != null) ...[
                const SizedBox(height: 8),
                Text(subtitle!, style: const TextStyle(color: kMuted, height: 1.4)),
              ],
              const SizedBox(height: 24),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.message, {super.key});
  final String? message;

  @override
  Widget build(BuildContext context) {
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Semantics(
        liveRegion: true,
        child: Text(message!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
      ),
    );
  }
}

String? validateEmail(String? v) {
  final s = v?.trim() ?? '';
  return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s) ? null : 'Enter a valid email address';
}

String? validateNewPassword(String? v) =>
    (v ?? '').length >= 10 ? null : 'Use at least 10 characters';

/// "Continue with Google" / "Continue with Apple". Apple is only shown where it works.
class SocialButtons extends ConsumerStatefulWidget {
  const SocialButtons({super.key, required this.onError});
  final void Function(String?) onError;

  @override
  ConsumerState<SocialButtons> createState() => _SocialButtonsState();
}

class _SocialButtonsState extends ConsumerState<SocialButtons> {
  bool _busy = false;

  Future<void> _go(Future<String?> Function() action) async {
    setState(() => _busy = true);
    widget.onError(null);
    final err = await action();
    if (mounted) setState(() => _busy = false);
    widget.onError(err);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.read(authControllerProvider.notifier);
    final apple = ref.read(authRepositoryProvider).appleAvailable;
    return Column(children: [
      OutlinedButton(
        onPressed: _busy ? null : () => _go(auth.google),
        child: const Text('Continue with Google'),
      ),
      if (apple) ...[
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _busy ? null : () => _go(auth.apple),
          child: const Text('Continue with Apple'),
        ),
      ],
    ]);
  }
}
