<script lang="ts">
    import {check} from "$lib/server/link-checker";

    let res = check(["http://www.ecoletree.com"]);
    $: res;
</script>

{#each res as link}
    <p>{link}</p>
{/each}

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
