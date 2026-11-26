import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme.dart';
import '../catalog/widgets.dart';
import 'player_service.dart';

/// Floating bar above the bottom navigation. Hidden until something is playing.
class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final track = ref.watch(currentTrackProvider).value;
    if (track == null) return const SizedBox.shrink();
    final svc = ref.read(playerServiceProvider);
    final playing = ref.watch(playingProvider).value ?? false;

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      child: Material(
        color: kSurface2,
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/player'),
          child: Stack(children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(children: [
                Cover(seed: track.albumTitle, url: track.coverUrl, size: 44, radius: 6),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(track.artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: kMuted, fontSize: 12)),
                  ]),
                ),
                IconButton(
                  tooltip: playing ? 'Pause' : 'Play',
                  iconSize: 30,
                  onPressed: svc.togglePlay,
                  icon: Icon(playing ? Icons.pause_circle_filled : Icons.play_circle_fill),
                ),
                IconButton(
                  tooltip: 'Next',
                  onPressed: svc.player.hasNext ? svc.player.seekToNext : null,
                  icon: const Icon(Icons.skip_next),
                ),
              ]),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: StreamBuilder<Duration>(
                stream: svc.player.positionStream,
                builder: (_, snap) {
                  final total = track.durationMs;
                  final v = total == 0 ? 0.0 : ((snap.data?.inMilliseconds ?? 0) / total).clamp(0.0, 1.0);
                  return LinearProgressIndicator(value: v, minHeight: 2, backgroundColor: Colors.white12);
                },
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
