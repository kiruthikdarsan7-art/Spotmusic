class Track {
  Track({
    required this.id,
    required this.title,
    required this.artistId,
    required this.artistName,
    required this.albumId,
    required this.albumTitle,
    required this.durationMs,
    this.coverUrl,
    this.genre,
  });

  final String id;
  final String title;
  final String artistId;
  final String artistName;
  final String albumId;
  final String albumTitle;
  final int durationMs;
  final String? coverUrl;
  final String? genre;

  Duration get duration => Duration(milliseconds: durationMs);

  factory Track.fromJson(Map<String, dynamic> j) => Track(
        id: j['id'] as String,
        title: j['title'] as String,
        artistId: j['artistId'] as String,
        artistName: j['artistName'] as String,
        albumId: j['albumId'] as String,
        albumTitle: j['albumTitle'] as String,
        durationMs: (j['durationMs'] as num).toInt(),
        coverUrl: j['coverUrl'] as String?,
        genre: j['genre'] as String?,
      );
}

class Album {
  Album({
    required this.id,
    required this.title,
    required this.artistId,
    required this.artistName,
    this.coverUrl,
    this.releaseYear,
  });

  final String id;
  final String title;
  final String artistId;
  final String artistName;
  final String? coverUrl;
  final int? releaseYear;

  factory Album.fromJson(Map<String, dynamic> j) => Album(
        id: j['id'] as String,
        title: j['title'] as String,
        artistId: j['artistId'] as String,
        artistName: j['artistName'] as String,
        coverUrl: j['coverUrl'] as String?,
        releaseYear: (j['releaseYear'] as num?)?.toInt(),
      );
}

class Artist {
  Artist({required this.id, required this.name, this.imageUrl});
  final String id;
  final String name;
  final String? imageUrl;

  factory Artist.fromJson(Map<String, dynamic> j) =>
      Artist(id: j['id'] as String, name: j['name'] as String, imageUrl: j['imageUrl'] as String?);
}

List<T> _list<T>(dynamic v, T Function(Map<String, dynamic>) f) =>
    (v as List).map((e) => f(e as Map<String, dynamic>)).toList();

class HomeData {
  HomeData(this.newAlbums, this.tracks, this.artists);
  final List<Album> newAlbums;
  final List<Track> tracks;
  final List<Artist> artists;

  factory HomeData.fromJson(Map<String, dynamic> j) => HomeData(
        _list(j['newAlbums'], Album.fromJson),
        _list(j['tracks'], Track.fromJson),
        _list(j['artists'], Artist.fromJson),
      );
}

class AlbumDetail {
  AlbumDetail(this.album, this.tracks);
  final Album album;
  final List<Track> tracks;

  factory AlbumDetail.fromJson(Map<String, dynamic> j) => AlbumDetail(
        Album.fromJson(j['album'] as Map<String, dynamic>),
        _list(j['tracks'], Track.fromJson),
      );
}

class SearchResults {
  SearchResults(this.tracks, this.albums, this.artists);
  final List<Track> tracks;
  final List<Album> albums;
  final List<Artist> artists;
  bool get isEmpty => tracks.isEmpty && albums.isEmpty && artists.isEmpty;

  factory SearchResults.fromJson(Map<String, dynamic> j) => SearchResults(
        _list(j['tracks'], Track.fromJson),
        _list(j['albums'], Album.fromJson),
        _list(j['artists'], Artist.fromJson),
      );
}

String formatDuration(Duration d) {
  final m = d.inMinutes;
  final s = (d.inSeconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}
