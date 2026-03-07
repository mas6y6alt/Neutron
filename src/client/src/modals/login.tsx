import React, {createRef} from "react";
import {Button, Entry, LoadingModal, Modal, ModalHandle, PasswordEntry} from "../UI";
import {animationCooldown, fetchWithCsrf} from "../utils";
import {modalContainerRef, notificationRef} from "../App";
import {renderApplication} from "../MainApplication";

interface LoginModalProp {
    motd: string;
    version: string;
}

export function LoginInit(props: LoginModalProp) {
    const usernameEntry = React.createRef<HTMLInputElement>();
    const passwordEntry = React.createRef<HTMLInputElement>();
    const button = React.createRef<HTMLButtonElement>();
    const modal = React.createRef<ModalHandle>();

    async function onClick() {
        modal.current?.hideModal();
        await animationCooldown();
        const loadingModalRef = createRef<ModalHandle>();
        modalContainerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);

        let res = (await fetchWithCsrf("/api/auth/password_auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameEntry.current?.value.trim() || usernameEntry.current?.value.trim(),
                password: passwordEntry.current?.value.trim() || passwordEntry.current?.value.trim(),
            })
        }))

        if (!res.ok) {
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            modalContainerRef?.current?.set(<LoginInit motd={props.motd} version={props.version}/>);
            notificationRef.current?.add({
                title: "Error",
                content: (await res.json()).detail || "An unknown error occurred.",
                type: "error"
            })
            return;
        } else {
            await animationCooldown();
            modalContainerRef.current?.close();
            await renderApplication();
        }
    }

    return (<Modal ref={modal}>
        <h1>Login</h1>
        <p>{props.motd}</p>
        <p>Please enter your username to continue.</p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start'}}>
            <Entry ref={usernameEntry} placeholder="Username"/>
            <PasswordEntry ref={passwordEntry} placeholder="Password"/>
            <Button onClick={onClick} ref={button}>Continue</Button>
        </div>

        <p className={"subtext"} style={{marginTop: '0.5rem'}}>Zarium Version: {props.version}</p>
    </Modal>)
}