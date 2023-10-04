import {error, json, RequestHandler} from '@sveltejs/kit'
import {analyze} from "$lib/server/puppeteerAnalyzer";

export async function POST() {
    return json(analyze("http://www.ecoletree.com/resources/ecoletree/css/ecoletree_home.css", false, 100, "", "http://www.ecoletree.com"));
}

export async function GET() {
    const url =
        // 'https://www.samsung.com/be_fr';
        'https://www.samsung.com/be_fr/audio-sound/galaxy-buds/galaxy-buds2-pro-graphite-sm-r510nzaaeub/';
// 'http://www.ecoletree.com/resources/ecoletree/img/home/topLogo.png'; // "image/png"
//     'http://www.ecoletree.com/resources/ecoletree/css/ecoletree_home.css'; // "text/css"
//     'http://www.ecoletree.com/resources/ecoletree/js/common.js'; // "text/javascript"
//         'http://www.ecoletree.com/resources/smartadmin/webfonts/fa-solid-900.woff2'; // Error: net::ERR_ABORTED
//     'https://d3udu241ivsax2.cloudfront.net/common/video/brand/audiobook2.mp4?v1'; // "video/mp4"
//         'https://github.com/JustinBeckwith/linkinator/archive/refs/tags/v5.0.2.zip'; // Error: net::ERR_ABORTED
//         'https://arxiv.org/pdf/2303.08774.pdf'; // "application/pdf"
    throw json(analyze(url, false, 100, "", "http://www.ecoletree.com"));
}

export const fallback: RequestHandler = async ({ request }) => {
    return error(404, {message: `I caught your ${request.method} request!`});
};

/*
* img[src]
- "/" 로 시작하는 URL: baseURL(지역코드 빼고) + src
- "//" 로 시작하는 URL: https?: + src
- "data:image/png;base64,iVBORw0KGgoAAAA...": base64
 */