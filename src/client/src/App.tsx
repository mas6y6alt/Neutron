import React, {useRef, useEffect, RefObject, createRef} from "react";
import {
    Modal,
    ModalContainer,
    ModalContainerHandle,
    ModalHandle,
    LoadingModal,
    NotificationContainer,
    NotificationHandle
} from "./UI";
import {SetupInit} from "./UI/setup";
import "./css/Font.css";
import "./css/App.css";
import {animationCooldown, fetchWithCsrf, sleep} from "./utils";

export const notificationRef = createRef<NotificationHandle>();
export const containerRef = createRef<ModalContainerHandle>();

function App() {
    const modalRef = useRef<ModalHandle>(null);

    useEffect(() => {
        async function main() {
            containerRef.current?.set(
                <LoadingModal />
            );

            let server_status = await (await fetchWithCsrf("/api/status")).json();
            if (!(server_status.ssl_enabled)) {
                notificationRef.current?.add(
                    {
                        title: "Warning",
                        content: "Your server is not using SSL. This is not recommended for production.",
                        type: "warning"
                    }
                )
            }

            await animationCooldown();
            if (server_status.firstStart == true) {
                containerRef.current?.set(<SetupInit />);
            } else {

            }
            modalRef.current?.showModal();
        }

        main().catch((e) => {
            console.error(e);
            containerRef.current?.set(
                <Modal ref={modalRef}>
                    <h1>Error</h1>
                    <p>An error occurred while loading Neutron.</p>
                    <p>Please reload to try again.</p>
                </Modal>
            );
        });
    }, []);

    return (
        <div className="App">
            <ModalContainer ref={containerRef} />
            <NotificationContainer ref={notificationRef} />
        </div>
    );
}

export default App;