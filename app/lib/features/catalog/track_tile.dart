import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme.dart';
import '../player/player_service.dart';
import 'models.dart';
import 'widgets.dart';

/// One song row. Tapping plays [queue] starting from this song.
class TrackTile extends ConsumerWidget {
  const TrackTile({super.key, required this.track, required this.queue, this.showCover = true});
  final Track track;
  final List<Track> queue;
  final bool showCover;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(currentTrackProvider).value;
    final isCurrent = current?.id == track.id;
    return ListTile(
      minTileHeight: 64,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      leading: showCover ? Cover(seed: track.albumTitle, url: track.coverUrl, size: 48) : null,
      title: Text(track.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: isCurrent ? Theme.of(context).colorScheme.primary : null,
          )),
      subtitle: Text(track.artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: kMuted)),
      trailing: Text(formatDuration(track.duration), style: const TextStyle(color: kMuted)),
      onTap: () => _play(context, ref),
    );
  }

  Future<void> _play(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(playerServiceProvider).playQueue(queue, queue.indexWhere((t) => t.id == track.id));
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Couldn\'t play this song.')));
      }
    }
  }
}
