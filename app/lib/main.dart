import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'router.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Enables background playback plus lock-screen / notification / Bluetooth controls.
  await JustAudioBackground.init(
    androidNotificationChannelId: 'app.spotmusic.audio',
    androidNotificationChannelName: 'SpotMusic playback',
    androidNotificationOngoing: true,
  );
  runApp(const ProviderScope(child: SpotMusicApp()));
}

class SpotMusicApp extends ConsumerWidget {
  const SpotMusicApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'SpotMusic',
      debugShowCheckedModeBanner: false,
      theme: buildDarkTheme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
