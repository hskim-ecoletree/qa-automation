<script lang="ts">
    // export let data;
    let loading = false;
    let linkCheckResult = [];

    let url;
    let ignorePatterns = "javascript:\n"
        +  "mailto:\n"
        + "{{\n"
        + ".css\n"
        + ".js\n"
        + ".gif\n"
        + ".png\n"
        + ".jpg\n"
        + ".jpeg\n"
        + ".svg\n"
        + ".webm\n"
        + ".mpeg\n"
        + ".wav\n"
        + ".mp4\n"
        + "PNG$\n"
        + ".ttf\n"
        + ".woff\n"
        + ".eot\n"
        + ".cur\n"
        + ".otf\n"
        + ".ico\n"
        + "/search/\n"
        + "/support/\n"
        + "/multistore/\n"
        + "https://account.samsung.com/\n"
        + "http://csr.samsung.com/en/main.do\n"
        + "http://csr.samsung.com/\n"
        + "signInGate\n"
        + "signOutGate\n"
        + "/global/\n"
        + "[SKU]\n"
        + "/function/ipredirection/ipredirectionLocalList/";
    let isRecurse = true;

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
        loading = true;
        const res = await fetch(`/linkinator`, {
                method: 'POST',
                body: JSON.stringify({
                    url,
                    concurrency: 20,
                    ignores: ignorePatterns.split('\n').map(str => (str || "").trim()).filter(str => str.length > 0),
                    recurse: isRecurse
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        const json = await res.json();
        linkCheckResult = json.items || [];
        loading = false;
    }

    function enterKeydown(event) {
        if (event.key === 'Enter') {
            fetchAnalyzeResult();
        }
    }

    $: linkCheckResult
</script>


<form class="space-y-4 w-800">
    <div class="form-control">
<!--            <label class="label">-->
            <label for="iptUrl" class="label-text">Web site URL</label>
            <input id="iptUrl" name="url" type="text" placeholder="Type your web site URL" class="input input-bordered input-primary resize max-w-xs" maxlength="255" bind:value={url} on:keydown={enterKeydown} on:keypress={enterKeydown} on:keyup={enterKeydown}>
<!--            </label>-->
    </div>
    <div class="form-control">
        <label for="chkRecurse" class="label-text">Scan Whole Web site</label>
        <input id="chkRecurse" class="checkbox checkbox-primary" type="checkbox" name="recurse" bind:checked={isRecurse}>
    </div>
    <div class="form-control">
        <textarea placeholder="Type ignore patterns" class="textarea textarea-bordered textarea-lg w-full max-w-xs" bind:value={ignorePatterns}></textarea>
    </div>
    {#if (!loading)}
    <button class="btn btn-primary" type="button" on:click={fetchAnalyzeResult}>Analysis</button>
    {/if}
</form>
{#if (loading)}
<span class="loading loading-dots loading-lg text-primary"></span>
{/if}
<div class="overflow-x-auto">
    <div>
        <div>
            <p> Total: {linkCheckResult.length || 0}</p>
            <p> Alive: {linkCheckResult.filter(l => l.state === 'alive').length || 0}</p>
            <p> Dead: {linkCheckResult.filter(l => l.state === 'dead').length || 0}</p>
            <p> Skipped: {linkCheckResult.filter(l => l.state === 'skipped').length || 0}</p>
        </div>
    </div>
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