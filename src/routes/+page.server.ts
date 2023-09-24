import {Actions, fail, json} from '@sveltejs/kit';
import {isEmpty} from "lodash-es";
import {findLinksPuppeteer} from "$lib/server/analyzer";

export async function load(event) {
    return {

    };
}

export const actions: Actions = {
    analysis: async ({ request }) => {
        const data = await request.formData();
        const url = data.get("url");
        try {
            if (isEmpty(url)) {
                return fail(400, { errorMessage: 'url is empty' });
            }
            const res = await findLinksPuppeteer([url]);
            return res;
        } catch (err: Error) {
            return fail(400, { errorMessage: err.message });
        }
    }
};
