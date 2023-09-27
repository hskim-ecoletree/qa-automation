# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

```bash
# neo4j Docker installation
docker run -d \
--restart=unless-stopped \
-p 7474:7474 -p 7687:7687 \
--volume=$HOME/dev/neo4j/data:/data \
--volume=$HOME/dev/neo4j/logs:/logs \
--volume=$HOME/dev/neo4j/plugins:/plugins \
--env NEO4J_AUTH=neo4j/test \
--env TZ=Asia/Seoul \
--env NEO4J_dbms_db_timezone=SYSTEM \
--env NEO4J_server_memory_heap_initial__size=3G \
--env NEO4J_server_memory_heap_max__size=3G \
--env NEO4J_PLUGINS='["apoc", "graph-data-science", "streams", "n10s"]' \
--name neo4j \
neo4j:5.12.0-community-bullseye

[neo4j 도커 설정](https://neo4j.com/docs/operations-manual/current/docker/configuration/)
[neo4j 설정](https://neo4j.com/docs/operations-manual/current/configuration/configuration-settings/#config_dbms.security.ldap.authorization.user_search_base)
```