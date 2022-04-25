import DB from '../libs/DB.js';
import MangaService from '../services/MangaService.js';

const getLastUpdateMangas = async (request, response) => {
    const filter = await MangaService.buildFilters(request.query);
    const {mangas, meta} = await MangaService.getLastUpdateMangas(filter);

    response.json({
        status: 'successful',
        meta: meta,
        result: mangas
    })
}

const getPopularMangas = async (request, response) => {
    const mangas = await MangaService.getPopularMangas();

    response.json({
        status: 'successful',
        result: mangas
    })
}

const getTopViews = async (request, response) => {
    const result = await MangaService.getTopViews(request.query);

    response.json({
        status: 'successful',
        result: result
    })
}

export default {
    getLastUpdateMangas,
    getPopularMangas,
    getTopViews
}