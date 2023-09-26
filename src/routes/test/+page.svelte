<script lang="ts">
    // export let data;
    let linkCheckResult = [];
    let url;

    function stateClass(state) {
        switch (state) {
            case 'alive':
                return 'badge-success';
            case 'dead':
                return 'badge-neutral';
            case 'skipped':
                return 'badge-ghost';
            case 'not-found':
                return 'badge-secondary';
            case 'error':
                return 'badge-error';
            case 'redirect':
            default:
                return 'badge-warning';
        }
    }

    async function fetchAnalyzeResult() {
        const res = await fetch(`/test`, {
                method: 'POST',
                body: JSON.stringify({url}),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        const json = await res.json();
        linkCheckResult = json.items;
    }

    function enterKeydown(event) {
        debugger
        if (event.key === 'Enter') {
            debugger
            fetchAnalyzeResult();
        }
    }

    $: linkCheckResult
</script>


<div>
    <h1>Test Homepage</h1>
    <form method="POST">
        <fieldset>
            <label>
                Homepage URL:
                <input name="url" type="text" class="w-96" maxlength="255" bind:value={url} on:keydown={enterKeydown} on:keypress={enterKeydown}  on:keyup={enterKeydown}>
            </label>
        </fieldset>
    </form>
    <button class="btn btn-primary" type="button" on:click={fetchAnalyzeResult}>Analysis</button>
</div>

<div class="overflow-x-auto">
    <table class="table">
        <!-- head -->
        <thead>
        <tr>
            <th></th>
            <th>State</th>
            <th>URL</th>
            <th>Parent</th>
            <th>Failure</th>
        </tr>
        </thead>
        <tbody>
        {#each linkCheckResult as link, idx}
            <tr>
                <th>{idx + 1}</th>
                <th class="min-w-[6rem] max-w-[10rem] indicator"><span class={`indicator-item indicator-middle indicator-center badge ${stateClass(link.state)}`}>{link.state}</span></th>
                <td>{link.url}</td>
                <td>{link.parent}</td>
                <td>{link.failure || ""}</td>
            </tr>
        {/each}
        </tbody>
    </table>
</div>