// src/app/d1/page.tsx
"use client";
import React, { useEffect, useState } from 'react'
import Image from "next/image";
import { useActiveAccount } from "thirdweb/react";
import dprojectIcon from "@public/DProjectLogo_650x600.svg";
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import Footer from '@/components/Footer';
import { defineChain, getContract, toWei, sendTransaction, readContract, prepareContractCall } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "@/lib/client";
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/confirmModal';
import { privateKeyToAccount } from "thirdweb/wallets";

// ===== ADD THESE CONSTANTS =====
const KTDFI_SENDER_ADDRESS = "0x778cE5fB24792B79446Fe02a483C86E527e8C295";
const KTDFI_CONTRACT_ADDRESS = "0x532313164FDCA3ACd2C2900455B208145f269f0e";
const KTDFI_AMOUNT_D1_MEMBER = "10000"; // 10,000 KTDFI tokens for D1 member
const KTDFI_AMOUNT_D1_REFERRER = "10000"; // 10,000 KTDFI tokens for referrer bonus
const KTDFI_SENDER_PRIVATE_KEY = process.env.NEXT_PUBLIC_KTDFI_SENDER_PRIVATE_KEY_D1; // Use different env var for D1

// Constants
const RECIPIENT_ADDRESS = "0x3B16949e2fec02E1f9A2557cE7FEBe74f780fADc";
const MEMBERSHIP_FEE_THB = 800;
const MINIMUM_PAYMENT = 0.01; // Minimum POL to pay for transaction

// GitHub Raw URL for exchange rate configuration (same as other pages)
const GITHUB_CONFIG_URL = "https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.2/main/public/exchange-rate-config.json";

// Default values in case GitHub fetch fails
const DEFAULT_CONFIG = {
  fallbackExchangeRate: 3.97,
  exchangeRateBuffer: 0,
  refreshInterval: 300000 // 5 minutes
};

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

// Update the D1Data interface
interface D1Data {
  id: number;
  user_id: string;
  rate_thb_pol: number | string; // Allow string or number
  append_pol: number | string;
  used_bonus_pol: number | string; // Add this
  append_pol_tx_hash: string | null;
  append_pol_date_time: string | null;
  remark: any | null;
  created_at: string;
  updated_at: string;
  d1_id: string | null;
  d1_sequence: number | null;
}

interface BonusData {
  id: number;
  user_id: string;
  pr: number;  // Changed from pr_a and pr_b
  cr: number;
  rt: number;
  ar: number;
  bonus_date: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

// Update TransactionStatus interface
type TransactionStatus = {
  firstTransaction: boolean;
  secondTransaction: boolean;
  thirdTransaction: boolean; // KTDFI to member
  fourthTransaction: boolean; // ADD THIS: KTDFI to referrer
  error?: string;
};

// Configuration type for exchange rate settings
type ExchangeRateConfig = {
  fallbackExchangeRate: number;
  exchangeRateBuffer: number;
  refreshInterval: number;
};

export default function PlanB() {
  const account = useActiveAccount();
  const router = useRouter();
  
  // State variables - Following Plan A pattern
  const [userData, setUserData] = useState<UserData | null>(null);
  const [d1Data, setD1Data] = useState<D1Data | null>(null);
  // Add this state near your other state declarations
  const [allD1Data, setAllD1Data] = useState<D1Data[]>([]);
  const [bonusData, setBonusData] = useState<BonusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Update transaction status
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    firstTransaction: false,
    secondTransaction: false,
    thirdTransaction: false,
    fourthTransaction: false // ADD THIS
  });
  
  // Modal states - Following Plan A pattern
  const [showFirstConfirmationModal, setShowFirstConfirmationModal] = useState(false);
  const [showSecondConfirmationModal, setShowSecondConfirmationModal] = useState(false);
  const [showThirdConfirmationModal, setShowThirdConfirmationModal] = useState(false); // ADD THIS
  const [showFourthConfirmationModal, setShowFourthConfirmationModal] = useState(false); // ADD THIS
  const [isProcessingFirst, setIsProcessingFirst] = useState(false);
  const [isProcessingSecond, setIsProcessingSecond] = useState(false);
  const [isProcessingThird, setIsProcessingThird] = useState(false); // ADD THIS
  const [isProcessingFourth, setIsProcessingFourth] = useState(false); // ADD THIS

  // Data states
  // Add third transaction hash and KTDFI sender
  // Add fourth transaction hash
  const [firstTxHash, setFirstTxHash] = useState<string>("");
  const [secondTxHash, setSecondTxHash] = useState<string>("");
  const [thirdTxHash, setThirdTxHash] = useState<string>("");
  const [fourthTxHash, setFourthTxHash] = useState<string>(""); // ADD THIS
  const [polBalance, setPolBalance] = useState<string>("0");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [adjustedExchangeRate, setAdjustedExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [exchangeRateConfig, setExchangeRateConfig] = useState<ExchangeRateConfig>(DEFAULT_CONFIG);

  // ADD KTDFI SENDER STATE
  const [ktdfiSenderAccount, setKtdfiSenderAccount] = useState<any>(null);

  // Add this near your other modal states
  const [showD1DetailsModal, setShowD1DetailsModal] = useState(false);

  // Add this at the beginning of your component function, after state declarations
  console.log("Component state:", {
    account: account?.address,
    userData: !!userData,
    d1Data: !!d1Data,
    exchangeRate,
    adjustedExchangeRate,
    polBalance,
    loading,
    rateLoading
  });

  // Also add a useEffect to log when account changes
  useEffect(() => {
    console.log("Account changed:", account?.address);
  }, [account?.address]);

  // Fetch exchange rate configuration from GitHub
  useEffect(() => {
    const fetchExchangeRateConfig = async () => {
      try {
        setRateLoading(true);
        const response = await fetch(GITHUB_CONFIG_URL, {
          cache: 'no-store', // Always fetch fresh config
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status}`);
        }

        const config: ExchangeRateConfig = await response.json();
        
        // Validate config values
        const validatedConfig = {
          fallbackExchangeRate: config.fallbackExchangeRate > 0 ? config.fallbackExchangeRate : DEFAULT_CONFIG.fallbackExchangeRate,
          exchangeRateBuffer: config.exchangeRateBuffer >= 0 ? config.exchangeRateBuffer : DEFAULT_CONFIG.exchangeRateBuffer,
          refreshInterval: config.refreshInterval > 0 ? config.refreshInterval : DEFAULT_CONFIG.refreshInterval
        };

        setExchangeRateConfig(validatedConfig);
        console.log('Exchange rate config loaded:', validatedConfig);
      } catch (error) {
        console.error('Failed to load exchange rate config from GitHub, using defaults:', error);
        setExchangeRateConfig(DEFAULT_CONFIG);
        setError("ไม่สามารถโหลดอัตราแลกเปลี่ยนจากระบบกลาง กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      }
    };

    fetchExchangeRateConfig();
  }, []);

  // Update exchange rate based on config
  useEffect(() => {
    const updateExchangeRate = async () => {
      try {
        setRateLoading(true);
        // Use the configured fallback rate from GitHub
        const currentRate = exchangeRateConfig.fallbackExchangeRate;
        const adjustedRate = Math.max(0.01, currentRate - exchangeRateConfig.exchangeRateBuffer);
        
        setExchangeRate(currentRate);
        setAdjustedExchangeRate(adjustedRate);
        
        console.log(`Exchange rate updated: ${currentRate} THB/POL (adjusted: ${adjustedRate})`);
      } catch (err) {
        console.error("Failed to get exchange rate:", err);
        // Use fallback from config even if there's an error
        const fallbackAdjustedRate = Math.max(
          0.01, 
          exchangeRateConfig.fallbackExchangeRate - exchangeRateConfig.exchangeRateBuffer
        );
        setExchangeRate(exchangeRateConfig.fallbackExchangeRate);
        setAdjustedExchangeRate(fallbackAdjustedRate);
        setError("ใช้อัตราแลกเปลี่ยนจากระบบกลาง เนื่องจากไม่สามารถโหลดอัตราปัจจุบันได้");
      } finally {
        setRateLoading(false);
      }
    };

    if (exchangeRateConfig) {
      updateExchangeRate();
      
      // Set up interval for refreshing based on config
      const interval = setInterval(updateExchangeRate, exchangeRateConfig.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [exchangeRateConfig]);

  // Fetch user data
  // In the fetchUserData useEffect, update the D1 fetch section:
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

        // Fetch D1 data - GET ALL D1 RECORDS FOR THE USER
        try {
          const d1Response = await fetch(`/api/d1?user_id=${account.address}&get_all=true`);
          if (d1Response.ok) {
            const d1DataArray = await d1Response.json();
            
            // FIX: Check if the response is an empty array (meaning no D1 records)
            if (Array.isArray(d1DataArray)) {
              if (d1DataArray.length > 0) {
                // If we have D1 records, get the latest (highest d1_sequence)
                const sortedD1Data = d1DataArray.sort((a, b) => 
                  (b.d1_sequence || 0) - (a.d1_sequence || 0)
                );
                setD1Data(sortedD1Data[0]); // Set the latest D1 record
                
                // Also store all D1 records for display
                setAllD1Data(d1DataArray);
              } else {
                // FIX: Empty array means no D1 records found
                setD1Data(null);
                setAllD1Data([]);
              }
            } else if (d1DataArray && typeof d1DataArray === 'object' && !Array.isArray(d1DataArray)) {
              // Single record (for backward compatibility with old API)
              setD1Data(d1DataArray);
              setAllD1Data([d1DataArray]);
            } else {
              // No data found or invalid response
              setD1Data(null);
              setAllD1Data([]);
            }
          } else {
            // API returned error, no D1 data
            setD1Data(null);
            setAllD1Data([]);
          }
        } catch (d1Error) {
          console.log('No D1 data found or error fetching:', d1Error);
          setD1Data(null);
          setAllD1Data([]);
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

  // Fetch bonus data when user data is loaded
  useEffect(() => {
    if (userData) {
      console.log("Fetching bonus data for user:", userData.user_id);
      fetchBonusData();
    }
  }, [userData]);

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

  // ===== ADD KTDFI SENDER INITIALIZATION =====
  useEffect(() => {
    const initializeKtdfiSender = async () => {
      if (!KTDFI_SENDER_PRIVATE_KEY) {
        console.error("KTDFI sender private key not found in environment variables");
        setTransactionError("ระบบส่งเหรียญ KTDFI ยังไม่พร้อมใช้งาน");
        return;
      }

      try {
        const senderAccount = privateKeyToAccount({
          client,
          privateKey: KTDFI_SENDER_PRIVATE_KEY,
        });
        setKtdfiSenderAccount(senderAccount);
        console.log("KTDFI sender account initialized:", senderAccount.address);
      } catch (error) {
        console.error("Failed to initialize KTDFI sender account:", error);
        setTransactionError("ไม่สามารถตั้งค่าระบบส่งเหรียญ KTDFI ได้");
      }
    };

    initializeKtdfiSender();
  }, []);

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

  // Transaction execution - Fixed with better error handling
  const executeTransaction = async (to: string, amountWei: bigint) => {
    try {
      console.log("Preparing transaction:", {
        to,
        amountWei: amountWei.toString(),
        amountPOL: (Number(amountWei) / 10**18).toString()
      });

      // Validate recipient address
      if (!isValidEthereumAddress(to)) {
        return { 
          success: false, 
          error: `Invalid recipient address: ${to}` 
        };
      }

      if (!account) {
        return {
          success: false,
          error: "No wallet connected"
        };
      }

      // Create the transaction - FIXED: Using correct thirdweb syntax
      const transaction = {
        to: to as `0x${string}`,
        value: amountWei,
        chain: defineChain(polygon),
        client,
      };

      console.log("Sending transaction:", transaction);

      const { transactionHash } = await sendTransaction({
        transaction,
        account: account
      });

      console.log("Transaction successful, hash:", transactionHash);
      return { success: true, transactionHash };
    } catch (error: any) {
      console.error("Transaction failed with detailed error:", error);
      
      let errorMessage = error.message || "Unknown error";
      
      // More specific error messages
      if (errorMessage.includes("user rejected") || errorMessage.includes("denied transaction")) {
        errorMessage = "User rejected the transaction";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (errorMessage.includes("gas")) {
        errorMessage = "Gas estimation failed - please try again";
      } else if (errorMessage.includes("network") || errorMessage.includes("chain")) {
        errorMessage = "Network error - please check your connection";
      } else if (errorMessage.includes("Unexpected error") || errorMessage.includes("Ue")) {
        errorMessage = "Transaction failed - please check your wallet balance and try again";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // ===== ADD checkWalletBalance FUNCTION =====
  const checkWalletBalance = async (requiredAmount: number): Promise<{ sufficient: boolean; balance: string; required: string; error?: string }> => {
    if (!account) {
      return {
        sufficient: false,
        balance: "0",
        required: requiredAmount.toString(),
        error: "No wallet connected"
      };
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
      const sufficient = balanceInPOL >= requiredAmount;

      return {
        sufficient,
        balance: balanceInPOL.toFixed(4),
        required: requiredAmount.toFixed(4)
      };
    } catch (err) {
      console.error("Error checking wallet balance:", err);
      return {
        sufficient: false,
        balance: "0",
        required: requiredAmount.toString(),
        error: "Failed to check balance"
      };
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

  // ===== UPDATE handleFirstTransaction WITH BETTER VALIDATION =====
  const handleFirstTransaction = async () => {
    if (!account || !adjustedExchangeRate || !userData) {
      setTransactionError("กรุณาเชื่อมต่อกระเป๋าและรอการโหลดข้อมูล");
      return;
    }
    
    setIsProcessingFirst(true);
    setTransactionError(null);

    try {
      const requiredPolAmount = calculateRequiredPolAmount();
      if (requiredPolAmount === null) {
        throw new Error("ไม่สามารถคำนวณจำนวน POL ที่ต้องการได้");
      }

      console.log("Calculated required POL amount:", requiredPolAmount);

      // Check wallet balance before proceeding
      const balanceCheck = await checkWalletBalance(requiredPolAmount);
      if (!balanceCheck.sufficient) {
        throw new Error(`ยอดเงินในกระเป๋าไม่เพียงพอ\nคุณมี: ${balanceCheck.balance} POL\nต้องการ: ${balanceCheck.required} POL`);
      }

      const requiredAmountWei = toWei(requiredPolAmount.toString());
      console.log("Amount in wei:", requiredAmountWei.toString());

      // Execute first transaction to recipient
      console.log("Executing transaction to:", RECIPIENT_ADDRESS);
      const firstTransaction = await executeTransaction(RECIPIENT_ADDRESS, requiredAmountWei);
      
      if (!firstTransaction.success) {
        // More user-friendly error messages
        let errorMessage = firstTransaction.error;
        if (errorMessage.includes("insufficient funds")) {
          errorMessage = `ยอดเงินไม่เพียงพอ\nคุณมี: ${balanceCheck.balance} POL\nต้องการ: ${balanceCheck.required} POL`;
        } else if (errorMessage.includes("user rejected")) {
          errorMessage = "คุณได้ปฏิเสธการทำรายการ";
        } else if (errorMessage.includes("gas")) {
          errorMessage = "เกิดข้อผิดพลาดในการคำนวณค่าธรรมเนียม กรุณาลองใหม่อีกครั้ง";
        }
        
        throw new Error(`การทำรายการครั้งที่ 1 ล้มเหลว: ${errorMessage}`);
      }
      
      setFirstTxHash(firstTransaction.transactionHash!);
      setTransactionStatus(prev => ({ ...prev, firstTransaction: true }));
      
      // Close first modal and open second modal
      setShowFirstConfirmationModal(false);
      setShowSecondConfirmationModal(true);

    } catch (err) {
      console.error("First transaction failed with details:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingFirst(false);
    }
  };

  // ===== MODIFY handleSecondTransaction TO ADD KTDFI TRANSACTION =====
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

      // Close second modal and open third modal for KTDFI
      setShowSecondConfirmationModal(false);
      setShowThirdConfirmationModal(true);

    } catch (err) {
      console.error("Second transaction failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingSecond(false);
    }
  };

  // ===== ADD NEW handleThirdTransaction FUNCTION =====
  const handleThirdTransaction = async () => {
    if (!account || !firstTxHash || !ktdfiSenderAccount) return;
    
    setIsProcessingThird(true);
    setTransactionError(null);

    try {
      let thirdTransactionHash = "";

      // Execute third transaction (KTDFI token transfer to D1 member)
      const thirdTransaction = await executeKTDFITransaction(account.address, KTDFI_AMOUNT_D1_MEMBER, ktdfiSenderAccount, false);
      
      if (!thirdTransaction.success) {
        console.warn('KTDFI transaction to member failed:', thirdTransaction.error);
        setTransactionError(`การส่งเหรียญ KTDFI ให้สมาชิกล้มเหลว: ${thirdTransaction.error}. จะดำเนินการต่อไป`);
      } else {
        thirdTransactionHash = thirdTransaction.transactionHash!;
        setThirdTxHash(thirdTransactionHash);
        setTransactionStatus(prev => ({ ...prev, thirdTransaction: true }));
      }

      // Close third modal and open fourth modal for referrer bonus
      setShowThirdConfirmationModal(false);
      
      // Check if user has a valid referrer for the fourth transaction
      const referrerAddress = getValidReferrerAddress();
      if (referrerAddress) {
        setShowFourthConfirmationModal(true);
      } else {
        // If no referrer, skip to database update
        await handleDatabaseUpdate(thirdTransactionHash, "");
      }

    } catch (err) {
      console.error("Third transaction failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingThird(false);
    }
  };
  
  // ===== ADD NEW handleFourthTransaction FUNCTION =====
  const handleFourthTransaction = async () => {
    if (!account || !ktdfiSenderAccount) return;
    
    setIsProcessingFourth(true);
    setTransactionError(null);

    try {
      const referrerAddress = getValidReferrerAddress();
      let fourthTransactionHash = "";
      let fourthTransactionError = "";

      if (referrerAddress) {
        // Execute fourth transaction (KTDFI token transfer to referrer as bonus)
        const fourthTransaction = await executeKTDFITransaction(referrerAddress, KTDFI_AMOUNT_D1_REFERRER, ktdfiSenderAccount, true);
        
        if (!fourthTransaction.success) {
          fourthTransactionError = fourthTransaction.error || "Unknown error";
          console.warn('KTDFI transaction to referrer failed:', fourthTransactionError);
          setTransactionError(`การส่งเหรียญ KTDFI ให้ผู้แนะนำล้มเหลว: ${fourthTransactionError}. แต่จะบันทึกข้อมูลลงฐานข้อมูล`);
        } else {
          fourthTransactionHash = fourthTransaction.transactionHash!;
          setFourthTxHash(fourthTransactionHash);
          setTransactionStatus(prev => ({ ...prev, fourthTransaction: true }));
        }
      }

      // Proceed to database update
      await handleDatabaseUpdate(thirdTxHash, fourthTransactionHash);

    } catch (err) {
      console.error("Fourth transaction failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingFourth(false);
    }
  };

  // ===== ADD NEW handleDatabaseUpdate FUNCTION =====
  const handleDatabaseUpdate = async (memberKtdfiTxHash: string, referrerKtdfiTxHash: string) => {
    if (!account || !adjustedExchangeRate) return;

    try {
      // Get current time
      const now = new Date();
      const formattedDate = now.toISOString();

      const referrerAddress = getValidReferrerAddress();

      // Prepare D1 data with both KTDFI transactions
      const newD1Data = {
        user_id: account.address,
        rate_thb_pol: parseFloat(adjustedExchangeRate?.toFixed(4) || "0"),
        append_pol: parseFloat(calculateRequiredPolAmount()?.toFixed(4) || "0"),
        append_pol_tx_hash: firstTxHash,
        append_pol_date_time: formattedDate,
        remark: {
          net_bonus_used: totalBonus * 0.05,
          referrer_transaction: referrerAddress ? {
            amount: MINIMUM_PAYMENT,
            tx_hash: secondTxHash,
            date_time: formattedDate
          } : null,
          ktdfi_to_member: memberKtdfiTxHash ? {
            amount: KTDFI_AMOUNT_D1_MEMBER,
            tx_hash: memberKtdfiTxHash,
            date_time: formattedDate,
            sender: KTDFI_SENDER_ADDRESS,
            type: "member_bonus"
          } : null,
          ktdfi_to_referrer: referrerAddress && referrerKtdfiTxHash ? {
            amount: KTDFI_AMOUNT_D1_REFERRER,
            tx_hash: referrerKtdfiTxHash,
            date_time: formattedDate,
            sender: KTDFI_SENDER_ADDRESS,
            recipient: referrerAddress,
            type: "referrer_bonus"
          } : referrerAddress && !referrerKtdfiTxHash ? {
            amount: KTDFI_AMOUNT_D1_REFERRER,
            tx_hash: null,
            date_time: formattedDate,
            sender: KTDFI_SENDER_ADDRESS,
            recipient: referrerAddress,
            type: "referrer_bonus_failed",
            error: transactionError || "Transaction failed"
          } : null,
          total_amount_thb: MEMBERSHIP_FEE_THB,
          config_source: GITHUB_CONFIG_URL,
          exchange_rate_buffer: exchangeRateConfig.exchangeRateBuffer,
          timestamp: formattedDate
        }
      };

      // Save to database
      console.log('Adding D1 data to database...');
      const dbResult = await addD1ToDatabase(newD1Data);
      
      if (dbResult && dbResult.user_id) {
        setD1Data(dbResult);
        setIsTransactionComplete(true);
        setShowFourthConfirmationModal(false);
        
        // Redirect to user page after successful completion
        router.push(`/plan-b/${account.address}`);
      } else {
        throw new Error('Failed to save to database');
      }

    } catch (err) {
      console.error("Database update failed:", err);
      setTransactionError(`การบันทึกข้อมูลล้มเหลว: ${(err as Error).message}`);
    }
  };

  // ===== ADD handleCloseFourthModal FUNCTION =====
  const handleCloseFourthModal = () => {
    if (transactionStatus.fourthTransaction) {
      return; // Don't allow closing if transaction is completed
    }
    setShowFourthConfirmationModal(false);
    setTransactionError(null);
  };

  // ===== ADD THIS HELPER FUNCTION =====
  const executeKTDFITransaction = async (to: string, amount: string, ktdfiSenderAccount: any, isReferrerBonus: boolean = false) => {
    try {
      if (!ktdfiSenderAccount) {
        throw new Error("KTDFI sender account not initialized");
      }

      // Check KTDFI balance first
      const ktdfiBalance = await readContract({
        contract: getContract({
          client,
          chain: defineChain(polygon),
          address: KTDFI_CONTRACT_ADDRESS
        }),
        method: {
          type: "function",
          name: "balanceOf",
          inputs: [{ type: "address", name: "owner" }],
          outputs: [{ type: "uint256" }],
          stateMutability: "view"
        },
        params: [KTDFI_SENDER_ADDRESS]
      });

      const balanceInTokens = Number(ktdfiBalance) / 10**18;
      const requiredAmount = Number(amount);
      if (balanceInTokens < requiredAmount) {
        throw new Error(`Insufficient KTDFI balance. Sender has ${balanceInTokens} KTDFI, but needs ${requiredAmount} KTDFI`);
      }

      console.log(`Sending ${amount} KTDFI from ${KTDFI_SENDER_ADDRESS} to ${to} ${isReferrerBonus ? '(Referrer Bonus)' : '(Member Bonus)'}`);

      // KTDFI is an ERC-20 token
      const transaction = prepareContractCall({
        contract: getContract({
          client,
          chain: defineChain(polygon),
          address: KTDFI_CONTRACT_ADDRESS
        }),
        method: {
          type: "function",
          name: "transfer",
          inputs: [
            { type: "address", name: "to" },
            { type: "uint256", name: "value" }
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable"
        },
        params: [to, toWei(amount)]
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: ktdfiSenderAccount
      });

      console.log(`KTDFI transaction successful: ${transactionHash}`);
      return { success: true, transactionHash, isReferrerBonus };
    } catch (error) {
      console.error("KTDFI transaction failed:", error);
      return { success: false, error: (error as Error).message, isReferrerBonus };
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

  // ===== ADD handleCloseThirdModal FUNCTION =====
  const handleCloseThirdModal = () => {
    if (transactionStatus.thirdTransaction) {
      return; // Don't allow closing if transaction is completed
    }
    setShowThirdConfirmationModal(false);
    setTransactionError(null);
  };

  // Bonus data and calculations
  const fetchBonusData = async () => {
    if (!account?.address) {
      console.log("No account address for fetching bonus data");
      return;
    }

    try {
      console.log("Fetching bonus data from API for:", account.address);
      const bonusResponse = await fetch(`/api/bonus?user_id=${account.address}`);
      
      console.log("Bonus API response status:", bonusResponse.status);
      
      if (bonusResponse.ok) {
        const responseData = await bonusResponse.json();
        console.log("Full API response:", responseData);
        
        // Extract the data array from the response
        const bonusDataArray = responseData.data || [];
        console.log("Bonus data array:", bonusDataArray);
        
        const processedBonusData = bonusDataArray.map((bonus: any) => ({
          id: bonus.id,
          user_id: bonus.user_id,
          pr: Number(bonus.pr) || 0,
          cr: Number(bonus.cr) || 0,
          rt: Number(bonus.rt) || 0,
          ar: Number(bonus.ar) || 0,
          bonus_date: bonus.bonus_date,
          calculated_at: bonus.calculated_at,
          created_at: bonus.created_at,
          updated_at: bonus.updated_at
        }));
        
        console.log("Processed bonus data:", processedBonusData);
        
        // Calculate total for debugging
        const total = processedBonusData.reduce((sum, bonus) => 
          sum + (Number(bonus.pr) || 0) + (Number(bonus.cr) || 0) + 
          (Number(bonus.rt) || 0) + (Number(bonus.ar) || 0), 0
        );
        console.log("Total bonus calculated:", total);
        
        setBonusData(processedBonusData);
      } else {
        console.log("Bonus API returned error:", bonusResponse.status);
        const errorText = await bonusResponse.text();
        console.log("Error response:", errorText);
        setBonusData([]);
      }
    } catch (bonusError) {
      console.error('Error fetching bonus data:', bonusError);
      setBonusData([]);
    }
  };

  // ===== UPDATE THE JOIN BUTTON TO CHECK CONDITIONS =====
  // In the handleJoinPlanB function, update the error message:
  const handleJoinPlanB = async () => {
    if (!account) {
      setTransactionError("กรุณาเชื่อมต่อกระเป๋าก่อน");
      return;
    }

    // Check if user already has D1
    if (isPlanB) {
      // Update this message to be more consistent with the new display
      setTransactionError("ท่านเป็นสมาชิก Plan B D1 เรียบร้อยแล้ว");
      return;
    }


    // Check basic requirements
    if (!adjustedExchangeRate) {
      setTransactionError("กำลังโหลดอัตราแลกเปลี่ยน กรุณารอสักครู่...");
      return;
    }

    const requiredPolAmount = calculateRequiredPolAmount();
    if (!requiredPolAmount) {
      setTransactionError("ไม่สามารถคำนวณยอดเงินที่ต้องการได้");
      return;
    }

    // Check wallet balance before showing modal
    const balanceCheck = await checkWalletBalance(requiredPolAmount);
    if (!balanceCheck.sufficient) {
      setTransactionError(`ยอดเงินไม่เพียงพอ\nคุณมี: ${balanceCheck.balance} POL\nต้องการ: ${balanceCheck.required} POL`);
      return;
    }

    // All checks passed, show modal
    setShowFirstConfirmationModal(true);
    fetchBonusData();
  };

  // Utility functions
  const isValidEthereumAddress = (address: string | null | undefined): boolean => {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // ===== UPDATE getValidReferrerAddress TO BE MORE ROBUST =====
  const getValidReferrerAddress = (): string | null => {
    if (!userData || !userData.referrer_id) return null;
    
    const referrerAddress = userData.referrer_id.trim();
    
    // Check if it's a valid Ethereum address
    if (!isValidEthereumAddress(referrerAddress)) return null;
    
    // Check if referrer is not the same as the user
    if (account && referrerAddress.toLowerCase() === account.address.toLowerCase()) {
      console.warn('Referrer address is the same as user address');
      return null;
    }
    
    return referrerAddress;
  };

  // Add this helper function near your other format functions
  const formatPOLNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.0000';
    
    try {
      // Convert to number if it's a string
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (isNaN(numValue as number)) return '0.0000';
      
      return (numValue as number).toFixed(4);
    } catch (error) {
      console.error('Error formatting POL number:', error);
      return '0.0000';
    }
  };

  // Also update your existing formatNumber function to be more robust
  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    
    try {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num as number)) return '0.00';
      
      return (num as number).toFixed(2);
    } catch (error) {
      return '0.00';
    }
  };

  const formatAddressForDisplay = (address: string | null | undefined): string => {
    if (!address) return "ไม่มี";
    if (!isValidEthereumAddress(address)) return "ไม่ถูกต้อง";
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  // Calculations
  const isPlanA = userData?.plan_a !== null;
  const isPlanB = d1Data !== null;

  // FIX: Calculate total bonus based on your schema (pr + cr + rt + ar)
  const totalBonus = bonusData.reduce((total, bonus) => total + 
    (Number(bonus.pr) || 0) + 
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
            {/* REMOVED: The big status message */}
            {/* <span className={`m-2 text-[22px] font-bold ${isPlanB ? "text-green-600" : "text-red-600"}`}>
              {isPlanB ? "ท่านเป็นสมาชิก Plan B D1 เรียบร้อยแล้ว" : "ท่านยังไม่ได้เป็นสมาชิก Plan B D1"}
            </span> */}
            
            <div className="flex flex-col m-2 text-gray-200 text-[16px] text-left w-full">
              <p className="text-[20px] font-bold text-center mb-3">รายละเอียดสมาชิก</p>
              
              {/* User Basic Info */}
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <p className="font-semibold mb-2">ข้อมูลพื้นฐาน:</p>
                <div className="space-y-1">
                  <p>เลขกระเป๋า: {userData.user_id}</p>
                  <p>อีเมล: {userData.email || 'ไม่มีข้อมูล'}</p>
                  <p>ชื่อ: {userData.name || 'ไม่มีข้อมูล'}</p>
                  <p>เข้า Plan A: {isPlanA ? "✅ ใช่" : "❌ ไม่ใช่"}</p>
                  {/* ADD THIS: Plan B status */}
                    <div className="flex items-start gap-2">
                      <p className={`font-semibold ${isPlanB ? "text-green-400" : "text-red-400"} pt-1`}>
                        เข้า Plan B D1: {isPlanB ? "✅ ใช่" : "❌ ไม่ใช่"}
                      </p>
                      {isPlanB && d1Data && (
                        <button
                          onClick={() => setShowD1DetailsModal(true)}
                          className="text-s bg-emerald-600 hover:bg-emerald-800 text-white ml-2 hover:text-lime-300 px-2 py-1 rounded transition-colors mt-0.6"
                          title="แสดงรายละเอียด"
                        >
                          รายละเอียด
                        </button>
                      )}
                    </div>
                  <p>PR by: {formatAddressForDisplay(userData.referrer_id)}</p>
                </div>
              </div>
              
              {/* Bonus Information Section */}
              <div className="mb-4 p-3 bg-purple-900 rounded-lg">
                <p className="font-semibold mb-2">ข้อมูลโบนัส:</p>
                
                {/* Current Bonus from bonus table */}
                <div className="mb-3">
                  <p className="text-sm text-gray-300">โบนัสสะสมปัจจุบัน:</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div>โบนัสทั้งหมด (PR+CR+RT+AR):</div>
                    <div className="text-right">{formatNumber(totalBonus)} POL</div>
                    
                    <div>5% ที่ใช้ได้:</div>
                    <div className="text-right">{formatNumber(totalBonus * 0.05)} POL</div>
                    
                    {/* Display used bonus from D1 if available */}
                    {isPlanB && d1Data && (
                      <>
                        <div>โบนัสที่ใช้ไปแล้ว:</div>
                        <div className="text-right font-bold text-yellow-400">
                          {formatPOLNumber(d1Data.used_bonus_pol)} POL
                        </div>
                        
                        <div>โบนัสคงเหลือ:</div>
                        <div className="text-right font-bold text-green-400">
                          {formatPOLNumber(
                            Math.max(0, (totalBonus * 0.05) - 
                            (typeof d1Data.used_bonus_pol === 'string' 
                              ? parseFloat(d1Data.used_bonus_pol) 
                              : (d1Data.used_bonus_pol || 0)
                            ))
                          )} POL
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Show detailed bonus breakdown if you want */}
                {bonusData.length > 0 && (
                  <div className="mt-3 p-2 bg-gray-800 rounded">
                    <p className="text-sm text-gray-300 mb-1">รายละเอียดโบนัส:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>PR:</div>
                      <div className="text-right">
                        {formatNumber(bonusData.reduce((sum, bonus) => sum + (Number(bonus.pr) || 0), 0))} POL
                      </div>
                      <div>CR:</div>
                      <div className="text-right">
                        {formatNumber(bonusData.reduce((sum, bonus) => sum + (Number(bonus.cr) || 0), 0))} POL
                      </div>
                      <div>RT:</div>
                      <div className="text-right">
                        {formatNumber(bonusData.reduce((sum, bonus) => sum + (Number(bonus.rt) || 0), 0))} POL
                      </div>
                      <div>AR:</div>
                      <div className="text-right">
                        {formatNumber(bonusData.reduce((sum, bonus) => sum + (Number(bonus.ar) || 0), 0))} POL
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show POL balance */}
                {account && (
                  <div className="mt-2 p-2 bg-gray-700 rounded">
                    <p className="text-sm">
                      POL ในกระเป๋า: <span className="text-green-400 font-bold">{polBalance} POL</span>
                    </p>
                  </div>
                )}
              </div>
              
              {/* D1 History if multiple records */}
              {allD1Data.length > 1 && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <p className="font-semibold mb-2">ประวัติการสมัคร D1:</p>
                  <div className="max-h-40 overflow-y-auto">
                    {allD1Data.map((d1Record, index) => (
                      <div key={d1Record.id} className="p-2 mb-2 bg-gray-700 rounded text-sm">
                        <div className="flex justify-between">
                          <span>D1 ครั้งที่ {d1Record.d1_sequence || index + 1}</span>
                          <span>{new Date(d1Record.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-300">
                          <span>โบนัสใช้แล้ว: {formatPOLNumber(d1Record.used_bonus_pol)} POL</span>
                          <span>จ่ายเพิ่ม: {formatPOLNumber(d1Record.append_pol)} POL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exchange Rate Display */}
            {adjustedExchangeRate && !isPlanB && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-300">
                  อัตราแลกเปลี่ยนปัจจุบัน: {adjustedExchangeRate.toFixed(4)} THB/POL
                  {exchangeRateConfig && (
                    <span className="text-[12px] text-yellow-400 block">
                      (อัปเดตล่าสุดจากระบบกลาง)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Join Button Section - Update the text to be clearer */}
            {!isPlanB && userData && (
              <div className="w-full mt-6">
                <button
                  onClick={handleJoinPlanB}
                  className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={!account || loading || rateLoading}
                >
                  {!account ? "กรุณาเชื่อมต่อกระเป๋า" : 
                  loading || rateLoading ? "กำลังโหลดข้อมูล..." : 
                  "ยืนยันเข้าร่วม Plan B D1"}
                </button>
                
                {/* Error display for join button - Update the message */}
                {transactionError && !showFirstConfirmationModal && (
                  <div className="mt-3 p-2 bg-red-900 border border-red-400 rounded-lg">
                    <p className="text-red-300 text-xs">
                      {transactionError.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < transactionError.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                )}
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
                  <p className="text-xs text-gray-400">จากระบบกลาง</p>
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

              {/* Error display in modal */}
              {transactionError && (
                <div className="mt-3 p-2 bg-red-900 border border-red-400 rounded-lg">
                  <p className="text-red-300 text-xs">
                    {transactionError.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < transactionError.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
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
                {transactionStatus.secondTransaction ? 'ดำเนินการต่อ' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Third Confirmation Modal for KTDFI */}
      {showThirdConfirmationModal && (
        <ConfirmModal 
          onClose={handleCloseThirdModal}
          disableClose={isProcessingThird || transactionStatus.thirdTransaction}
        >
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">รับเหรียญ KTDFI สำหรับ Plan B D1</h3>
            <div className="mb-6 text-center">
              <div className="mb-4 p-3 bg-purple-800 rounded-lg">
                <p className="text-lg font-bold text-white">ยินดีต้อนรับสู่ Plan B D1</p>
                <p className="text-yellow-500 text-[22px] font-bold">
                  {MEMBERSHIP_FEE_THB} THB
                </p>
                <p className="text-purple-300 text-lg font-bold">
                  โบนัสสำหรับท่าน: 10,000 KTDFI
                </p>
                {getValidReferrerAddress() && (
                  <p className="text-green-300 text-md font-bold mt-2">
                    โบนัสสำหรับผู้แนะนำ: 10,000 KTDFI
                  </p>
                )}
              </div>
              <p className="text-[18px] text-gray-200">
                ขอแสดงความยินดีที่เข้าร่วม Plan B D1!<br />
                คุณจะได้รับเหรียญ KTDFI
                <span className="text-yellow-500 text-[22px] font-bold">
                  <br />10,000 KTDFI
                </span>
                <p className="text-[16px] mt-2 text-gray-200">Welcome Bonus for D1 Members</p>
              </p>
              <div className="mt-4 p-3 bg-purple-900 border border-purple-400 rounded-lg">
                <p className="text-sm text-purple-200">
                  เหรียญ KTDFI จะถูกโอนจาก<br />
                  <span className="text-purple-300">{KTDFI_SENDER_ADDRESS.slice(0, 6)}...{KTDFI_SENDER_ADDRESS.slice(-4)}</span>
                  <br />ไปยังกระเป๋าของคุณ
                </p>
              </div>
              {!ktdfiSenderAccount && (
                <p className="text-sm text-red-400 mt-2">
                  ⚠️ ระบบส่งเหรียญยังไม่พร้อมใช้งาน
                </p>
              )}
              <p className="text-sm text-green-400 mt-4">
                ✅ การชำระค่าสมาชิกสำเร็จแล้ว
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
                  isProcessingThird || !ktdfiSenderAccount ? "bg-gray-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 cursor-pointer"
                }`}
                onClick={handleThirdTransaction}
                disabled={isProcessingThird || !ktdfiSenderAccount}
              >
                {isProcessingThird ? 'กำลังส่งเหรียญ...' : 'รับเหรียญ KTDFI'}
              </button>
              <button
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={handleCloseThirdModal}
                disabled={isProcessingThird || transactionStatus.thirdTransaction}
              >
                {transactionStatus.thirdTransaction ? 'ดำเนินการต่อ' : 'ข้าม'}
              </button>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Fourth Confirmation Modal for Referrer Bonus */}
      {showFourthConfirmationModal && (
        <ConfirmModal 
          onClose={handleCloseFourthModal}
          disableClose={isProcessingFourth || transactionStatus.fourthTransaction}
        >
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">โบนัสสำหรับผู้แนะนำ</h3>
            <div className="mb-6 text-center">
              <div className="mb-4 p-3 bg-green-800 rounded-lg">
                <p className="text-lg font-bold text-white">ขอบคุณผู้แนะนำ!</p>
                <p className="text-yellow-500 text-[22px] font-bold">
                  โบนัส 10,000 KTDFI
                </p>
                <p className="text-green-300 text-lg font-bold">
                  สำหรับผู้แนะนำของคุณ
                </p>
              </div>
              
              {userData?.referrer_id && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-300">ผู้แนะนำ:</p>
                  <p className="text-lg font-bold text-white">
                    {formatAddressForDisplay(userData.referrer_id)}
                  </p>
                </div>
              )}

              <p className="text-[18px] text-gray-200">
                เป็นเกียรติที่คุณได้เข้าร่วม Plan B D1<br />
                ผู้แนะนำของคุณจะได้รับโบนัส
                <span className="text-yellow-500 text-[22px] font-bold">
                  <br />10,000 KTDFI
                </span>
                <p className="text-[16px] mt-2 text-gray-200">Referrer Bonus</p>
              </p>

              <div className="mt-4 p-3 bg-green-900 border border-green-400 rounded-lg">
                <p className="text-sm text-green-200">
                  เหรียญ KTDFI จะถูกโอนจาก<br />
                  <span className="text-green-300">{KTDFI_SENDER_ADDRESS.slice(0, 6)}...{KTDFI_SENDER_ADDRESS.slice(-4)}</span>
                  <br />ไปยังกระเป๋าผู้แนะนำ
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-green-400">
                  ✅ การชำระค่าสมาชิกสำเร็จแล้ว
                </p>
                <p className="text-sm text-green-400">
                  ✅ คุณได้รับ 10,000 KTDFI แล้ว
                </p>
              </div>

              {!ktdfiSenderAccount && (
                <p className="text-sm text-red-400 mt-2">
                  ⚠️ ระบบส่งเหรียญยังไม่พร้อมใช้งาน
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
                  isProcessingFourth || !ktdfiSenderAccount ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 cursor-pointer"
                }`}
                onClick={handleFourthTransaction}
                disabled={isProcessingFourth || !ktdfiSenderAccount}
              >
                {isProcessingFourth ? 'กำลังส่งโบนัส...' : 'ส่งโบนัสให้ผู้แนะนำ'}
              </button>
              <button
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={handleCloseFourthModal}
                disabled={isProcessingFourth || transactionStatus.fourthTransaction}
              >
                {transactionStatus.fourthTransaction ? 'เสร็จสิ้น' : 'ข้าม (บันทึกข้อมูล)'}
              </button>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* D1 Details Modal */}
      {showD1DetailsModal && d1Data && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowD1DetailsModal(false)}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">ข้อมูลสมาชิก Plan B D1</h3>
                <button
                  onClick={() => setShowD1DetailsModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-gray-400">D1 ID:</div>
                  <div className="text-right font-bold text-white">
                    {d1Data.d1_id || 'N/A'}
                  </div>
                  
                  <div className="text-gray-400">ลำดับที่:</div>
                  <div className="text-right font-bold text-white">
                    {d1Data.d1_sequence || '1'}
                  </div>
                  
                  <div className="text-gray-400">วันที่สมัคร:</div>
                  <div className="text-right text-white">
                    {new Date(d1Data.created_at).toLocaleDateString('th-TH')}
                  </div>
                  
                  <div className="text-gray-400">อัตราแลกเปลี่ยนที่สมัคร:</div>
                  <div className="text-right text-white">
                    {formatPOLNumber(d1Data.rate_thb_pol)} THB/POL
                  </div>
                  
                  <div className="text-gray-400">โบนัสที่ใช้แล้ว:</div>
                  <div className="text-right font-bold text-yellow-400">
                    {formatPOLNumber(d1Data.used_bonus_pol)} POL
                  </div>
                  
                  <div className="text-gray-400">จ่ายเพิ่ม:</div>
                  <div className="text-right text-white">
                    {formatPOLNumber(d1Data.append_pol)} POL
                  </div>
                </div>
                
                {/* Transaction Details if available */}
                {d1Data.append_pol_tx_hash && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">ข้อมูลธุรกรรม:</p>
                    <div className="bg-gray-800 p-3 rounded text-xs">
                      <p className="mb-1">
                        <span className="text-gray-400">ธุรกรรม:</span>{' '}
                        <a 
                          href={`https://polygonscan.com/tx/${d1Data.append_pol_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 break-all"
                        >
                          {d1Data.append_pol_tx_hash.slice(0, 20)}...
                        </a>
                      </p>
                      {d1Data.append_pol_date_time && (
                        <p>
                          <span className="text-gray-400">วันที่:</span>{' '}
                          {new Date(d1Data.append_pol_date_time).toLocaleString('th-TH')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Remark Details if available */}
                {d1Data.remark && typeof d1Data.remark === 'object' && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">รายละเอียดเพิ่มเติม:</p>
                    <div className="bg-gray-800 p-3 rounded text-xs">
                      {d1Data.remark.ktdfi_to_member && (
                        <p className="mb-1">
                          <span className="text-gray-400">ได้รับ KTDFI:</span>{' '}
                          <span className="text-green-400">
                            {d1Data.remark.ktdfi_to_member.amount} KTDFI
                          </span>
                        </p>
                      )}
                      {d1Data.remark.net_bonus_used && (
                        <p className="mb-1">
                          <span className="text-gray-400">ใช้โบนัสไป:</span>{' '}
                          <span className="text-yellow-400">
                            {formatPOLNumber(d1Data.remark.net_bonus_used)} POL
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowD1DetailsModal(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  ปิด
                </button>
              </div>
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