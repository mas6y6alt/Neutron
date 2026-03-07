import React, {useEffect, createRef} from "react";
import {
    BackgroundComponent,
    BackgroundHandle,
    Modal,
    ModalContainer,
    ModalContainerHandle,
    NotificationContainer,
    NotificationHandle
} from "./UI";
import './sass/main.scss';
import {MainApplication} from "./MainApplication";
import {Zarium} from "./Zarium";

export const notificationRef = createRef<NotificationHandle>();
export const modalContainerRef = createRef<ModalContainerHandle>();
export const backgroundRef = createRef<BackgroundHandle>();
export const ZariumRef = createRef<HTMLDivElement>();

function App() {
    useEffect(() => {
        MainApplication().catch((e) => {
            console.error(e);
            modalContainerRef.current?.set(
                <Modal>
                    <h1>Error</h1>
                    <p>An error occurred while loading Zarium.</p>
                    <p>Please reload to try again.</p>
                </Modal>
            );
        });
    }, []);

    return (
        <div className="App">
            <BackgroundComponent ref={backgroundRef}/>
            <ModalContainer ref={modalContainerRef}/>
            <NotificationContainer ref={notificationRef}/>
            <Zarium ref={ZariumRef}/>
        </div>
    );
}

export default App;