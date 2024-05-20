import 'dotenv/config';
import { createClient } from "redis";
import { sequelize } from './dbConnect.js';
import RedisStore from "connect-redis";

export async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
    } catch (error) {
        console.error("Unable to connect to the database:", error);
        process.exit(1); // Exit application if database connection fails
    }
}

export async function initializeRedis() {
    const redisClient = createClient();
    try {
        await redisClient.connect();
    } catch (error) {
        console.error("Redis Client Error", error);
        process.exit(1); // Exit application if Redis connection fails
    }
    return redisClient;
}

export const redisClient = await initializeRedis();
export const redisStore = new RedisStore({ client: redisClient, prefix: "vitome:" });