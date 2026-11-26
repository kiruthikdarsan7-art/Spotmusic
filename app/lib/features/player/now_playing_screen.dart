import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:just_audio/just_audio.dart';

import '../../theme.dart';
import '../catalog/models.dart';
import '../catalog/widgets.dart';
import 'player_service.dart';

class NowPlayingScreen extends ConsumerWidget {
  const NowPlayingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final track = ref.watch(currentTrackProvider).value;
    final svc = ref.read(playerServiceProvider);
    final playing = ref.watch(playingProvider).value ?? false;
    final accent = Theme.of(context).colorScheme.primary;

    if (track == null) {
      return Scaffold(
        appBar: AppBar(leading: IconButton(icon: const Icon(Icons.keyboard_arrow_down), onPressed: () => context.pop())),
        body: const Center(child: Text('Nothing is playing', style: TextStyle(color: kMuted))),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          tooltip: 'Minimise player',
          icon: const Icon(Icons.keyboard_arrow_down, size: 30),
          onPressed: () => context.pop(),
        ),
        title: Column(children: [
          const Text('PLAYING FROM', style: TextStyle(fontSize: 11, letterSpacing: 0.8, color: kMuted)),
          Text(track.albumTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
        centerTitle: true,
        actions: [
          PopupMenuButton<double>(
            tooltip: 'Playback speed',
            icon: const Icon(Icons.speed),
            onSelected: svc.setSpeed,
            itemBuilder: (_) => [
              for (final s in const [0.75, 1.0, 1.25, 1.5, 2.0]) PopupMenuItem(value: s, child: Text('${s}x')),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          child: Column(children: [
            Expanded(
              child: Center(
                child: LayoutBuilder(builder: (_, c) {
                  final side = c.biggest.shortestSide.clamp(160.0, 340.0);
                  return Cover(seed: track.albumTitle, url: track.coverUrl, size: side, radius: 16);
                }),
              ),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(track.title,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(track.artistName, style: const TextStyle(color: kMuted, fontSize: 16)),
            ),
            const SizedBox(height: 8),
            _SeekBar(player: svc.player, fallback: track.duration),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              StreamBuilder<bool>(
                stream: svc.player.shuffleModeEnabledStream,
                builder: (_, s) => IconButton(
                  tooltip: 'Shuffle',
                  color: (s.data ?? false) ? accent : kMuted,
                  onPressed: svc.toggleShuffle,
                  icon: const Icon(Icons.shuffle),
                ),
              ),
              IconButton(
                tooltip: 'Previous',
                iconSize: 36,
                onPressed: svc.player.hasPrevious || svc.player.position > const Duration(seconds: 3)
                    ? () => svc.player.position > const Duration(seconds: 3)
                        ? svc.player.seek(Duration.zero)
                        : svc.player.seekToPrevious()
                    : () => svc.player.seek(Duration.zero),
                icon: const Icon(Icons.skip_previous),
              ),
              IconButton.filled(
                tooltip: playing ? 'Pause' : 'Play',
                iconSize: 40,
                style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, fixedSize: const Size(72, 72)),
                onPressed: svc.togglePlay,
                icon: Icon(playing ? Icons.pause : Icons.play_arrow),
              ),
              IconButton(
                tooltip: 'Next',
                iconSize: 36,
                onPressed: svc.player.hasNext ? svc.player.seekToNext : null,
                icon: const Icon(Icons.skip_next),
              ),
              StreamBuilder<LoopMode>(
                stream: svc.player.loopModeStream,
                builder: (_, s) {
                  final mode = s.data ?? LoopMode.off;
                  return IconButton(
                    tooltip: 'Repeat',
                    color: mode == LoopMode.off ? kMuted : accent,
                    onPressed: svc.cycleRepeat,
                    icon: Icon(mode == LoopMode.one ? Icons.repeat_one : Icons.repeat),
                  );
                },
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _SeekBar extends StatefulWidget {
  const _SeekBar({required this.player, required this.fallback});
  final AudioPlayer player;
  final Duration fallback;

  @override
  State<_SeekBar> createState() => _SeekBarState();
}

class _SeekBarState extends State<_SeekBar> {
  double? _drag; // milliseconds while the thumb is being dragged

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Duration>(
      stream: widget.player.positionStream,
      builder: (_, pos) => StreamBuilder<Duration?>(
        stream: widget.player.durationStream,
        builder: (_, dur) {
          final total = (dur.data ?? widget.fallback).inMilliseconds.toDouble();
          final position = (_drag ?? (pos.data?.inMilliseconds.toDouble() ?? 0)).clamp(0.0, total <= 0 ? 1.0 : total);
          return Column(children: [
            Slider(
              value: position,
              max: total <= 0 ? 1 : total,
              onChanged: (v) => setState(() => _drag = v),
              onChangeEnd: (v) async {
                await widget.player.seek(Duration(milliseconds: v.round()));
                if (mounted) setState(() => _drag = null);
              },
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(formatDuration(Duration(milliseconds: position.round())), style: const TextStyle(color: kMuted, fontSize: 12)),
                Text(formatDuration(Duration(milliseconds: total.round())), style: const TextStyle(color: kMuted, fontSize: 12)),
              ]),
            ),
          ]);
        },
      ),
    );
  }
}
