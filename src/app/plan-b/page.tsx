// src/app/plan-b/page.tsx

"use client";
import React, { useEffect, useState } from 'react'
import Image from "next/image";
import { useActiveAccount } from "thirdweb/react";
import dprojectIcon from "../../../public/DProjectLogo_650x600.svg";
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import Footer from '@/components/Footer';
// Add these imports near the other thirdweb imports
import { defineChain, getContract, prepareContractCall, toWei, sendTransaction, readContract, prepareTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
// Import the useRouter hook at the top of your file
import { useRouter } from 'next/navigation';

// Add these constants at the top of the file, after the imports
const RECIPIENT_ADDRESS = "0x65446A43C63033963c5dae4eE40fAff253d3c915";
const EXCHANGE_RATE_REFRESH_INTERVAL = 300000; // 5 minutes in ms
const MEMBERSHIP_FEE_THB = 800;
const EXCHANGE_RATE_BUFFER = 0.1; // 0.1 THB buffer to protect against fluctuations
const MINIMUM_PAYMENT = 0.01; // Minimum POL to pay for transaction

interface UserData {
  id: number;
  user_id: string;
  referrer_id: string | null;
  email: string | null;
  name: string | null;
  token_id: string | null;
  plan_a: {
    dateTime?: string;
    POL?: number;
    rateTHBPOL?: number;
    txHash?: string;
    joined?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

interface PlanBData {
  id: number;
  user_id: string;
  rate_thb_pol: number;
  cumulative_pol: number;
  append_pol: number;
  append_pol_tx_hash: string;
  append_pol_date_time: string;
  pr_pol: number;
  pr_pol_tx_hash: string | null;
  pr_pol_date_time: string | null;
  link_ipfs: string | null;
  d1: number;
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

export default function PremiumArea() {
  const account = useActiveAccount();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [planBData, setPlanBData] = useState<PlanBData | null>(null);
  const [bonusData, setBonusData] = useState<BonusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Add these state variables to the component
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [adjustedExchangeRate, setAdjustedExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [polBalance, setPolBalance] = useState<string>("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [appendTxHash, setAppendTxHash] = useState<string>("");
  const [prTxHash, setPrTxHash] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Add this state variable
  const [maticBalance, setMaticBalance] = useState(0);

  // Inside the component function, initialize the router
  const router = useRouter();

  // Add this useEffect to check MATIC balance
  useEffect(() => {
    const checkBalance = async () => {
      if (account) {
        const balance = await checkMaticBalance();
        setMaticBalance(balance);
      }
    };
    
    checkBalance();
  }, [account]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!account?.address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching user data for wallet:', account.address);
        
        // Fetch user data
        const userResponse = await fetch(`/api/users?user_id=${account.address}`);
        
        console.log('API response status:', userResponse.status);
        
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          console.error('API error response:', errorData);
          
          if (errorData.error === 'User not found') {
            setError('ไม่พบข้อมูลผู้ใช้');
            return;
          }
          throw new Error(errorData.error || `HTTP error! status: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        console.log('User data:', userData);
        setUserData(userData);

        // Fetch Plan B data
        try {
          const planBResponse = await fetch(`/api/plan-b?user_id=${account.address}`);
          if (planBResponse.ok) {
            const planBData = await planBResponse.json();
            console.log('Plan B data:', planBData);
            setPlanBData(planBData);
          }
        } catch (planBError) {
          console.log('No Plan B data found or error fetching:', planBError);
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

  const fetchBonusData = async () => {
    if (!account?.address) return;

    try {
      setModalLoading(true);
      const bonusResponse = await fetch(`/api/bonus?user_id=${account.address}`);
      
      if (bonusResponse.ok) {
        const bonusData = await bonusResponse.json();
        console.log('Raw bonus API response:', bonusData);
        
        // Convert all numeric fields to numbers to ensure proper calculation
        const processedBonusData = bonusData.map((bonus: BonusData) => ({
          ...bonus,
          pr_a: Number(bonus.pr_a),
          pr_b: Number(bonus.pr_b),
          cr: Number(bonus.cr),
          rt: Number(bonus.rt),
          ar: Number(bonus.ar)
        }));
        
        console.log('Processed bonus data:', processedBonusData);
        
        // Debug: check individual values
        processedBonusData.forEach((bonus: BonusData, index: number) => {
          console.log(`Bonus ${index}:`, {
            pr_a: bonus.pr_a,
            pr_b: bonus.pr_b,
            cr: bonus.cr,
            rt: bonus.rt,
            ar: bonus.ar,
            total: bonus.pr_a + bonus.pr_b + bonus.cr + bonus.rt + bonus.ar
          });
        });
        
        setBonusData(processedBonusData);
      } else {
        console.log('No bonus data found');
        setBonusData([]);
      }
    } catch (bonusError) {
      console.error('Error fetching bonus data:', bonusError);
      setBonusData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoinPlanB = () => {
    setShowModal(true);
    fetchBonusData();
  };

// Add this helper function for retrying transactions before the confirmJoinPlanB function
const executeWithRetry = async (transactionFn: () => Promise<any>, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await transactionFn();
      if (result.success) return result;
      
      // Wait before retrying
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retry attempts failed");
};

// Update the confirmJoinPlanB function with better error handling
// Update the confirmJoinPlanB function to handle database errors gracefully
const confirmJoinPlanB = async () => {
  if (!account || !adjustedExchangeRate || !userData) return;
  
  setIsProcessing(true);
  setTransactionError(null);

  try {
    const requiredPolAmount = calculateRequiredPolAmount();
    if (requiredPolAmount === null) throw new Error("Unable to calculate required POL amount");

    const requiredAmountWei = toWei(requiredPolAmount.toString());
    const minimumAmountWei = toWei(MINIMUM_PAYMENT.toString());

    // Execute first transaction to recipient
    console.log('Executing first transaction...');
    const firstTransaction = await executeTransaction(RECIPIENT_ADDRESS, requiredAmountWei);
    
    if (!firstTransaction.success) {
      throw new Error(`First transaction failed: ${firstTransaction.error}`);
    }
    
    setAppendTxHash(firstTransaction.transactionHash!);
    console.log('First transaction successful:', firstTransaction.transactionHash);

    // Execute second transaction to referrer (always 0.01 POL)
    let secondTransactionHash = "";
    const referrerAddress = getValidReferrerAddress();

    if (referrerAddress) {
      console.log('Executing second transaction to referrer:', referrerAddress);
      try {
        const secondTransaction = await executeWithRetry(
          () => executeTransaction(referrerAddress, minimumAmountWei)
        );
        
        if (!secondTransaction.success) {
          console.warn('Second transaction failed, but continuing:', secondTransaction.error);
        } else {
          secondTransactionHash = secondTransaction.transactionHash!;
          setPrTxHash(secondTransactionHash);
          console.log('Second transaction successful:', secondTransactionHash);
        }
      } catch (error) {
        console.warn('Second transaction failed, but continuing:', error);
      }
    } else {
      console.log('No valid referrer address, skipping second transaction');
    }

    // Get current time
    const now = new Date();
    const formattedDate = now.toISOString();

    // Store report in IPFS (optional - can be skipped if it fails)
    let ipfsHash = "";
    let ipfsLink = "";
    try {
      const report = {
        senderAddress: account.address,
        dateTime: formattedDate,
        requiredPolAmount: requiredPolAmount,
        netBonusUsed: netBonus,
        transactions: [
          {
            recipient: RECIPIENT_ADDRESS,
            amountPOL: requiredPolAmount,
            transactionHash: firstTransaction.transactionHash
          },
          ...(userData.referrer_id ? [{
            recipient: userData.referrer_id,
            amountPOL: MINIMUM_PAYMENT,
            transactionHash: secondTransactionHash
          }] : [])
        ],
        totalAmountTHB: MEMBERSHIP_FEE_THB,
        exchangeRate: adjustedExchangeRate
      };

      ipfsHash = await storeReportInIPFS(report);
      ipfsLink = ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : "";
    } catch (ipfsError) {
      console.warn('IPFS storage failed, continuing without it:', ipfsError);
    }

    // Try to add to database, but don't fail the whole process if it errors
    try {
      const newPlanB = {
        user_id: account.address,
        rate_thb_pol: adjustedExchangeRate,
        cumulative_pol: netBonus,
        append_pol: requiredPolAmount,
        append_tx_hash: firstTransaction.transactionHash!,
        date_time: formattedDate,
        pr_pol: referrerAddress ? MINIMUM_PAYMENT : 0,
        pr_pol_tx_hash: referrerAddress ? secondTransactionHash : "",
        pr_pol_date_time: referrerAddress ? formattedDate : null,
        link_ipfs: ipfsLink || ""
      };

      console.log('Adding Plan B to database...');
      if (process.env.NODE_ENV === 'development') {
        await addPlanBToDatabaseDev(newPlanB);
      } else {
        await addPlanBToDatabase(newPlanB);
      }
      console.log('Database update successful');
    } catch (dbError) {
      console.warn('Database update failed, but continuing:', dbError);
      // Don't throw error - just log it and continue
    }

    // Show success modal regardless of database result
    setShowSuccessModal(true);
    setShowModal(false);
    
  } catch (err) {
    console.error("Plan B transaction failed:", err);
    setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
  } finally {
    setIsProcessing(false);
  }
};

  // Check if user is in Plan A
  const isPlanA = userData?.plan_a !== null && userData?.plan_a !== undefined;

  // Check if user is in Plan B (using the separate plan_b table)
  const isPlanB = planBData !== null;



  // Calculate total bonus - sum of ALL bonus components
  const totalBonus = bonusData.reduce((total, bonus) => {
    return total + 
          (Number(bonus.pr_a) || 0) + 
          (Number(bonus.pr_b) || 0) + 
          (Number(bonus.cr) || 0) + 
          (Number(bonus.rt) || 0) + 
          (Number(bonus.ar) || 0);
  }, 0);

  const netBonus = totalBonus * 0.05; // 5% of total bonus

  // Add this useEffect to fetch exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=thb"
        );
        if (!response.ok) throw new Error("Failed to fetch exchange rate");
        
        const data = await response.json();
        const currentRate = data["matic-network"].thb;
        const adjustedRate = Math.max(0.01, currentRate - EXCHANGE_RATE_BUFFER);
        
        setExchangeRate(currentRate);
        setAdjustedExchangeRate(adjustedRate);
        setRateError(null);
      } catch (err) {
        setRateError("ไม่สามารถโหลดอัตราแลกเปลี่ยนได้");
        console.error("Error fetching exchange rate:", err);
      } finally {
        setRateLoading(false);
      }
    };

    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, EXCHANGE_RATE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Add this useEffect to fetch wallet balance
  // Update the useEffect that fetches POL balance
  // Update the balance checking function to use the correct method
  useEffect(() => {
    const fetchBalance = async () => {
      if (!account) {
        setPolBalance("0");
        return;
      }
      
      try {
        // For native POL balance, use the balanceOf function on the POL contract
        const balanceResult = await readContract({
          contract: getContract({
            client,
            chain: defineChain(polygon),
            address: "0x0000000000000000000000000000000000001010" // Native POL contract
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

  // Add this function to calculate the required POL amount
  const calculateRequiredPolAmount = () => {
  if (!adjustedExchangeRate) return null;
  
  const requiredPolFor800THB = MEMBERSHIP_FEE_THB / adjustedExchangeRate;
  const netBonusValue = Number(netBonus) || 0; // Ensure it's a number, default to 0
  
  // If net bonus covers the full amount, pay only minimum
  if (netBonusValue >= requiredPolFor800THB) {
    return MINIMUM_PAYMENT;
  }
  
  // Otherwise, pay the difference
  return requiredPolFor800THB - netBonusValue;
};

  // Add this function to execute POL transactions
  // Replace the executeTransaction function with this improved version
  // Update the executeTransaction function to handle invalid addresses better
  // Update the executeTransaction function with the correct POL token contract address
  // Update the executeTransaction function to handle native POL transfers correctly
  // Update the executeTransaction function to properly handle native POL transfers
  const executeTransaction = async (to: string, amountWei: bigint) => {
    try {
      // Validate recipient address first
      if (!isValidEthereumAddress(to)) {
        return { 
          success: false, 
          error: `Invalid recipient address: ${to}` 
        };
      }

      // For native POL transfers, we need to use prepareTransaction
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
      
      // Extract more detailed error message
      let errorMessage = error.message || "Unknown error";
      
      // Check for common error cases
      if (errorMessage.includes("user rejected") || errorMessage.includes("denied transaction")) {
        errorMessage = "User rejected the transaction";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (errorMessage.includes("gas")) {
        errorMessage = "Gas estimation failed";
      } else if (errorMessage.includes("invalid address") || errorMessage.includes("Invalid address")) {
        errorMessage = "Invalid recipient address";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Add this function to check MATIC balance
  const checkMaticBalance = async () => {
    if (!account) return 0;
    
    try {
      const balance = await readContract({
        contract: getContract({
          client,
          chain: defineChain(polygon),
          address: "0x0000000000000000000000000000000000001010" // MATIC token contract
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
      
      return Number(balance) / 10**18; // Convert from wei to MATIC
    } catch (error) {
      console.error("Error checking MATIC balance:", error);
      return 0;
    }
  };

  // Add this function to store data in IPFS
  const storeReportInIPFS = async (report: unknown) => {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
        },
        body: JSON.stringify({
          pinataContent: report,
          pinataMetadata: {
            name: `plan-b-payment-${Date.now()}.json`
          }
        })
      });

      if (!response.ok) throw new Error('Failed to store report in IPFS');
      
      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error("Error storing report in IPFS:", error);
      throw error;
    }
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

  // Add this function to add Plan B data to database
  // Replace the addPlanBToDatabase function with this:
  // Simplified function to add Plan B data
  // Inside src/app/plan-b/page.tsx
  // Simplified function to add Plan B data with all required fields
  // Enhanced function to add Plan B data with better error handling
  const addPlanBToDatabase = async (planBData: any) => {
    try {
      // Prepare data with all required fields
      const completeData = {
        user_id: planBData.user_id,
        rate_thb_pol: planBData.rate_thb_pol || 0,
        cumulative_pol: planBData.cumulative_pol || 0,
        append_pol: planBData.append_pol || 0,
        append_tx_hash: planBData.append_tx_hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
        append_pol_date_time: planBData.date_time || new Date().toISOString(),
        pr_pol: planBData.pr_pol || 0,
        pr_pol_tx_hash: planBData.pr_pol_tx_hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
        pr_pol_date_time: planBData.pr_pol_date_time || new Date().toISOString(),
        link_ipfs: planBData.link_ipfs || '',
        d1: 1 // Set d1 to 1 as requested
      };

      console.log('Sending to API:', completeData);

      const response = await fetch('/api/plan-b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeData),
      });

      const responseText = await response.text();
      console.log('API response status:', response.status);
      console.log('API response text:', responseText);

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
      console.error('Error adding Plan B to database:', error);
      throw error;
    }
  };

  // Development version with all required fields
  const addPlanBToDatabaseDev = async (planBData: any) => {
    console.log('Simulating database insert for development:', {
      ...planBData,
      d1: 1,
      // Add other default values for development
      append_tx_hash: planBData.append_tx_hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      append_pol_date_time: planBData.date_time || new Date().toISOString(),
      pr_pol: planBData.pr_pol || 0,
      pr_pol_tx_hash: planBData.pr_pol_tx_hash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      pr_pol_date_time: planBData.pr_pol_date_time || new Date().toISOString(),
    });
    return { ...planBData, id: Math.floor(Math.random() * 1000), d1: 1 };
  };

  // Add this helper function to validate Ethereum addresses
  const isValidEthereumAddress = (address: string | null | undefined): boolean => {
    if (!address) return false;
    // Basic Ethereum address validation (starts with 0x and has 42 characters)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Add this function to get a valid referrer address or null
  const getValidReferrerAddress = (): string | null => {
    if (!userData || !userData.referrer_id) return null;
    
    const referrerAddress = userData.referrer_id.trim();
    return isValidEthereumAddress(referrerAddress) ? referrerAddress : null;
  };

  // Add this function to format addresses for display
  const formatAddressForDisplay = (address: string | null | undefined): string => {
    if (!address) return "ไม่มี";
    if (!isValidEthereumAddress(address)) return "ไม่ถูกต้อง";
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

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
          ยืนยันการเข้าร่วม Plan B
        </h1>
        <div className="flex justify-center mb-2">
          <WalletConnect />
        </div>

        {loading && account?.address && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p>กำลังโหลดข้อมูล...</p>
            <p className="text-sm mt-2">Wallet: {account.address.substring(0, 10)}...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p className="text-red-500">Error: {error}</p>
            {account?.address && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                <p className="text-sm font-mono break-all">
                  Wallet: {account.address}
                </p>
              </div>
            )}
            <p className="text-[19px] mt-4">
              หากท่านเป็นสมาชิกใหม่ <br />
              กรุณาติดต่อผู้แนะนำ
            </p>
          </div>
        )}

        {userData && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center mt-10">
            <span className="m-2 text-[#eb1c24] text-[22px] animate-blink font-bold">
              {isPlanB ? "ท่านเป็นสมาชิก Plan B เรียบร้อยแล้ว" : "ท่านยังไม่ได้เป็นสมาชิก Plan B"}
            </span>
            <div className="flex flex-col m-2 text-gray-200 text-[16px] text-left ">
            <p className="text-underline text-[20px] text-bold">รายละเอียดสมาชิก</p>
            เลขกระเป๋า: {userData.user_id}<br />
            อีเมล: {userData.email || 'ไม่มีข้อมูล'}<br />
            ชื่อ: {userData.name || 'ไม่มีข้อมูล'}<br />
            เข้า Plan A: {isPlanA ? "ใช่" : "ไม่ใช่"}<br />
            Token ID: {userData.token_id || 'ไม่มีข้อมูล'}<br />
            PR by: {formatAddressForDisplay(userData.referrer_id)}<br />
            </div>
            
            {/* Display Plan A details if available */}
            {isPlanA && userData.plan_a && (
              <div className="w-full mt-4 p-3 border border-blue-500 rounded-lg">
                <h3 className="p-4 text-blue-400 text-[24px]">รายละเอียด Plan A</h3>
                <p>POL: {formatNumber(userData.plan_a.POL)}</p>
                <p>Rate: {formatNumber(userData.plan_a.rateTHBPOL)} THB/POL</p>
                <p>วันที่: {userData.plan_a.dateTime ? formatDate(userData.plan_a.dateTime) : 'N/A'}</p>
                {userData.plan_a.txHash && (
                  <p className="text-xs font-mono">Tx: {userData.plan_a.txHash.substring(0, 20)}...</p>
                )}
              </div>
            )}
            
            {/* Display Plan B details if available */}
            {isPlanB && planBData && (
              <div className="w-full mt-4 p-3 border border-green-500 rounded-lg">
                <h3 className="p-4 text-[24px] text-green-400">รายละเอียด Plan B</h3>
                <p>Cumulative POL: {formatNumber(planBData.cumulative_pol)}</p>
                <p>Append POL: {formatNumber(planBData.append_pol)}</p>
                <p>Rate: {formatNumber(planBData.rate_thb_pol)} THB/POL</p>
                <p>วันที่เข้าร่วม: {formatDate(planBData.append_pol_date_time)}</p>
                {planBData.append_pol_tx_hash && (
                  <p className="text-xs font-mono">Tx: {planBData.append_pol_tx_hash.substring(0, 20)}...</p>
                )}
              </div>
            )}

            {/* Show Join Plan B button if user is not in Plan B */}
            {!isPlanB && userData && (
              <div className="w-full mt-6">
                <button
                  onClick={handleJoinPlanB}
                  className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                >
                  ยืนยันเข้าร่วม Plan B
                </button>
              </div>
            )}
            
            <p className="mt-4">สิทธิพิเศษ<br />สำหรับสมาชิก</p>
            <span className="mt-2 text-[#eb1c24] text-3xl animate-blink">D1</span>
          </div>
        )}

        {!account?.address && (
          <div className="flex flex-col items-center justify-center p-5 border border-gray-800 rounded-lg text-[19px] text-center font-bold mt-10">
            <p>กรุณาเชื่อมต่อกระเป๋า</p>
          </div>
        )}
        
        <div className="flex flex-col items-center mb-6">
          <WalletPublicKey walletAddress={account?.address || ""}/>
        </div>

      </div>

      {/* Plan B Confirmation Modal */}
      {/* // Update the modal in the return statement to include transaction details and loading states */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-center">ยืนยันการเข้าร่วม Plan B</h2>
            
            {modalLoading ? (
              <p className="text-center">กำลังคำนวณยอดสะสม...</p>
            ) : (
              <>
                <div className="mb-4">
                  <p className="font-semibold">ยอดสะสมสุทธิของท่าน:</p>
                  <p className="text-2xl text-green-600 font-bold">
                    {formatNumber(netBonus)} POL
                  </p>
                  <p className="text-sm text-gray-500">
                    (5% ของโบนัสทั้งหมด: {formatNumber(totalBonus)} POL)
                  </p>
                </div>

                {rateLoading ? (
                  <p className="text-center">กำลังโหลดอัตราแลกเปลี่ยน...</p>
                ) : rateError ? (
                  <p className="text-center text-red-500">{rateError}</p>
                ) : adjustedExchangeRate && (
                  <>
                    <div className="mb-4">
                      <p className="font-semibold">ค่าสมาชิก Plan B:</p>
                      <p className="text-xl text-yellow-500 font-bold">
                        {MEMBERSHIP_FEE_THB} THB
                      </p>
                      <p className="text-sm">
                        อัตราแลกเปลี่ยน: {adjustedExchangeRate.toFixed(4)} THB/POL
                      </p>
                      <p className="text-sm">
                        คิดเป็นมูลค่า: {(MEMBERSHIP_FEE_THB / adjustedExchangeRate).toFixed(4)} POL
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="font-semibold">จำนวนที่ต้องชำระ:</p>
                      <p className="text-xl text-blue-500 font-bold">
                        {formatNumber(calculateRequiredPolAmount())} POL
                      </p>
                      <p className="text-sm">
                        (หลังจากหักยอดสะสม {formatNumber(netBonus)} POL แล้ว)
                      </p>
                    </div>

                    {account && (
                            <div className="mb-4">
                              <p className="text-sm">
                                POL ในกระเป๋าของคุณ: <span className="text-green-400">{polBalance}</span>
                              </p>
                              <p className="text-sm">
                                MATIC สำหรับค่าธรรมเนียม: <span className="text-blue-400">{maticBalance.toFixed(4)}</span>
                              </p>
                              {parseFloat(polBalance) < (calculateRequiredPolAmount() || 0) && (
                                <p className="text-red-400 text-sm mt-1">
                                  ⚠️ จำนวน POL ในกระเป๋าของคุณไม่เพียงพอ
                                </p>
                              )}
                              {maticBalance < 0.1 && (
                                <p className="text-red-400 text-sm mt-1">
                                  ⚠️ MATIC ไม่เพียงพอสำหรับค่าธรรมเนียม gas (ต้องการอย่างน้อย 0.1 MATIC)
                                </p>
                              )}
                            </div>
                          )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-sm">PR A: {formatNumber(bonusData.reduce((sum, b) => sum + (Number(b.pr_a) || 0), 0))}</div>
                  <div className="text-sm">PR B: {formatNumber(bonusData.reduce((sum, b) => sum + (Number(b.pr_b) || 0), 0))}</div>
                  <div className="text-sm">CR: {formatNumber(bonusData.reduce((sum, b) => sum + (Number(b.cr) || 0), 0))}</div>
                  <div className="text-sm">RT: {formatNumber(bonusData.reduce((sum, b) => sum + (Number(b.rt) || 0), 0))}</div>
                  <div className="text-sm">AR: {formatNumber(bonusData.reduce((sum, b) => sum + (Number(b.ar) || 0), 0))}</div>
                  <div className="text-sm col-span-2 border-t pt-2 mt-2">
                    <strong>Total Bonus: {formatNumber(totalBonus)} POL</strong>
                  </div>
                </div>

                {transactionError && (
                  <p className="text-red-400 text-sm mb-4">
                    {transactionError}
                  </p>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    disabled={isProcessing}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmJoinPlanB}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={isProcessing || !account || !adjustedExchangeRate || 
                      parseFloat(polBalance) < (calculateRequiredPolAmount() || 0)}
                  >
                    {isProcessing ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

  {/* // Add this Success Modal component at the end of the return statement, before the Footer */}
  {showSuccessModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-center text-green-500">การยืนยัน Plan B เสร็จสมบูรณ์</h2>
        
        <div className="mb-4">
          <p className="font-semibold">Tx Detail รายละเอียดธุรกรรม:</p>
          
          <div className="text-[16px] mt-3 p-3 bg-gray-700 rounded">
            <p className="text-sm">ยอดสะสมที่ใช้ไป: {formatNumber(netBonus)} POL</p>
            <p className="text-sm">จำนวน POL ที่ชำระ: {formatNumber(calculateRequiredPolAmount())} POL</p>
            <p className="text-sm">อัตราแลกเปลี่ยน: {adjustedExchangeRate?.toFixed(4)} THB/POL</p>
            <p className="text-sm">คิดเป็นมูลค่า: {MEMBERSHIP_FEE_THB} THB</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm font-semibold">Major Tx:</p>
            <p className="text-xs break-all">Tx Hash: {appendTxHash}</p>
            <p className="text-sm">Amount: {formatNumber(calculateRequiredPolAmount())} POL</p>
            <p className="text-sm">To: {RECIPIENT_ADDRESS.substring(0, 8)}...{RECIPIENT_ADDRESS.substring(36)}</p>
          </div>
          
          {/* // In the success modal, update the referrer transaction section: */}
          {userData?.referrer_id && isValidEthereumAddress(userData.referrer_id) ? (
            <div className="mt-3">
              <p className="text-sm font-semibold">PR Tx:</p>
              <p className="text-xs break-all">Tx Hash: {prTxHash || "ไม่มีการทำธุรกรรม"}</p>
              <p className="text-sm">Amount: {MINIMUM_PAYMENT} POL</p>
              <p className="text-sm">To: {formatAddressForDisplay(userData.referrer_id)}</p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-semibold">ธุรกรรมถึงผู้แนะนำ:</p>
              <p className="text-sm">ไม่มีการทำธุรกรรม (ไม่มีผู้แนะนำหรือที่อยู่ไม่ถูกต้อง)</p>
            </div>
          )}
        </div>

        {/* // Update the button onClick handler */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setShowSuccessModal(false);
              // Redirect to the user's plan-b page
              if (userData && userData.user_id) {
                router.push(`/plan-b/${userData.user_id}`);
              } else {
                // Fallback to home if userData is not available
                router.push('/');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            เสร็จสิ้นกระบวนการ
          </button>
        </div>
      </div>
    </div>
  )}

      <div className='px-1 w-full'>
        <Footer />
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
      </div>
    </div>
  )
};