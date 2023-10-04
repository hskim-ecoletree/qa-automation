export default {
    schema: "./src/schema/*",
    out: "./drizzle",
    driver: "better-sqlite",
    dbCredentials: {
        url: "./linkinator.db",
    }
}