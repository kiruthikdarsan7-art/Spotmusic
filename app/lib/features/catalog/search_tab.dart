import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../theme.dart';
import 'catalog_repository.dart';
import 'models.dart';
import 'track_tile.dart';
import 'widgets.dart';

class SearchTab extends ConsumerStatefulWidget {
  const SearchTab({super.key});

  @override
  ConsumerState<SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends ConsumerState<SearchTab> {
  final _controller = TextEditingController();
  Timer? _debounce;
  int _seq = 0; // drops answers that arrive after a newer query
  SearchResults? _results;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String text) {
    _debounce?.cancel();
    final q = text.trim();
    if (q.isEmpty) {
      setState(() {
        _results = null;
        _error = null;
        _loading = false;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _run(q));
  }

  Future<void> _run(String q) async {
    final mine = ++_seq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ref.read(catalogRepositoryProvider).search(q);
      if (mine == _seq && mounted) setState(() => _results = r);
    } catch (e) {
      if (mine == _seq && mounted) setState(() => _error = friendlyError(e));
    } finally {
      if (mine == _seq && mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _results;
    return SafeArea(
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _controller,
            onChanged: _onChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Songs, artists, albums',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _controller.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear',
                      icon: const Icon(Icons.close),
                      onPressed: () {
                        _controller.clear();
                        _onChanged('');
                      },
                    ),
            ),
          ),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kMuted)))
              : r == null
                  ? const Center(child: Text('Search the catalog', style: TextStyle(color: kMuted)))
                  : r.isEmpty
                      ? Center(child: Text('No results for “${_controller.text.trim()}”', style: const TextStyle(color: kMuted)))
                      : ListView(children: [
                          if (r.artists.isNotEmpty) ...[
                            const SectionTitle('Artists'),
                            for (final a in r.artists)
                              ListTile(
                                leading: Cover(seed: a.name, url: a.imageUrl, size: 48, radius: 24),
                                title: Text(a.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: const Text('Artist', style: TextStyle(color: kMuted)),
                              ),
                          ],
                          if (r.albums.isNotEmpty) ...[
                            const SectionTitle('Albums'),
                            for (final al in r.albums)
                              ListTile(
                                leading: Cover(seed: al.title, url: al.coverUrl, size: 48),
                                title: Text(al.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text('Album · ${al.artistName}', style: const TextStyle(color: kMuted)),
                                onTap: () => context.push('/album/${al.id}'),
                              ),
                          ],
                          if (r.tracks.isNotEmpty) ...[
                            const SectionTitle('Songs'),
                            for (final t in r.tracks) TrackTile(track: t, queue: r.tracks),
                          ],
                          const SizedBox(height: 24),
                        ]),
        ),
      ]),
    );
  }
}
