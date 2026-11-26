import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme.dart';

/// Placeholder artwork: a gradient chosen from the title, with the first letter.
/// Replaced by the real cover when coverUrl is set.
class Cover extends StatelessWidget {
  const Cover({super.key, required this.seed, this.url, this.size = 56, this.radius = 8});
  final String seed;
  final String? url;
  final double size;
  final double radius;

  static const _pairs = [
    [Color(0xFFFF8A4C), Color(0xFFC2255C)],
    [Color(0xFF3B5BDB), Color(0xFF15AABF)],
    [Color(0xFF7B2FF7), Color(0xFFF107A3)],
    [Color(0xFF0B7285), Color(0xFF12B886)],
    [Color(0xFFE8590C), Color(0xFFFAB005)],
    [Color(0xFF364FC7), Color(0xFF845EF7)],
  ];

  @override
  Widget build(BuildContext context) {
    final pair = _pairs[seed.hashCode.abs() % _pairs.length];
    final letter = seed.isEmpty ? '' : seed.characters.first.toUpperCase();
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: size,
        height: size,
        child: url != null
            ? Image.network(url!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _fallback(pair, letter))
            : _fallback(pair, letter),
      ),
    );
  }

  Widget _fallback(List<Color> pair, String letter) => DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: pair, begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Center(
          child: Text(letter,
              style: TextStyle(
                fontSize: size * 0.4,
                fontWeight: FontWeight.w700,
                color: Colors.white.withValues(alpha: 0.9),
              )),
        ),
      );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 10),
        child: Text(text, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
      );
}

class AsyncView<T> extends StatelessWidget {
  const AsyncView({super.key, required this.value, required this.onRetry, required this.builder});
  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T data) builder;

  @override
  Widget build(BuildContext context) => value.when(
        data: builder,
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Couldn\'t load this.', style: TextStyle(color: kMuted)),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
            ]),
          ),
        ),
      );
}
