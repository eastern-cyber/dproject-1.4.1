// src/app/d1/page.tsx

"use client";
import React, { useEffect, useState } from 'react'
import Image from "next/image";
import { useActiveAccount } from "thirdweb/react";
import dprojectIcon from "../../../public/DProjectLogo_650x600.svg";
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import Footer from '@/components/Footer';
import { defineChain, getContract, toWei, sendTransaction, readContract, prepareTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/confirmModal'; // Reuse the same modal component

// Constants
const RECIPIENT_ADDRESS = "0x3B16949e2fec02E1f9A2557cE7FEBe74f780fADc";
const EXCHANGE_RATE_REFRESH_INTERVAL = 300000; // 5 minutes in ms
const MEMBERSHIP_FEE_THB = 800;
const EXCHANGE_RATE_BUFFER = 0.1; // 0.1 THB buffer to protect against fluctuations
const MINIMUM_PAYMENT = 0.01; // Minimum POL to pay for transaction
const FALLBACK_EXCHANGE_RATE = 4.35; // Fallback rate if all APIs fail

// Exchange rate API endpoints
const EXCHANGE_RATE_APIS = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=thb',
    parser: (data: any) => data?.['matic-network']?.thb
  },
  {
    name: 'Binance',
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=MATICTHB',
    parser: (data: any) => parseFloat(data?.price)
  },
  {
    name: 'Bitkub',
    url: 'https://api.bitkub.com/api/market/ticker?s=THB_MATIC',
    parser: (data: any) => data?.THB_MATIC?.last
  }
];

// Interfaces
interface UserData {
  id: number;
  user_id: string;
  referrer_id: string | null;
  email: string | null;
  name: string | null;
  token_id: string | null;
  plan_a: any | null;
  created_at: string;
  updated_at: string;
}

interface D1Data {
  id: number;
  user_id: string;
  rate_thb_pol: number;
  append_pol: number;
  append_pol_tx_hash: string | null;
  append_pol_date_time: string | null;
  remark: any | null;
  created_at: string;
  updated_at: string;
}

interface BonusData {
  id: number;
  user_id: string;
  pr_a: number;
  pr_b: number;
  cr: number;
  rt: number;
  ar: number;
  bonus_date: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

type TransactionStatus = {
  firstTransaction: boolean;
  secondTransaction: boolean;
  error?: string;
};

export default function PlanB() {
  const account = useActiveAccount();
  const router = useRouter();
  
  // State variables - Following Plan A pattern
  const [userData, setUserData] = useState<UserData | null>(null);
  const [d1Data, setD1Data] = useState<D1Data | null>(null);
  const [bonusData, setBonusData] = useState<BonusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Transaction states - Following Plan A pattern
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    firstTransaction: false,
    secondTransaction: false
  });
  
  // Modal states - Following Plan A pattern
  const [showFirstConfirmationModal, setShowFirstConfirmationModal] = useState(false);
  const [showSecondConfirmationModal, setShowSecondConfirmationModal] = useState(false);
  const [isProcessingFirst, setIsProcessingFirst] = useState(false);
  const [isProcessingSecond, setIsProcessingSecond] = useState(false);
  
  // Data states
  const [firstTxHash, setFirstTxHash] = useState<string>("");
  const [secondTxHash, setSecondTxHash] = useState<string>("");
  const [polBalance, setPolBalance] = useState<string>("0");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [adjustedExchangeRate, setAdjustedExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Fetch exchange rate with multiple fallback APIs - Same as Plan A
  const fetchExchangeRate = async (): Promise<number> => {
    const errors = [];
    
    for (const api of EXCHANGE_RATE_APIS) {
      try {
        console.log(`Trying ${api.name} API...`);
        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`${api.name} responded with status: ${response.status}`);
        }

        const data = await response.json();
        const rate = api.parser(data);

        if (rate && typeof rate === 'number' && rate > 0) {
          console.log(`Successfully got rate from ${api.name}: ${rate}`);
          return rate;
        } else {
          throw new Error(`Invalid rate from ${api.name}: ${rate}`);
        }
      } catch (err) {
        const errorMsg = `${api.name} failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
        continue; // Try next API
      }
    }

    // If all APIs fail, use fallback rate
    console.warn('All exchange rate APIs failed, using fallback rate:', FALLBACK_EXCHANGE_RATE);
    console.warn('Errors:', errors);
    return FALLBACK_EXCHANGE_RATE;
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!account?.address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch user data
        const userResponse = await fetch(`/api/users?user_id=${account.address}`);
        
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          if (errorData.error === 'User not found') {
            setError('ไม่พบข้อมูลผู้ใช้');
            return;
          }
          throw new Error(errorData.error || `HTTP error! status: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        setUserData(userData);

        // Fetch D1 data
        try {
          const d1Response = await fetch(`/api/d1?user_id=${account.address}`);
          if (d1Response.ok) {
            const d1Data = await d1Response.json();
            setD1Data(d1Data);
          }
        } catch (d1Error) {
          console.log('No D1 data found or error fetching:', d1Error);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [account?.address]);

  // Fetch THB to POL exchange rate and calculate adjusted rate - Updated to use new method
  useEffect(() => {
    const updateExchangeRate = async () => {
      try {
        setRateLoading(true);
        const currentRate = await fetchExchangeRate();
        const adjustedRate = Math.max(0.01, currentRate - EXCHANGE_RATE_BUFFER);
        
        setExchangeRate(currentRate);
        setAdjustedExchangeRate(adjustedRate);
        setError(null);
        
        // Show warning if using fallback rate
        if (currentRate === FALLBACK_EXCHANGE_RATE) {
          setError("ใช้อัตราแลกเปลี่ยนสำรอง เนื่องจากไม่สามารถโหลดอัตราปัจจุบันได้");
        }
      } catch (err) {
        console.error("All exchange rate APIs failed:", err);
        // Use fallback rate even if there's an error
        const fallbackAdjustedRate = Math.max(0.01, FALLBACK_EXCHANGE_RATE - EXCHANGE_RATE_BUFFER);
        setExchangeRate(FALLBACK_EXCHANGE_RATE);
        setAdjustedExchangeRate(fallbackAdjustedRate);
        setError("ใช้อัตราแลกเปลี่ยนสำรอง เนื่องจากไม่สามารถโหลดอัตราปัจจุบันได้");
      } finally {
        setRateLoading(false);
      }
    };

    updateExchangeRate();
    const interval = setInterval(updateExchangeRate, EXCHANGE_RATE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Fetch POL balance - Following Plan A pattern
  useEffect(() => {
    const fetchBalance = async () => {
      if (!account) {
        setPolBalance("0");
        return;
      }
      
      try {
        const balanceResult = await readContract({
          contract: getContract({
            client,
            chain: defineChain(polygon),
            address: "0x0000000000000000000000000000000000001010"
          }),
          method: {
            type: "function",
            name: "balanceOf",
            inputs: [{ type: "address", name: "owner" }],
            outputs: [{ type: "uint256" }],
            stateMutability: "view"
          },
          params: [account.address]
        });

        const balanceInPOL = Number(balanceResult) / 10**18;
        setPolBalance(balanceInPOL.toFixed(4));
      } catch (err) {
        console.error("Error fetching POL balance:", err);
        setPolBalance("0");
      }
    };

    if (account) {
      fetchBalance();
    }
  }, [account]);

  // Helper functions
  const calculateRequiredPolAmount = () => {
    if (!adjustedExchangeRate) return null;
    
    const requiredPolFor800THB = MEMBERSHIP_FEE_THB / adjustedExchangeRate;
    const netBonusValue = totalBonus * 0.05;
    
    // If net bonus covers the full amount, pay only minimum
    if (netBonusValue >= requiredPolFor800THB) {
      return MINIMUM_PAYMENT;
    }
    
    // Otherwise, pay the difference
    return requiredPolFor800THB - netBonusValue;
  };

  // Transaction execution - Following Plan A pattern with better error handling
  const executeTransaction = async (to: string, amountWei: bigint) => {
    try {
      // Validate recipient address
      if (!isValidEthereumAddress(to)) {
        return { 
          success: false, 
          error: `Invalid recipient address: ${to}` 
        };
      }

      const transaction = prepareTransaction({
        to,
        value: amountWei,
        chain: defineChain(polygon),
        client,
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: account!
      });

      return { success: true, transactionHash };
    } catch (error: any) {
      console.error("Transaction failed:", error);
      
      let errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("user rejected") || errorMessage.includes("denied transaction")) {
        errorMessage = "User rejected the transaction";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (errorMessage.includes("gas")) {
        errorMessage = "Gas estimation failed";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Database operation - Following Plan A pattern
  const addD1ToDatabase = async (d1Data: any) => {
    try {
      console.log('Sending to D1 API:', d1Data);

      const response = await fetch('/api/d1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(d1Data),
      });

      const responseText = await response.text();
      console.log('D1 API response status:', response.status);
      console.log('D1 API response text:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error adding D1 to database:', error);
      throw error;
    }
  };

  // Main transaction handlers - Following Plan A pattern
  const handleFirstTransaction = async () => {
    if (!account || !adjustedExchangeRate || !userData) return;
    
    setIsProcessingFirst(true);
    setTransactionError(null);

    try {
      const requiredPolAmount = calculateRequiredPolAmount();
      if (requiredPolAmount === null) throw new Error("Unable to calculate required POL amount");

      const requiredAmountWei = toWei(requiredPolAmount.toString());

      // Execute first transaction to recipient
      const firstTransaction = await executeTransaction(RECIPIENT_ADDRESS, requiredAmountWei);
      
      if (!firstTransaction.success) {
        throw new Error(`First transaction failed: ${firstTransaction.error}`);
      }
      
      setFirstTxHash(firstTransaction.transactionHash!);
      setTransactionStatus(prev => ({ ...prev, firstTransaction: true }));
      
      // Close first modal and open second modal
      setShowFirstConfirmationModal(false);
      setShowSecondConfirmationModal(true);

    } catch (err) {
      console.error("First transaction failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingFirst(false);
    }
  };

  const handleSecondTransaction = async () => {
    if (!account || !adjustedExchangeRate || !userData || !firstTxHash) return;
    
    setIsProcessingSecond(true);
    setTransactionError(null);

    try {
      const referrerAddress = getValidReferrerAddress();
      let secondTransactionHash = "";

      // Execute second transaction to referrer if valid address exists
      if (referrerAddress) {
        const minimumAmountWei = toWei(MINIMUM_PAYMENT.toString());
        const secondTransaction = await executeTransaction(referrerAddress, minimumAmountWei);
        
        if (!secondTransaction.success) {
          console.warn('Second transaction failed, but continuing:', secondTransaction.error);
        } else {
          secondTransactionHash = secondTransaction.transactionHash!;
          setSecondTxHash(secondTransactionHash);
          setTransactionStatus(prev => ({ ...prev, secondTransaction: true }));
        }
      }

      // Get current time
      const now = new Date();
      const formattedDate = now.toISOString();

      // Prepare D1 data
      const newD1Data = {
        user_id: account.address,
        rate_thb_pol: parseFloat(adjustedExchangeRate.toFixed(4)),
        append_pol: parseFloat(calculateRequiredPolAmount()?.toFixed(4) || "0"),
        append_pol_tx_hash: firstTxHash,
        append_pol_date_time: formattedDate,
        remark: {
          net_bonus_used: totalBonus * 0.05,
          referrer_transaction: referrerAddress ? {
            amount: MINIMUM_PAYMENT,
            tx_hash: secondTransactionHash,
            date_time: formattedDate
          } : null,
          total_amount_thb: MEMBERSHIP_FEE_THB,
          timestamp: formattedDate
        }
      };

      // Save to database
      console.log('Adding D1 data to database...');
      const dbResult = await addD1ToDatabase(newD1Data);
      
      if (dbResult && dbResult.user_id) {
        setD1Data(dbResult);
        setIsTransactionComplete(true);
        setShowSecondConfirmationModal(false);
        
        // Redirect to user page after successful completion
        router.push(`/plan-b/${account.address}`);
      } else {
        throw new Error('Failed to save to database');
      }

    } catch (err) {
      console.error("Second transaction or database update failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingSecond(false);
    }
  };

  // Modal handlers - Following Plan A pattern
  const handleCloseFirstModal = () => {
    if (transactionStatus.firstTransaction) {
      return; // Don't allow closing if transaction is completed
    }
    setShowFirstConfirmationModal(false);
    setTransactionError(null);
  };

  const handleCloseSecondModal = () => {
    if (transactionStatus.secondTransaction) {
      return; // Don't allow closing if transaction is completed
    }
    setShowSecondConfirmationModal(false);
    setTransactionError(null);
  };

  // Bonus data and calculations
  const fetchBonusData = async () => {
    if (!account?.address) return;

    try {
      const bonusResponse = await fetch(`/api/bonus?user_id=${account.address}`);
      if (bonusResponse.ok) {
        const bonusData = await bonusResponse.json();
        const processedBonusData = bonusData.map((bonus: BonusData) => ({
          ...bonus,
          pr_a: Number(bonus.pr_a),
          pr_b: Number(bonus.pr_b),
          cr: Number(bonus.cr),
          rt: Number(bonus.rt),
          ar: Number(bonus.ar)
        }));
        setBonusData(processedBonusData);
      }
    } catch (bonusError) {
      console.error('Error fetching bonus data:', bonusError);
      setBonusData([]);
    }
  };

  const handleJoinPlanB = () => {
    setShowFirstConfirmationModal(true);
    fetchBonusData();
  };

  // Utility functions
  const isValidEthereumAddress = (address: string | null | undefined): boolean => {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getValidReferrerAddress = (): string | null => {
    if (!userData || !userData.referrer_id) return null;
    const referrerAddress = userData.referrer_id.trim();
    return isValidEthereumAddress(referrerAddress) ? referrerAddress : null;
  };

  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(4);
  };

  const formatAddressForDisplay = (address: string | null | undefined): string => {
    if (!address) return "ไม่มี";
    if (!isValidEthereumAddress(address)) return "ไม่ถูกต้อง";
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  // Calculations
  const isPlanA = userData?.plan_a !== null;
  const isPlanB = d1Data !== null;
  const totalBonus = bonusData.reduce((total, bonus) => total + 
    (Number(bonus.pr_a) || 0) + 
    (Number(bonus.pr_b) || 0) + 
    (Number(bonus.cr) || 0) + 
    (Number(bonus.rt) || 0) + 
    (Number(bonus.ar) || 0), 0);

  const netBonus = totalBonus * 0.05;

  return (
    <main className="p-4 pb-10 min-h-[100vh] flex flex-col items-center">
      <div className="flex flex-col items-center justify-center p-5 m-5 border border-gray-800 rounded-lg">
        <Link href="/" passHref>
          <Image
            src={dprojectIcon}
            alt=""
            className="mb-4 size-[100px] md:size-[100px]"
            style={{ filter: "drop-shadow(0px 0px 24px #a726a9a8" }}
          />
        </Link>

        <h1 className="p-4 text-1xl md:text-3xl text-2xl font-semibold md:font-bold tracking-tighter">
          ยืนยันการเข้าร่วม Plan B D1
        </h1>
        
        <div className="flex justify-center mb-2">
          <WalletConnect />
        </div>

        {loading && account?.address && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p className="text-amber-500">Warning: {error}</p>
          </div>
        )}

        {userData && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center mt-10">
            <span className={`m-2 text-[22px] font-bold ${isPlanB ? "text-green-600" : "text-red-600"}`}>
              {isPlanB ? "ท่านเป็นสมาชิก Plan B D1 เรียบร้อยแล้ว" : "ท่านยังไม่ได้เป็นสมาชิก Plan B D1"}
            </span>
            
            <div className="flex flex-col m-2 text-gray-200 text-[16px] text-left">
              <p className="text-[20px] font-bold">รายละเอียดสมาชิก</p>
              เลขกระเป๋า: {userData.user_id}<br />
              อีเมล: {userData.email || 'ไม่มีข้อมูล'}<br />
              ชื่อ: {userData.name || 'ไม่มีข้อมูล'}<br />
              เข้า Plan A: {isPlanA ? "ใช่" : "ไม่ใช่"}<br />
              PR by: {formatAddressForDisplay(userData.referrer_id)}<br />
            </div>

            {!isPlanB && userData && (
              <div className="w-full mt-6">
                <button
                  onClick={handleJoinPlanB}
                  className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                  disabled={!account}
                >
                  {!account ? "กรุณาเชื่อมต่อกระเป๋า" : "ยืนยันเข้าร่วม Plan B D1"}
                </button>
              </div>
            )}
          </div>
        )}

        {!account?.address && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p>กรุณาเชื่อมต่อกระเป๋า</p>
          </div>
        )}
        
        <WalletPublicKey walletAddress={account?.address || ""}/>
      </div>

      {/* First Confirmation Modal - Following Plan A pattern */}
      {showFirstConfirmationModal && (
        <ConfirmModal 
          onClose={handleCloseFirstModal}
          disableClose={isProcessingFirst || transactionStatus.firstTransaction}
        >
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">ยืนยันการเข้าร่วม Plan B D1</h3>
            <div className="mb-6 text-center">
              <p className="text-[18px] text-gray-200">
                ค่าสมาชิก Plan B D1<br />
                <span className="text-yellow-500 text-[22px] font-bold">
                  {MEMBERSHIP_FEE_THB} THB
                </span>
              </p>
              
              {adjustedExchangeRate && (
                <div className="mt-3 text-sm text-gray-300">
                  <p>อัตราแลกเปลี่ยน: {adjustedExchangeRate.toFixed(4)} THB/POL</p>
                  <p>คิดเป็นมูลค่า: {(MEMBERSHIP_FEE_THB / adjustedExchangeRate).toFixed(4)} POL</p>
                </div>
              )}

              <div className="mt-4">
                <p className="font-semibold">ยอดสะสมสุทธิของท่าน:</p>
                <p className="text-2xl text-green-600 font-bold">
                  {formatNumber(netBonus)} POL
                </p>
                <p className="text-sm text-gray-500">
                  (5% ของโบนัสทั้งหมด: {formatNumber(totalBonus)} POL)
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold">จำนวนที่ต้องชำระ:</p>
                <p className="text-xl text-blue-500 font-bold">
                  {formatNumber(calculateRequiredPolAmount())} POL
                </p>
              </div>

              {account && (
                <p className="mt-3 text-[16px] text-gray-200">
                  POL ในกระเป๋าของคุณ: <span className="text-green-400">{polBalance}</span>
                </p>
              )}

              {account && parseFloat(polBalance) < (calculateRequiredPolAmount() || 0) && (
                <p className="mt-2 text-red-400 text-sm">
                  ⚠️ จำนวน POL ในกระเป๋าของคุณไม่เพียงพอ
                </p>
              )}

              {transactionError && (
                <p className="mt-3 text-red-400 text-sm">
                  {transactionError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                className={`px-6 py-3 rounded-lg font-medium text-[17px] ${
                  !account || parseFloat(polBalance) < (calculateRequiredPolAmount() || 0) || isProcessingFirst
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 cursor-pointer"
                }`}
                onClick={handleFirstTransaction}
                disabled={!account || isProcessingFirst || parseFloat(polBalance) < (calculateRequiredPolAmount() || 0)}
              >
                {isProcessingFirst ? 'กำลังดำเนินการ...' : 'ยืนยันการโอน'}
              </button>
              <button
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={handleCloseFirstModal}
                disabled={isProcessingFirst || transactionStatus.firstTransaction}
              >
                {transactionStatus.firstTransaction ? 'ดำเนินการต่อ' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Second Confirmation Modal - For referrer transaction */}
      {showSecondConfirmationModal && (
        <ConfirmModal 
          onClose={handleCloseSecondModal}
          disableClose={isProcessingSecond || transactionStatus.secondTransaction}
        >
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">ยืนยันการโอนให้ผู้แนะนำ</h3>
            <div className="mb-6 text-center">
              <p className="text-[18px] text-gray-200">
                โอนค่าสมาชิกส่วนที่ 2<br />
                <span className="text-yellow-500 text-[22px] font-bold">
                  {MINIMUM_PAYMENT} POL
                </span>
                <p className="text-[16px] mt-2 text-gray-200">ไปยังผู้แนะนำ</p>
              </p>
              
              {userData?.referrer_id && (
                <p className="text-sm text-gray-300 mt-2">
                  ผู้แนะนำ: {formatAddressForDisplay(userData.referrer_id)}
                </p>
              )}

              <p className="text-sm text-green-400 mt-4">
                ✅ การโอนครั้งที่ 1 สำเร็จแล้ว
              </p>

              {transactionError && (
                <p className="mt-3 text-red-400 text-sm">
                  {transactionError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                className={`px-6 py-3 rounded-lg font-medium text-[17px] ${
                  isProcessingSecond ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 cursor-pointer"
                }`}
                onClick={handleSecondTransaction}
                disabled={isProcessingSecond}
              >
                {isProcessingSecond ? 'กำลังดำเนินการ...' : 'ยืนยันการโอนครั้งที่ 2'}
              </button>
              <button
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={handleCloseSecondModal}
                disabled={isProcessingSecond || transactionStatus.secondTransaction}
              >
                {transactionStatus.secondTransaction ? 'เสร็จสิ้น' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </ConfirmModal>
      )}

      <div className='px-1 w-full'>
        <Footer />
      </div>
    </main>
  )
}

// WalletPublicKey component (keep as is)
const WalletPublicKey: React.FC<{ walletAddress?: string }> = ({ walletAddress }) => {
  const handleCopy = () => {
    const link = `https://dfi.fund/referrer/${walletAddress}`;
    navigator.clipboard.writeText(link);
    alert("ลิ้งค์ถูกคัดลอกไปยังคลิปบอร์ดแล้ว!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", fontSize: "24px", paddingTop: "15px" }}>
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
      </div>
    </div>
  )
};