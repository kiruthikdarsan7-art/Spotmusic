import 'package:audio_session/audio_session.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';

import '../catalog/catalog_repository.dart';
import '../catalog/models.dart';

/// Wraps just_audio. With just_audio_background (initialised in main) playback continues
/// when the app is minimised and the lock screen, notification and Bluetooth/headphone
/// buttons control it.
class PlayerService {
  PlayerService(this._repo) {
    _configureSession();
  }

  final CatalogRepository _repo;
  final AudioPlayer player = AudioPlayer();
  List<Track> _queue = [];

  List<Track> get queue => _queue;

  Future<void> _configureSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
  }

  /// Replaces the queue with [tracks] and starts at [index].
  Future<void> playQueue(List<Track> tracks, int index) async {
    if (tracks.isEmpty) return;
    _queue = List.of(tracks);
    final token = await _repo.streamToken();
    final sources = [
      for (final t in _queue)
        AudioSource.uri(
          Uri.parse(_repo.streamUrl(t.id, token)),
          tag: MediaItem(
            id: t.id,
            title: t.title,
            artist: t.artistName,
            album: t.albumTitle,
            duration: t.duration,
            artUri: t.coverUrl == null ? null : Uri.tryParse(t.coverUrl!),
          ),
        ),
    ];
    await player.setAudioSource(ConcatenatingAudioSource(children: sources), initialIndex: index);
    await player.play();
  }

  Track? get current {
    final i = player.currentIndex;
    return (i == null || i >= _queue.length) ? null : _queue[i];
  }

  Future<void> togglePlay() => player.playing ? player.pause() : player.play();

  Future<void> setShuffle(bool on) async {
    if (on) await player.shuffle();
    await player.setShuffleModeEnabled(on);
  }

  Future<void> toggleShuffle() => setShuffle(!player.shuffleModeEnabled);

  Future<void> cycleRepeat() {
    const order = [LoopMode.off, LoopMode.all, LoopMode.one];
    final next = order[(order.indexOf(player.loopMode) + 1) % order.length];
    return player.setLoopMode(next);
  }

  Future<void> setSpeed(double s) => player.setSpeed(s);

  void dispose() => player.dispose();
}

final playerServiceProvider = Provider<PlayerService>((ref) {
  final s = PlayerService(ref.read(catalogRepositoryProvider));
  ref.onDispose(s.dispose);
  return s;
});

/// The track now playing, or null. Rebuilds when the queue position changes.
final currentTrackProvider = StreamProvider<Track?>((ref) {
  final svc = ref.watch(playerServiceProvider);
  return svc.player.currentIndexStream.map((_) => svc.current);
});

final playingProvider = StreamProvider<bool>(
  (ref) => ref.watch(playerServiceProvider).player.playingStream,
);
