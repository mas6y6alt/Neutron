import React, {
    forwardRef,
    InputHTMLAttributes,
    ReactNode,
    useImperativeHandle,
    useState,
    JSX,
    useRef,
    useEffect, CSSProperties
} from "react"

export interface ModalContainerHandle {
    set: (modal: JSX.Element | null) => void;
    close: () => void;
}

export interface ModalHandle {
    showModal: () => void;
    hideModal: () => void;
}

export interface NotificationHandle {
    add: (notification: NotificationProps) => void;
}

export interface NotificationHandle {
    add: (notification: NotificationProps) => void;
}


export interface NotificationProps {
    id?: string;
    title?: string;
    content?: string;
    duration?: number;
    type?: 'info' | 'error' | 'success' | 'warning';
    borderColor?: string;
    onClick?: () => void;
}

interface ModalProps {
    children?: ReactNode;
}

export const ModalContainer = forwardRef<ModalContainerHandle>((props, ref) => {
    const [modal, setModal] = useState<JSX.Element | null>(null);
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        set: (newModal: JSX.Element | null) => {
            setModal(newModal);
            requestAnimationFrame(() => setVisible(true));
        },
        close: () => {
            setVisible(false);
            setTimeout(() => setModal(null), 300);
        },
    }));

    return (
        <div className={`ModalContainer ${visible ? "show" : ""}`}>
            {modal}
        </div>
    );
});

export const Modal = forwardRef<ModalHandle, ModalProps>((props, ref) => {
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        showModal: () => {
            setVisible(true);
            requestAnimationFrame(() => setVisible(true));
        },
        hideModal: () => {
            setVisible(false);
            setTimeout(() => setVisible(false), 300);
        },
    }));

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    return (
        <div className={`Modal ${visible ? "show" : ""}`}>
            {props.children}
        </div>
    );
});

export function LoadingCircle() {
    return (
        <div className="LoadingCircle"></div>
    )
}

type EntryProps = InputHTMLAttributes<HTMLInputElement>;

export const Entry = forwardRef<HTMLInputElement, EntryProps>(
    (props, ref) => {
        return (
            <input
                className="UIEntry"
                style={{display: 'block'}}
                ref={ref}
                type="text"
                {...props}
            />
        );
    }
);

export const PasswordEntry = forwardRef<HTMLInputElement, EntryProps>(
    (props, ref) => {
        return (
            <input
                className="UIEntry"
                style={{display: 'block'}}
                ref={ref}
                type="password"
                {...props}
            />
        );
    }
);


type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    color?:
        | 'primary'
        | 'secondary'
        | 'success'
        | 'danger'
        | 'warning'
        | 'info'
        | 'light'
        | 'dark'
        | 'link';
    style?: CSSProperties;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ color = 'primary', className, style, ...props }, ref) => {
        const colorClass = `btn-${color}`;

        return (
            <button
                ref={ref}
                className={`btn UIButton ${colorClass} ${className ?? ''}`}
                style={style}
                {...props}
            />
        );
    }
)

interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
    return (
        <label className={`UISwitch ${disabled ? 'disabled' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange?.(e.target.checked)}
                disabled={disabled}
            />
            <span className="UISwitchSlider"></span>
        </label>
    );
}

export const LoadingModal = forwardRef<ModalHandle>((props, ref) => {
    const modal = useRef<ModalHandle>(null);

    useEffect(() => {
        if (ref) {
            if (typeof ref === "function") ref(modal.current);
            else (ref as React.RefObject<ModalHandle | null>).current = modal.current;
        }
    }, [ref]);

    useEffect(() => {
        requestAnimationFrame(() => modal.current?.showModal());
    }, []);

    return (
        <Modal ref={modal}>
            <LoadingCircle />
        </Modal>
    );
});

export const NotificationContainer = forwardRef<NotificationHandle>((props, ref) => {
    const [notifications, setNotifications] = useState<(NotificationProps & { closing?: boolean })[]>([]);

    useImperativeHandle(ref, () => ({
        add: (notification: NotificationProps) => {
            const id = notification.id || Math.random().toString(36).substring(7);
            const duration = notification.duration ?? 5000;

            setNotifications(prev => [...prev, { ...notification, id }]);

            if (duration > 0) {
                setTimeout(() => {
                    setNotifications(prev =>
                        prev.map(n => (n.id === id ? { ...n, closing: true } : n))
                    );
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== id));
                    }, 300);
                }, duration);
            }
        },
    }));

    const handleClick = (n: NotificationProps) => {
        n.onClick?.();

        setNotifications(prev =>
            prev.map(x => (x.id === n.id ? { ...x, closing: true } : x))
        );

        setTimeout(() => {
            setNotifications(prev => prev.filter(x => x.id !== n.id));
        }, 300);
    };

    return (
        <div className="NotificationContainer">
            {notifications.map(n => (
                <div
                    key={n.id}
                    className={`Notification ${n.type || "info"} ${n.closing ? "closing" : ""}`}
                    style={{ borderLeftColor: n.borderColor }}
                    onClick={() => handleClick(n)}
                >
                    {n.title && <div className="NotificationTitle">{n.title}</div>}
                    {n.content && <div className="NotificationContent">{n.content}</div>}
                </div>
            ))}
        </div>
    );
});



interface BackgroundOptions {
    color?: string;
    imageUrl?: string;
    blur?: boolean;
}

export interface BackgroundHandle {
    setBackground: (options: BackgroundOptions) => void;
}


interface BackgroundProps {
    color?: string;
    image?: string;
    blur?: boolean;
}

export const BackgroundComponent = forwardRef((props: BackgroundProps, ref) => {
    const [bgProps, setBgProps] = useState<BackgroundProps>({
        color: undefined, // undefined = default Bootstrap background
        image: undefined,
        blur: false,
    });

    // Expose a method via ref
    useImperativeHandle(ref, () => ({
        setBackground: (newProps: BackgroundProps) => setBgProps(newProps),
    }));

    const style: React.CSSProperties = {
        backgroundColor: bgProps.color ?? 'var(--default-app-background)', // <-- Bootstrap default
        backgroundImage: bgProps.image ? `url(${bgProps.image})` : undefined,
        backdropFilter: bgProps.blur ? 'blur(8px)' : undefined,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return <div className="background-component" style={style}></div>;
});