import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/auth_controller.dart';
import 'models.dart';

class CatalogRepository {
  CatalogRepository(this._api);
  final ApiClient _api;

  Future<HomeData> home() async =>
      HomeData.fromJson((await _api.dio.get('/catalog/home')).data as Map<String, dynamic>);

  Future<AlbumDetail> album(String id) async =>
      AlbumDetail.fromJson((await _api.dio.get('/catalog/albums/$id')).data as Map<String, dynamic>);

  Future<SearchResults> search(String q) async => SearchResults.fromJson(
        (await _api.dio.get('/catalog/search', queryParameters: {'q': q})).data as Map<String, dynamic>,
      );

  /// Streaming-only token. Players put it in the audio URL because they cannot add headers mid-queue.
  Future<String> streamToken() async =>
      (await _api.dio.get('/catalog/stream-token')).data['token'] as String;

  String streamUrl(String trackId, String token) =>
      '$kApiBaseUrl/tracks/$trackId/stream?t=${Uri.encodeQueryComponent(token)}';
}

final catalogRepositoryProvider =
    Provider<CatalogRepository>((ref) => CatalogRepository(ref.read(apiClientProvider)));

final homeProvider = FutureProvider.autoDispose<HomeData>((ref) => ref.read(catalogRepositoryProvider).home());

final albumProvider = FutureProvider.autoDispose.family<AlbumDetail, String>(
  (ref, id) => ref.read(catalogRepositoryProvider).album(id),
);
