"use client";
import Image from "next/image";
import {  ConnectButton, TransactionButton, useActiveAccount, useReadContract } from "thirdweb/react";
import dprojectIcon from "@public/DFastLogo_650x600.svg";
import { client } from "../../client";
import { chain  } from "../../chain";
import { inAppWallet } from "thirdweb/wallets";
import { getContract } from "thirdweb";
import { defineChain, ethereum, polygon } from "thirdweb/chains";
import { claimTo as claimERC1155, balanceOf as balanceOfERC1155 } from "thirdweb/extensions/erc1155";
import { contract } from "../../../../utils/contracts";
import { getContractMetadata } from "thirdweb/extensions/common";

export default function ReferrerDetails( { 
    params,
 }: {
    params: { referrerId: string };
}) {
    // return <h1>Details about Referrer {params.referrerId}</h1>
    const account = useActiveAccount();

    const { data: nftMetadata } = useReadContract(
        getContractMetadata,
        {
          contract: contract,
        }
      );

    return (
        <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center">
            <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    margin: "20px",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}>
                
                <Image
                src={dprojectIcon}
                alt=""
                className="mb-4 size-[100px] md:size-[100px]"
                style={{
                    filter: "drop-shadow(0px 0px 24px #a726a9a8"
                }}
            />

            <h1 className="p-4 text-1xl md:text-4xl font-semibold md:font-bold tracking-tighter">
               สมัครใช้งาน
            </h1>
                <div className="flex justify-center mb-20">
                    <ConnectButton locale={"en_US"} 
                        client={client}
                        chain={chain}
                        wallets={[ inAppWallet ({
                        auth: {
                            options: [
                                "email",
                            ]
                            }
                        }) ]}
                        connectModal={{
                            title: "เชื่อมต่อกระเป๋า",
                            titleIcon: "https://dfi.fund/_next/static/media/DFastLogo_650x600.4f2ec315.svg",
                            size: "wide", // Change to "compact" or "auto" 
                        }}
                        supportedTokens={{
                        [polygon.id]: [
                            {
                                address: "0xca23b56486035e14F344d6eb591DC27274AF3F47",
                                name: "DProject",
                                symbol: "DFI",
                                icon: "https://dfi.fund/_next/static/media/DFastLogo_650x600.4f2ec315.svg",
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
                        [polygon.id]: [
                            "0x2a61627c3457cCEA35482cAdEC698C7360fFB9F2", // nft contract address
                        ],
                        }}
                    />
                </div>
            {/* <p>ผู้แนะนำ: sunyapakorn.1958@gmail.com</p>
             */}
            <p style={{fontSize: "19px"}}><b>เลขที่กระเป๋าของผู้แนะนำ</b></p>
            <div style={{border: "1px solid #666", background: "#222", padding: "0px 6px", margin: "10px"}}>
            {/* <p style={{fontSize: "18px"}}>{params.referrerId}</p> */}
            <p style={{ fontSize: "18px" }}>{params.referrerId ? `${params.referrerId.slice(0, 6)}...${params.referrerId.slice(-4)}` : ""}
</p>
            </div>
                <div className="flex flex-col items-center mb-6">
                    <ClaimButtons walletAddress={account?.address || ""}/>
                </div>
                <div className="flex flex-col items-center mb-6">
                    <WalletBalances walletAddress={account?.address || ""}/>
                </div>

            </div>
            <div className="flex flex-col items-center">
                    <a 
                        className="flex flex-col mt-4 border border-zinc-500 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors hover:border-zinc-800"
                        href="/">กลับหน้าหลัก</a>
            </div>
        </main>
    )
    
}

type walletAddresssProps = {
    walletAddress?: string;
};

const ClaimButtons: React.FC<walletAddresssProps> = ({ walletAddress }) => {
    const nftContract = getContract({
        client: client,
        chain: defineChain(polygon),
        address: "0x2a61627c3457cCEA35482cAdEC698C7360fFB9F2"
    })

    return (
        <div className="flex flex-col gap-4 md:gap-8">
            <div className="flex flex-col gap-4 md:gap-8">
            <p className="text-center mt-4">
                กดปุ่ม<b> "ยืนยัน"</b><br /> ด้านล่าง
            </p>
            </div>
            <div className="flex flex-col gap-2 md:gap-6">
                <TransactionButton
                        // className="border bg-zinc-800 border-zinc-500 px-4 py-3 rounded-lg hover:bg-zinc-100 transition-colors hover:border-zinc-300"
                        transaction={() => claimERC1155({
                            contract: nftContract,
                            to: walletAddress || "",
                            tokenId: 3n,
                            quantity: 1n
                        })}
                        onTransactionConfirmed={async () => {
                            alert("รายการ ยืนยัน เรียบร้อย ");
                        }}
                >
                <p style={{fontSize: "18px"}}><b>ยืนยัน</b></p>
                </TransactionButton>
            </div>
            <p className="text-center">
                ชำระ<b> "40 POL"</b><br /> เพื่อสนับสนุน<br /> แอพพลิเคชั่นก๊อกๆๆ
            </p>  
        </div>
    )
};

const WalletBalances: React.FC<walletAddresssProps> = ({ walletAddress }) => {

    const account = useActiveAccount();

    const { data: contractMetadata } = useReadContract(
        getContractMetadata,
        {
          contract: contract,
        }
      );

    const { data: nftBalance } = useReadContract(
        balanceOfERC1155,
        {
            contract: getContract({
                client: client,
                chain: defineChain(polygon),
                address: "0x2a61627c3457cCEA35482cAdEC698C7360fFB9F2"
            }),
            owner: walletAddress || "",
            tokenId: 3n
        }
    );

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            // border: "1px solid #333",
            // borderRadius: "8px",
          }}>
            <div className="flex flex-col">
                <a target="_blank" href="https://opensea.io/assets/matic/0x2a61627c3457ccea35482cadec698c7360ffb9f2/3">
                <img  className="h-56 w-56 m-6" src="https://e8b864cf8d55fbd854f43ae53b6c824c.ipfscdn.io/ipfs/QmX7sxs3WExk8eYQ1G96HMqaZsS5AiPgSdJncj6aTvnG3j/3.png" alt="" />
                <img  className="h-56 w-56 m-6" src="https://e8b864cf8d55fbd854f43ae53b6c824c.ipfscdn.io/ipfs/QmW7A4LMuGbi35x5aWMn1UZWomk5QGbSmFR9d8MvwidoVe/1.png" alt="" />
                </a>
            </div>
            <div 
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                    fontSize: "24px",
                    justifyContent: "center",
                    paddingBottom: "20px",
                    // border: "1px solid #333",
                    // borderRadius: "8px",
                }}
                >
                    <p style={{fontSize: "19px"}}><b>เลขที่กระเป๋าของท่าน</b></p>
                        <div style={{border: "1px solid #666", background: "#222", padding: "0px 6px", margin: "10px"}}>
                        {/* <p style={{fontSize: "18px"}}>{walletAddress ? walletAddress || "" : "ยังไม่ได้เชื่อมกระเป๋า !"} </p>     */}
                        <p style={{ fontSize: "18px" }}>{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "ยังไม่ได้เชื่อมกระเป๋า !"} </p>
                        </div>
                    <div style={{justifyContent: "center", alignItems: "center", fontSize: "24px", marginTop: "6px"}}>
                        คูปอง 3K NFT ของท่านมี 
                        <span style={{border: "1px solid #666", background: "#222", padding: "0px 6px", margin: "10px"}}>
                            {walletAddress ? nftBalance?.toString() : "0"}
                        </span>
                        รายการ
                    </div>
            </div>
        </div>
    )
};