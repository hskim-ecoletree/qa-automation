<script lang="ts">
    import {enhance} from '$app/forms';
    import {flatMap} from "lodash-es";

    // export let data;
    let linkCheckResult = [];
    let url;
    function processFormAction() {
        return async ({result, update}) => {
            linkCheckResult = flatMap(result.data || [], res => [res, ...(res.pageResources || [])]);
            // update();
        };
    }

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

    $: linkCheckResult
</script>


<div>
    <h1>Test Homepage</h1>
    <form method="POST" action="?/analysis" use:enhance={processFormAction}>
        <fieldset>
            <label>
                Homepage URL:
                <input name="url" type="text" class="w-96" maxlength="255" bind:value={url}>
            </label>
        </fieldset>
        <button class="btn btn-primary" type="submit">Analysis</button>
    </form>
</div>

<div class="overflow-x-auto">
    <table class="table">
        <!-- head -->
        <thead>
        <tr>
            <th></th>
            <th>URL</th>
            <th>Parent</th>
            <th>Failure</th>
        </tr>
        </thead>
        <tbody>
        {#each linkCheckResult as link}
        <tr>
            <th class="min-w-[6rem] max-w-[10rem] indicator"><span class={`indicator-item indicator-middle indicator-center badge ${stateClass(link.state)}`}>{link.state}</span></th>
            <td>{link.validUrl || link.url}</td>
            <td>{link.parent}</td>
            <td>{link.failure || ""}</td>
        </tr>
        {/each}
        </tbody>
    </table>
</div>