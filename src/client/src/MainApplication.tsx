import {animationCooldown, fetchWithCsrf} from "./utils";
import {SetupInit} from "./modals/setup";
import React from "react";
import {modalContainerRef, notificationRef} from "./App";
import {LoadingModal} from "./UI";
import {LoginInit} from "./modals/login";

export async function MainApplication() {
    modalContainerRef.current?.set(
        <LoadingModal />
    );

    let server_status = await (await fetchWithCsrf("/api/status")).json();
    if (!(server_status.ssl_enabled)) {
        if (window.location.protocol !== "https") {
            notificationRef.current?.add(
                {
                    title: "Warning",
                    content: "This server is not using SSL. This is not recommended for production.",
                    type: "warning"
                }
            )
        }
    }

    await animationCooldown();
    if (server_status.firstStart == true) {
        modalContainerRef.current?.set(<SetupInit />);
    } else {
        if (!await authCheck()) {
            modalContainerRef.current?.set(<LoginInit motd={server_status.motd} version={server_status.version}/>);
        } else {
            await animationCooldown();
            modalContainerRef.current?.close();
            await renderApplication();
        }
    }
}

export async function authCheck() {
    const res = await fetchWithCsrf("/api/auth/verify", {
        method: "POST"
    });

    if (!res.ok) {
        const res = await fetchWithCsrf("/api/auth/refresh", {
            method: "POST"
        });
        if (!res.ok) {
            return false;
        } else {
            console.log("Refreshed session.");
        }
    }
    return true;
}

export async function renderApplication() {

}