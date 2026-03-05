import {Button, LoadingModal, Modal, ModalHandle, Entry, PasswordEntry} from "../UI";
import React, {createRef, useRef} from "react";
import {containerRef, notificationRef} from "../App";
import {animationCooldown, fetchWithCsrf} from "../utils";

export function SetupInit() {
    const entry = useRef<HTMLInputElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const modal = useRef<ModalHandle>(null);

    async function onClick() {
        modal.current?.hideModal();
        await animationCooldown();
        const loadingModalRef = createRef<ModalHandle>();
        containerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);
        let key: string = entry.current?.value || "";

        let res = (await fetchWithCsrf("/api/check-superadmin-key", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                key: key
            })
        }));

        let data = await res.json();
        if (data.success) {
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            containerRef?.current?.set(<SetupAdminAccountCreation superAdminKey={key}/>);
        } else {
            loadingModalRef.current?.hideModal();
            await animationCooldown();
            notificationRef.current?.add({
                title: "Error",
                content: data.detail,
                type: "error"
            });
            containerRef?.current?.set(<SetupInit/>);
        }
    }

    return (
        <Modal ref={modal}>
            <h1>Server setup</h1>
            <p>
                This server's user database is empty (assuming this is the first
                time this server has been started)
            </p>
            <p>
                To continue with your server setup please enter your superadmin
                key located in your server log.
            </p>

            <div style={{display: "flex", gap: "10px"}}>
                <Entry ref={entry} placeholder="Superadmin key"/>
                <Button ref={button} onClick={onClick}>Continue</Button>
            </div>
        </Modal>
    );
}

interface SetupAdminAccountCreationProps {
    superAdminKey: string
}

export function SetupAdminAccountCreation({superAdminKey}: SetupAdminAccountCreationProps) {
    const modal = useRef<ModalHandle>(null);
    const usernameEntry = useRef<HTMLInputElement>(null);
    const passwordEntry = useRef<HTMLInputElement>(null);

    async function onClick() {
        modal.current?.hideModal();
        await animationCooldown();
        const loadingModalRef = createRef<ModalHandle>();
        containerRef?.current?.set(<LoadingModal ref={loadingModalRef}/>);


    }

    return (
        <Modal ref={modal}>
            <h1>Server SuperAdmin creation</h1>
            <p>
                Please enter your account details to create this server's SuperAdmin account.
            </p>

            <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                <Entry ref={usernameEntry} placeholder="Username" autoComplete={"username"}/>
                <PasswordEntry ref={passwordEntry} placeholder="Password" autoComplete={"new-password"}/>
                <Button onClick={onClick}>Create</Button>
            </div>
        </Modal>
    );
}