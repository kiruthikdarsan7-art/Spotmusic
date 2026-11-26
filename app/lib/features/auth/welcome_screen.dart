import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme.dart';
import 'widgets.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Center(child: SpotMusicMark(size: 72)),
              const SizedBox(height: 20),
              Text('SpotMusic',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .displaySmall
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('Music without the ads.',
                  textAlign: TextAlign.center, style: TextStyle(color: kMuted, fontSize: 16)),
              const Spacer(),
              FilledButton(onPressed: () => context.push('/register'), child: const Text('Create account')),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: () => context.push('/login'), child: const Text('Log in')),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
