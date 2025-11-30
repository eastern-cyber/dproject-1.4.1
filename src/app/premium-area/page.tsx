//src/app/premium-area/page.tsx
"use client";
import React from 'react'
import Image from "next/image";
import { useActiveAccount } from "thirdweb/react";
import dprojectIcon from "../../../public/DProjectLogo_650x600.svg";
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import Footer from '@/components/Footer';

export default function PremiumArea() {
    const account = useActiveAccount();

    return (
        <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center">
            <div className="flex flex-col items-center justify-center p-5 m-5 border border-gray-800 rounded-lg">
                <Link href="/" passHref>
                    <Image
                        src={dprojectIcon}
                        alt=""
                        className="mb-4 size-[100px] md:size-[100px]"
                        style={{
                            filter: "drop-shadow(0px 0px 24px #a726a9a8"
                        }}
                    />
                </Link>

                <h1 className="p-4 text-1xl md:text-3xl text-2xl font-semibold md:font-bold tracking-tighter">
                    พื้นที่สมาชิกพรีเมี่ยม
                </h1>
                <div className="flex justify-center mb-2">
                    <WalletConnect />
            </div>
            <div className="flex flex-col items-center mb-6">
                <WalletPublicKey walletAddress={account?.address || ""}/>
            </div>

            </div>
            <div className='px-1 w-full'>
                <Footer />
            </div>
            <div className="flex flex-col items-center">
                    <Link 
                        className="flex flex-col mt-4 border border-zinc-500 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors hover:border-zinc-800"
                        href="/">กลับหน้าหลัก</Link>
            </div>
        </main>
    )
}

type walletAddresssProps = {
    walletAddress?: string;
};

const WalletPublicKey: React.FC<walletAddresssProps> = ({ walletAddress }) => {
    const handleCopy = () => {
        const link = `https://dfi.fund/referrer/${walletAddress}`;
        navigator.clipboard.writeText(link);
        alert("ลิ้งค์ถูกคัดลอกไปยังคลิปบอร์ดแล้ว!");
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div 
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                fontSize: "24px",
                justifyContent: "center",
                paddingTop: "15px",
                // paddingBottom: "5px",
              }}
            >
                <span className="mt-4 text-[22px]">ลิ้งค์แนะนำของท่าน</span>
                <div 
                    style={{border: "1px solid #dfea08", background: "#2b2b59", padding: "4px 8px", margin: "6px", cursor: "pointer"}} 
                    onClick={handleCopy}
                >
                    <p className="text-[16px] break-all">
                        {walletAddress ? `https://dfi.fund/referrer/${walletAddress}` : "ยังไม่ได้เชื่อมกระเป๋า !"}
                    </p>    
                </div>
                <span className="text-center mt-4 text-[20px] break-words">เพื่อส่งให้ผู้มุ่งหวัง ที่ท่านต้องการแนะนำ</span>
                <div>
                {/* <p className="text-[16px] break-all">{walletAddress ? walletAddress || "" : "ยังไม่ได้เชื่อมกระเป๋า !"} </p> */}
                </div>
                <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
                    <span className="m-2 text-[#eb1c24] text-[22px] animate-blink">สมาชิกพรีเมี่ยม !</span>
                    เตรียมเปิดร้านค้าออนไลน์<br />และประชาสัมพันธ์ ผ่านแอ๊พ 
                    <span className="mt-2 text-[#eb1c24] text-3xl animate-blink">ก๊อกๆๆ !</span>
                </div>
            </div>
        </div>
    )
};