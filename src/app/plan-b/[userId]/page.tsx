// src/app/plan-b/[userId]/page.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dprojectIcon from "../../../../public/DProjectLogo_650x600.svg";
import WalletConnect from "@/components/WalletConnect";
import Footer from "@/components/Footer";

interface UserData {
  user_id?: string;
  email?: string;
  name?: string;
  token_id?: string;
  referrer_id?: string;
  created_at?: string;
}

interface PlanBData {
  id: number;
  user_id: string;
  pol: number;
  date_time: string;
  link_ipfs: string;
  rate_thb_pol: number;
  cumulative_pol: number;
  append_pol: number;
  append_tx_hash: string;
  append_pol_date_time: string;
  created_at: string;
  updated_at: string;
}

type ReferrerData = {
  var1: string;
  var2: string;
  var3: string;
  var4: string;
};

export default function UserDetails({ params }: { params: Promise<{ userId: string }> }) {
    const [resolvedParams, setResolvedParams] = useState<{ userId: string }>({ userId: '' });
    const [referrerData, setReferrerData] = useState<ReferrerData | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [planBData, setPlanBData] = useState<PlanBData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const _router = useRouter();

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setResolvedParams(resolved);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        const fetchData = async () => {
            if (!resolvedParams.userId) return;

            try {
                setLoading(true);
                setError(null);
                
                // Fetch the NEW USER's data from the database using your existing API
                const userResponse = await fetch(`/api/users?user_id=${resolvedParams.userId}`);

                if (!userResponse.ok) {
                    if (userResponse.status === 404) {
                        throw new Error("ไม่พบข้อมูลผู้ใช้งานในระบบ");
                    }
                    throw new Error(`HTTP error! status: ${userResponse.status}`);
                }
                
                const userDataFromApi = await userResponse.json();
                setUserData(userDataFromApi);
                
                // Fetch Plan B data
                try {
                  const planBResponse = await fetch(`/api/plan-b?user_id=${resolvedParams.userId}`);
                  if (planBResponse.ok) {
                    const planBData = await planBResponse.json();
                    console.log('Plan B data:', planBData);
                    setPlanBData(planBData);
                  }
                } catch (planBError) {
                  console.log('No Plan B data found or error fetching:', planBError);
                }
                
                // Try to get referrer data from sessionStorage (from the previous page)
                const storedData = sessionStorage.getItem("mintingsData");
                
                if (storedData) {
                    try {
                        const parsedData = JSON.parse(storedData);
                        setReferrerData({
                            var1: parsedData.var1 || "",
                            var2: parsedData.var2 || "ไม่พบข้อมูล",
                            var3: parsedData.var3 || "ไม่พบข้อมูล",
                            var4: parsedData.var4 || "ไม่พบข้อมูล"
                        });
                    } catch (parseError) {
                        console.error("Error parsing session data:", parseError);
                    }
                }
                
            } catch (error) {
                console.error("Error fetching data:", error);
                setError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
                
                // Fallback: at least show the wallet address from URL
                setUserData({
                    user_id: resolvedParams.userId,
                    email: "ไม่สามารถโหลดข้อมูล",
                    name: "ไม่สามารถโหลดข้อมูล",
                    token_id: "ไม่สามารถโหลดข้อมูล"
                });
            } finally {
                setLoading(false);
            }
        };

        if (resolvedParams.userId) {
            fetchData();
        }
    }, [resolvedParams.userId]);

    // Function to format wallet address
    const formatWalletAddress = (address: string) => {
        if (!address) return "ไม่พบกระเป๋า";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Format date for display
    const formatDate = (dateString: string) => {
      if (!dateString) return 'ไม่มีข้อมูล';
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Format number for display
    const formatNumber = (value: number | string | null | undefined): string => {
      if (value === null || value === undefined) return '0.00';
      
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    return (
        <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center bg-gray-950">
            <div className="flex flex-col items-center justify-center p-6 md:p-10 m-2 md:m-5 border border-gray-800 rounded-lg max-w-md w-full">
                <Link href="/" passHref>
                    <Image
                        src={dprojectIcon}
                        alt="DProject Logo"
                        className="mb-4 size-[80px] md:size-[100px]"
                        style={{
                            filter: "drop-shadow(0px 0px 24px #a726a9a8)",
                        }}
                    />
                </Link>
                <h1 className="p-4 text-2xl font-semibold md:font-bold tracking-tighter text-center">
                    D Project
                </h1>
                <div className="flex justify-center m-3">
                    <WalletConnect />
                </div>
                <div className="flex flex-col items-center justify-center p-2 m-2">
                    <p className="flex flex-col items-center justify-center text-[18px] text-gray-200 m-2 text-center">
                        <b>ขอแสดงความยินดี การยืนยัน Plan B ของท่าน เสร็จสมบูรณ์แล้ว</b>
                    </p>
                    
                    
                    {/* Display current user's wallet address and information */}
                    <div className="mt-6 p-4 border border-gray-600 bg-gray-800 rounded-lg w-full">
                        <p className="text-[16px] text-center text-gray-300 mb-4">
                            <b>ข้อมูลสมาชิก Plan B</b>
                        </p>
                        
                        <div className="space-y-3">
                            <p className="text-[15px] text-gray-300">
                                <b>เลขกระเป๋าของคุณ:</b>
                                <span className="text-green-400 ml-2 break-all block mt-1">
                                    {userData?.user_id || resolvedParams.userId || "ไม่พบกระเป๋า"}
                                </span>
                            </p>
                            
                            <p className="text-[15px] text-gray-300">
                                <b>อีเมล:</b>
                                <span className="text-blue-400 ml-2 block mt-1">
                                    {userData?.email || "ไม่พบข้อมูล"}
                                </span>
                            </p>
                            
                            <p className="text-[15px] text-gray-300">
                                <b>ชื่อ:</b>
                                <span className="text-yellow-400 ml-2 block mt-1">
                                    {userData?.name || "ไม่พบข้อมูล"}
                                </span>
                            </p>
                            
                            <p className="text-[15px] text-gray-300">
                                <b>Token ID:</b>
                                <span className="text-red-400 ml-2 block mt-1">
                                    {userData?.token_id || "ไม่พบข้อมูล"}
                                </span>
                            </p>
                            
                            <div className="pt-3 border-t border-gray-600">
                                <p className="text-[15px] text-gray-300 mb-2">
                                    <b>ลิ้งค์แนะนำของท่าน:</b>
                                </p>
                                <div className="bg-gray-700 p-2 rounded border border-gray-500">
                                    <p className="text-[13px] text-blue-300 break-all text-center">
                                        https://dfi.fund/referrer/{userData?.user_id || resolvedParams.userId || "ไม่พบกระเป๋า"}
                                    </p>
                                    <button
                                        onClick={() => {
                                            const link = `https://dfi.fund/referrer/${userData?.user_id || resolvedParams.userId}`;
                                            navigator.clipboard.writeText(link);
                                            alert('คัดลอกลิ้งค์เรียบร้อยแล้ว!');
                                        }}
                                        className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[12px] rounded"
                                    >
                                        คัดลอกลิ้งค์
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Display Plan B details if available */}
                    {planBData && (
                      <div className="w-full mt-4 p-3 border border-green-500 rounded-lg">
                        <h3 className="p-4 text-[24px] text-green-400 text-center">รายละเอียด Plan B</h3>
                        <div className="space-y-2">
                          <p className="text-[15px] text-gray-300">
                            <b>Cumulative POL:</b> 
                            <span className="text-yellow-400 ml-2">{formatNumber(planBData.cumulative_pol)}</span>
                          </p>
                          <p className="text-[15px] text-gray-300">
                            <b>Append POL:</b> 
                            <span className="text-yellow-400 ml-2">{formatNumber(planBData.append_pol)}</span>
                          </p>
                          <p className="text-[15px] text-gray-300">
                            <b>Rate:</b> 
                            <span className="text-yellow-400 ml-2">{formatNumber(planBData.rate_thb_pol)} THB/POL</span>
                          </p>
                          <p className="text-[15px] text-gray-300">
                            <b>วันที่เข้าร่วม:</b> 
                            <span className="text-yellow-400 ml-2">{formatDate(planBData.date_time)}</span>
                          </p>
                          {planBData.append_tx_hash && (
                            <p className="text-[13px] text-gray-400 break-all">
                              <b>Tx Hash:</b> {planBData.append_tx_hash.substring(0, 20)}...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
                
                {!loading && (
                    <div className="flex flex-col items-center mt-6">
                        <Link 
                            href="/"
                            className="px-6 py-3 border border-zinc-100 rounded-lg bg-red-700 hover:bg-red-800 transition-colors hover:border-zinc-400 text-center"
                        >
                            กลับสู่หน้าหลัก
                        </Link>
                    </div>
                )}
            </div>
            <div className='w-full mt-8'>
                <Footer />
            </div>
        </main>
    );
}