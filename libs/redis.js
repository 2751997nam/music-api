import Redis from 'ioredis';

const redis = new Redis();

redis.getJson = async (key, defaultValue = null) => {
    let value = defaultValue;
    try {
        value = JSON.parse(await redis.get(key));
    } catch (error) {
        
    }
    return value;
}

redis.setJson = function (key, value, param1 = null, param2 = null) {
    if (param1 && param2) {
        redis.set(key, JSON.stringify(value), param1, param2);
    } else {
        redis.set(key, JSON.stringify(value), 'EX', 3600);
    }
}

redis.delete = async function (keys) {
    var pipeline = redis.pipeline();
    keys.forEach(function (key) {
        pipeline.del(key);
    });

    return await pipeline.exec();
}

export default redis;