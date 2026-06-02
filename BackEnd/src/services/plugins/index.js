import PluginRegistry from './registry.js';
import spotifyPlugin from './spotify.plugin.js';
import deezerPlugin from './deezer.plugin.js';
import youtubePlugin from './youtube.plugin.js';
import youtubeMusicPlugin from './youtube_music.plugin.js';
import musicbrainzPlugin from './musicbrainz.plugin.js';
import fmaPlugin from './fma.plugin.js';

const registry = new PluginRegistry();
registry.register(spotifyPlugin);
registry.register(deezerPlugin);
registry.register(youtubePlugin);
registry.register(youtubeMusicPlugin);
registry.register(musicbrainzPlugin);
registry.register(fmaPlugin);

export default registry;
export { PluginRegistry };
