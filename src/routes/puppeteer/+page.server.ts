import {Actions, fail, json} from '@sveltejs/kit';
import {isEmpty, groupBy, pickBy} from "lodash-es";
// import {findLinksPuppeteer} from "$lib/server/analyzer";
import {analyze} from "../lib/server/linkinatorAnalyzer";

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
            // const res = await findLinksPuppeteer([url]);
            // return res;

            const res = await analyze((url || "").toString(), [
                "javascript:"
                , "mailto:"
                ,"{{"
                ,".js"
                ,".ttf"
                ,".gif"
                ,".png"
                ,".jpg"
                ,".svg"
                ,".woff"
                ,".css"
                ,".eot"
                ,"/search/"
                ,".webm"
                ,"/support/"
                ,"/multistore/"
                ,".cur"
                ,".mp4"
                ,"https://account.samsung.com/"
                ,"PNG$"
                ,"http://csr.samsung.com/en/main.do"
                ,"signInGate"
                ,"signOutGate"
                ,"http://csr.samsung.com/"
                ,"/global/"
                ,"[SKU]"
                ,"/function/ipredirection/ipredirectionLocalList/"
                ,".wav"
                ,".mpeg"
                ,".otf"
                ,".ico"]);
            if (res) {
                // const grouped = groupBy(res.data, d => (`${d.url}`));
                return res;
            } else {
                return fail(400, { errorMessage: 'failed' });
            }
        } catch (err: Error) {
            return fail(400, { errorMessage: err.message });
        }
    }
};


[]