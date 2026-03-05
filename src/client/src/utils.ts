export async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function animationCooldown() {
    await sleep(100);
    await new Promise(requestAnimationFrame);
}

export function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "";
}

export function getBasePath() {
    return document.querySelector('meta[name="base-path"]')?.getAttribute('content') || "/";
}

export async function fetchWithCsrf(url: string, init?: RequestInit) {
    const token = getCsrfToken();
    const basePath = getBasePath();

    let fullUrl = url;
    if (url.startsWith("/")) {
        fullUrl = basePath + url.substring(1);
    }

    const headers = new Headers(init?.headers || {});
    if (token) {
        headers.set('X-CSRF-Token', token);
    }
    return fetch(fullUrl, { ...init, headers });
}