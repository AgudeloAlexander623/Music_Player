import {searchSpotify} from '../services/spotify.service.js';
import {searchMusicBrainz} from '../services/musicbrainz.service.js';
import {mergeResults} from '../utils/mergeResults.js';

export const searchController = async (req, res) => {
    try{
        const query = req.query.q;

        if(!query){
            return res.status(400).json({error: "Query required"});
        }

        const spotyfyResults = await searchSpotify(query);
        const musicBrainzResults = await searchMusicBrainz(query);
        const merged = mergeResults(spotyfyResults, musicBrainzResults);
        
        res.json(merged);
    }catch(error){
        console.error(error);
        res.status(500).json({error:"Error en busqueda"});
    }
};