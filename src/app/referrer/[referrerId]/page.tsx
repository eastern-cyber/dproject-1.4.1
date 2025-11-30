// src/app/referrer/[referrerId]/page.tsx

"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import dprojectIcon from "../../../../public/DProjectLogo_650x600.svg";
import WalletConnect from "@/components/WalletConnect";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";

interface ReferrerData {
  user_id?: string;
  email?: string;
  name?: string;
  token_id?: string;
}

export default function ReferrerDetails({ params }: { params: Promise<{ referrerId: string }> }) {
    const [resolvedParams, setResolvedParams] = useState<{ referrerId: string }>({ referrerId: '' });
    const [referrerData, setReferrerData] = useState<ReferrerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setResolvedParams(resolved);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        const fetchReferrerData = async () => {
            if (!resolvedParams.referrerId) return;

            try {
                setLoading(true);
                setError(null);
                
                const response = await fetch(`/api/referrer/${resolvedParams.referrerId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("ไม่พบข้อมูลผู้แนะนำ");
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    setError(data.error);
                } else {
                    setReferrerData(data);
                }
            } catch (error) {
                console.error("Error fetching referrer data:", error);
                setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };

        if (resolvedParams.referrerId) {
            fetchReferrerData();
        }
    }, [resolvedParams.referrerId]);

    const navigateToConfirmPage = () => {
        const data = {
            var1: resolvedParams.referrerId || "N/A",
            var2: referrerData?.email || "N/A",
            var3: referrerData?.name || "N/A",
            var4: referrerData?.token_id || "N/A",
        };

        sessionStorage.setItem("mintingsData", JSON.stringify(data));
        router.push("/referrer/confirm");
    };

    return (
        <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center">
            <div className="flex flex-col items-center justify-center p-10 m-5 border border-gray-800 rounded-lg">
                <Link href="/" passHref>
                    <Image
                        src={dprojectIcon}
                        alt="DProject Logo"
                        className="mb-4 size-[100px] md:size-[100px]"
                        style={{
                            filter: "drop-shadow(0px 0px 24px #a726a9a8",
                        }}
                    />
                </Link>
                <h1 className="p-4 md:text-2xl text-2xl font-semibold md:font-bold tracking-tighter">
                    สมัครใช้งาน
                </h1>
                <div className="flex justify-center m-5">
                    <WalletConnect />
                </div>
                <div className="flex flex-col items-center justify-center p-2 m-2">
                    <p className="flex flex-col items-center justify-center text-[20px] m-2 text-center break-word">
                        <b>ขณะนี้ ท่านกำลังดำเนินการสมัครสมาชิก ภายใต้การแนะนำของ</b>
                    </p>
                    
                    {loading ? (
                        <p className="text-red-600 text-[18px] mt-2">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="text-red-400 text-sm mt-2">{error}</p>
                    ) : referrerData ? (
                        <div className="mt-4 text-center gap-6 bg-gray-900 p-4 border border-1 border-gray-400">
                            <p className="text-lg text-gray-300">
                                <b>เลขกระเป๋าผู้แนะนำ:</b> {resolvedParams.referrerId ? `${resolvedParams.referrerId.slice(0, 6)}...${resolvedParams.referrerId.slice(-4)}` : "ไม่พบกระเป๋า"}<br />
                            </p>
                            <p className="text-lg text-gray-300">
                                <b>อีเมล:</b> {referrerData.email}
                            </p>
                            <p className="text-lg text-gray-300 mt-1">
                                <b>ชื่อ:</b> {referrerData.name}
                            </p>
                            <p className="text-lg text-red-600 mt-1">
                                <b>Token ID: {referrerData.token_id} </b>
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-sm mt-2">ไม่พบข้อมูลผู้แนะนำ</p>
                    )}
                    
                    <div className="text-center items-centerflex border border-gray-400 bg-[#2b2b59] p-2.5 mt-5 w-full">
                        <p className="text-[18px] break-all">
                            {resolvedParams.referrerId ? `${resolvedParams.referrerId}` : "ไม่พบกระเป๋า"}
                        </p>
                    </div>
                </div>
                
                {!loading && !error && referrerData && (
                    <div className="flex flex-col items-center mb-6">
                        <button 
                            onClick={navigateToConfirmPage} 
                            className="flex flex-col mt-1 border border-zinc-100 px-4 py-3 rounded-lg bg-red-700 hover:bg-zinc-800 transition-colors hover:border-zinc-400 cursor-pointer"
                        >
                            ดำเนินการต่อ
                        </button>
                    </div>
                )}
            </div>
            <div className='px-1 w-full'>
                <Footer />
            </div>
        </main>
    );
}