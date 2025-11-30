// src/components/WalletConnect.tsx

"use client";

import { ConnectButton, darkTheme } from "thirdweb/react";
import { chain } from "@/lib/chain";
import { client } from "@/lib/client";
import React from "react";
import {
    inAppWallet,
    createWallet,
} from "thirdweb/wallets";

const WalletConnect: React.FC = () => {
    return (
        <div className="flex justify-center m-5">
            <ConnectButton locale={"en_US"} 
                client={client}
                chain={chain}
                wallets={[ inAppWallet ({
                auth: {
                    options: [
                        "email",
                    ]
                    }
                }), 
                        createWallet("io.metamask") // This is how you add MetaMask            
                    ]}
                connectButton={{ label: "ล็อกอิน" }}
                connectModal={{
                    title: "เชื่อมต่อกระเป๋า",
                    titleIcon: "https://dfi.fund/_next/static/media/DFastLogo_650x600.4f2ec315.svg",
                    size: "wide", // Change to "compact" or "auto" 
                }}
                supportedTokens={{
                [chain.id]: [
                    {
                        address: "0x532313164FDCA3ACd2C2900455B208145f269f0e",
                        name: "KlongThai DFI",
                        symbol: "KTDFI",
                        icon: "https://ipfs.io/ipfs/QmSLo5e3PSBWgF3wysabPzsBjoRLngrFoVNrGwgL3vm2Zn/KTDFI_600x600.png",
                    },
                    {
                        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                        name: "USDC",
                        symbol: "USDC",
                        icon: "https://polygonscan.com/token/images/centre-usdc_32.png",
                    },
                    {
                        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                        name: "USDT",
                        symbol: "USDT",
                        icon: "https://polygonscan.com/token/images/tether_32.png",
                        },
                ],
                }}
                supportedNFTs={{
                [chain.id]: [
                    "0x2a61627c3457cCEA35482cAdEC698C7360fFB9F2", // nft contract address
                    "0x60aD2f102FDb0e09ED50e2ab07573079C956aFB8",
                    "0xF8a1C75Ee5802328Dc38460437154DC624e473ee",
                ],
                }}
                theme={darkTheme({
                    colors: {
                    modalBg: "hsl(241, 51%, 23%)",
                    borderColor: "hsl(60, 99%, 56%)",
                    accentText: "hsl(0, 100%, 60%)",
                    separatorLine: "hsl(22, 100%, 37%)",
                    secondaryText: "hsl(251, 20%, 50%)",
                    primaryText: "hsl(240, 89%, 93%)",
                    accentButtonBg: "hsl(22, 100%, 37%)",
                    tertiaryBg: "hsl(231, 11%, 12%)",
                    accentButtonText: "hsl(0, 0%, 97%)",
                    connectedButtonBg: "hsl(241, 51%, 23%)",
                    connectedButtonBgHover: "hsl(241, 50%, 17%)"
                    },
                })}
            />
        </div>
    );
};

export default WalletConnect;