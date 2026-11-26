import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme.dart';
import '../auth/auth_controller.dart';
import 'catalog_repository.dart';
import 'models.dart';
import 'track_tile.dart';
import 'widgets.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(authControllerProvider).value?.displayName ?? '';
    final home = ref.watch(homeProvider);
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => ref.refresh(homeProvider.future),
        child: AsyncView<HomeData>(
          value: home,
          onRetry: () => ref.invalidate(homeProvider),
          builder: (d) => ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Text('Hi, $name',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
              ),
              if (d.tracks.isEmpty && d.newAlbums.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('The catalog is empty. Run the seed script or add music in the admin dashboard.',
                      style: TextStyle(color: kMuted)),
                ),
              if (d.newAlbums.isNotEmpty) ...[
                const SectionTitle('New releases'),
                SizedBox(
                  height: 196,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: d.newAlbums.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, i) => _AlbumCard(album: d.newAlbums[i]),
                  ),
                ),
              ],
              if (d.tracks.isNotEmpty) ...[
                const SectionTitle('Recently added songs'),
                for (final t in d.tracks.take(10)) TrackTile(track: t, queue: d.tracks),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _AlbumCard extends StatelessWidget {
  const _AlbumCard({required this.album});
  final Album album;

  @override
  Widget build(BuildContext context) => InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => context.push('/album/${album.id}'),
        child: SizedBox(
          width: 140,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Cover(seed: album.title, url: album.coverUrl, size: 140, radius: 10),
            const SizedBox(height: 8),
            Text(album.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
            Text(album.artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: kMuted, fontSize: 12)),
          ]),
        ),
      );
}
