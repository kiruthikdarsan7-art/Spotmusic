import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme.dart';
import '../player/player_service.dart';
import 'catalog_repository.dart';
import 'models.dart';
import 'track_tile.dart';
import 'widgets.dart';

class AlbumScreen extends ConsumerWidget {
  const AlbumScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(albumProvider(id));
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.transparent),
      body: AsyncView<AlbumDetail>(
        value: value,
        onRetry: () => ref.invalidate(albumProvider(id)),
        builder: (d) => ListView(
          padding: const EdgeInsets.only(bottom: 100),
          children: [
            Center(child: Cover(seed: d.album.title, url: d.album.coverUrl, size: 220, radius: 12)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
              child: Text(d.album.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                [d.album.artistName, if (d.album.releaseYear != null) '${d.album.releaseYear}'].join(' · '),
                style: const TextStyle(color: kMuted),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: d.tracks.isEmpty ? null : () => ref.read(playerServiceProvider).playQueue(d.tracks, 0),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Play'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: d.tracks.isEmpty
                        ? null
                        : () async {
                            final svc = ref.read(playerServiceProvider);
                            await svc.playQueue(d.tracks, 0);
                            await svc.setShuffle(true);
                          },
                    icon: const Icon(Icons.shuffle),
                    label: const Text('Shuffle'),
                  ),
                ),
              ]),
            ),
            for (final t in d.tracks) TrackTile(track: t, queue: d.tracks, showCover: false),
          ],
        ),
      ),
    );
  }
}
