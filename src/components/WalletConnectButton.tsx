"use client";

import React, {FC, useEffect, useState} from "react";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {AuthContext} from "../context/AuthContext";
import {useWallet} from "@solana/wallet-adapter-react";

type WalletConnectButtonProps = {
    style: CSSPerspective
}

const WalletConnectButton:FC<WalletConnectButtonProps> = ({style}) => {
    const [isMounted, setIsMounted] = useState(false);
    const { setIsAuthenticated } = React.useContext(AuthContext);
    const { connected } = useWallet();

    useEffect(() => {
        setIsMounted(true);
    }, [connected]);

    useEffect(() => {
        setIsAuthenticated(connected);
    }, [connected]);


    if (!isMounted) {
        return null; // Don't render on the server
    }

    return (
        <>
            <WalletMultiButton
                style={style}/>
        </>
    )
}

export default WalletConnectButton;