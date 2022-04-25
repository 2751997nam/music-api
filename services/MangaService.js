import DB from '../libs/DB.js';
import Redis from '../libs/redis.js';

const buildFilters = async (params) => {
    let result = {};
    for (let key in params) {
        if(params[key]) {
            if (key == 'sort_by' && params.sort_type) {
                if (params[key] == 'created_at' || params[key] == 'sorder') {
                    result.orderBy = {
                        field: params[key],
                        sort: params.sort_type
                    }
                } else {
                    result.mangaOrderBy = {
                        field: params[key],
                        sort: params.sort_type
                    }
                }
            }
            else if (key == 'genre') {
                let ids = params[key].split(',');
                result.categoryIds = ids;
            } else if (key == 'ungenre' && params[key]) {
                let ids = params[key].split(',');
                result.notCategoryIds = ids;
            }
            else if (key != 'slug' && key != 'sort_type') {
                result[key] = params[key];
            } else {
                let value = params[key];
                if (value.indexOf('genre-') == 0) {
                    let slug = value.replace('genre-', '');
                    if (slug) {
                        let item = await DB.from('category').where('slug', slug).select('id').first();
                        if (item) {
                            result.categoryIds = [item.id];
                            result.genreId = item.id;
                        }
                    }
                } if (value.indexOf('author') == 0) {
                    let slug = value.replace('author-', '');
                    let item = await DB.from('author').where('slug', slug).select('id').first();
                    if (item) {
                        result.authorId = item.id;
                    }
                } if (value.indexOf('trans-group') == 0) {
                    let slug = value.replace('trans-group-', '');
                    let item = await DB.from('translator').where('slug', slug).select('id').first();
                    if (item) {
                        result.translatorId = item.id;
                    }
                } else if (value == 'completed' || value == 'active') {
                    result['status'] = value;
                }
            }
        }
    }
    return result;
}

const getPopularMangas = async function (filter = {}) {
    const mangas = await DB.from('manga')
        .select(['id'])
        .orderBy('view', 'desc')
        .limit(20);
    let mangaIds = mangas.map(item => item.id);

    let result = await getLastUpdateMangas({ mangaIds: mangaIds, getOnlyResult: true, page_size: 10 });

    return result;
}

const getBaseMeta = (pageId = 0, pageSize = 20) => {
    return {
        total: 0,
        pageCount: 0,
        hasNext: false,
        pageSize: pageSize,
        pageId: pageId
    }
}

const getLastUpdateMangas = async (filter = {}) => {
    const query = DB.from('chapter');
    if ((filter.categoryIds && filter.categoryIds.length) || (filter.notCategoryIds && filter.notCategoryIds.length)) {
        query.join('manga_n_category', 'manga_n_category.manga_id', 'chapter.manga_id');
        if (filter.categoryIds && filter.categoryIds.length) {
            query.whereIn('category_id',filter.categoryIds);
        }
        if (filter.notCategoryIds && filter.notCategoryIds.length) {
            query.whereNotIn('category_id', filter.notCategoryIds);
        }
    }
    if (filter.authorId) {
        query.join('manga_n_author', 'manga_n_author.manga_id', 'chapter.manga_id')
            .where('author_id', '=', filter.authorId);
    }
    if (filter.translatorId) {
        query.join('manga_n_translator', 'manga_n_translator.manga_id', 'chapter.manga_id')
            .where('translator_id', '=', filter.translatorId);
    }
    if (filter.mangaIds) {
        query.whereIn('chapter.manga_id', filter.mangaIds);
    }
    if (filter.status || filter.mangaOrderBy || filter.q) {
        query.join('manga', 'manga.id', 'chapter.manga_id');
    }
    if (filter.status) {
        query.where('manga.status', '=', filter.status);
    }


    let selectField = 'distinct chapter.manga_id, max(`chapter`.`created_at`) as created_at, max(`sorder`) as sorder';
    if (filter.q) {
        filter.q = filter.q.trim();
        filter.q = filter.q.replace('?', '').replace('-', ' ').replace(/\'/g, "").replace(/\\/g, "");
        query.where(function (q) {
            q.where( 'manga.alt_name', 'like', '%' + filter.q + '%');
            q.orWhere( 'manga.alt_name', 'like', '%' + filter.q + '%');
            q.orWhereRaw(`MATCH(manga.name, manga.alt_name) AGAINST ('${filter.q}')`);
        })

        selectField += `, MATCH(manga.name, manga.alt_name) AGAINST ('${filter.q}') as lien_quan`;
    }

    let pageId = filter.page_id >= 0 ? filter.page_id : 0;
    pageId = pageId < 0 ? 0 : pageId;
    const pageSize = filter.page_size ? filter.page_size : 10;
    let meta = getBaseMeta();
    

    if (typeof filter.getOnlyResult == 'undefined' || !filter.getOnlyResult) {
        const totalQuery = query.clone();
        let total = await totalQuery.select(DB.raw('count(distinct chapter.manga_id) as count')).first();
        if (total) {
            total = total.count;
        } else {
            total = 0;
        }
        const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0;
        meta = {
            total: total,
            pageCount: pageCount,
            hasNext: pageId < pageCount,
            pageSize: pageSize,
            pageId: pageId
        }
    }
    
    query.select(DB.raw(selectField))
        .where('chapter.status', '=', 'ACTIVE')
        .groupBy('chapter.manga_id');

    if (filter.orderBy) {
        query.orderBy(filter.orderBy.field, filter.orderBy.sort);
    } else if (filter.mangaOrderBy) {
        query.orderBy('manga.' + filter.mangaOrderBy.field, filter.mangaOrderBy.sort);
    } else if (filter.q) {
        query.orderBy('lien_quan', 'desc');
    } else {
        query.orderBy('created_at', 'desc');
    }
    const lastUpdateMangas = await query.limit(pageSize).offset(pageId * pageSize);

    let chapters = [];
    for (let item of lastUpdateMangas) {
        let chapter = await DB.from('chapter')
            .join('manga', 'manga.id', 'chapter.manga_id')
            .where('manga_id', item.manga_id)
            .where('chapter.created_at', item.created_at)
            .where('chapter.status', 'ACTIVE')
            .orderBy('chapter.created_at', 'desc')
            .orderBy('sorder', 'desc')
            .select(['chapter.id as chapter_id', 'chapter.name', 'chapter.slug', 'chapter.manga_id', 'chapter.created_at', 'manga.name as manga_name', 'manga.slug as manga_slug', 'manga.image as manga_image'])
            .first();
        if (chapter) {
            chapters.push(chapter);
        }
    }

    let result = [];
    for (let item of chapters) {
        let manga = {
            id: item.manga_id,
            name: item.manga_name,
            slug: item.manga_slug,
            image: item.manga_image,
            chapter: {
                id: item.chapter_id,
                manga_id: item.manga_id,
                name: item.name,
                slug: item.slug,
                created_at: item.created_at
            }
        }

        result.push(manga);
    }

    if (filter.getOnlyResult) {
        return result;
    }

    return {
        meta: meta,
        mangas: result
    };
}

const getTopViews = async (filter = {}) => {
    if (filter.clear_cache) {
        Redis.delete([
            'topViews',
            'topViewsMonth',
            'topViewsAll',
        ])

    }
    let topViews = await Redis.getJson('topViews', []);
    if (!topViews || !topViews.length) {
        topViews = await getLastUpdateMangas({mangaOrderBy: {field: 'view_day', sort: 'desc'}, page_size: 5, getOnlyResult: true});
        Redis.setJson('topViews', topViews, 'EX', 3 * 3600);
    }
    let topViewsMonth = await Redis.getJson('topViewsMonth', []);
    if (!topViewsMonth || !topViewsMonth.length) {
        topViewsMonth = await getLastUpdateMangas({mangaOrderBy: {field: 'view_month', sort: 'desc'}, page_size: 5, getOnlyResult: true});
        Redis.setJson('topViewsMonth', topViewsMonth, 'EX', 86400);
    }
    let topViewsAll = await Redis.getJson('topViewsAll', []);
    if (!topViewsAll || !topViewsAll.length) {
        topViewsAll = await getLastUpdateMangas({mangaOrderBy: {field: 'view', sort: 'desc'}, page_size: 5, getOnlyResult: true});
        Redis.setJson('topViewsAll', topViewsAll, 'EX', 7 * 86400);
    }

    return {
        topViews: topViews,
        topViewsMonth: topViewsMonth,
        topViewsAll: topViewsAll,
    }
}

const getMangaByChapters = async (filter = {}) => {
    const query = DB.from('chapter').whereIn('chapter.id', filter.chapterIds);
    query.join('manga', 'manga.id', 'chapter.manga_id')
    
    const totalQuery = query.clone();
    let total = await totalQuery.select(DB.raw('count(*) as count')).first();
    
    if (total) {
        total = total.count;
    } else {
        total = 0;
    }
    
    query.select(['chapter.id as chapter_id', 'chapter.name', 'chapter.slug', 'chapter.manga_id', 'chapter.created_at', 'manga.name as manga_name', 'manga.slug as manga_slug', 'manga.image as manga_image']);
    let pageId = filter.page ? (filter.page - 1) : 0;
    pageId = pageId < 0 ? 0 : pageId;
    const pageSize = filter.pageSize ? filter.pageSize : 20;
    const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0;

    meta = {
        total: total,
        pageCount: pageCount,
        hasNext: pageId < pageCount,
        pageSize: pageSize,
        pageId: pageId
    }
    const chapters = await query.limit(pageSize).offset(pageId * pageSize);

    let result = [];
    for (let item of chapters) {
        let manga = {
            id: item.manga_id,
            name: item.manga_name,
            slug: item.manga_slug,
            image: item.manga_image,
            chapter: {
                id: item.chapter_id,
                manga_id: item.manga_id,
                name: item.name,
                slug: item.slug,
                created_at: item.created_at
            }
        }

        result.push(manga);
    }

    return {
        meta: meta,
        mangas: result
    };
}

export default {
    buildFilters: buildFilters,
    getPopularMangas: getPopularMangas,
    getLastUpdateMangas: getLastUpdateMangas,
    getTopViews: getTopViews,
    getBaseMeta: getBaseMeta,
    getMangaByChapters: getMangaByChapters
}