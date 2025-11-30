// src/app/referrer/confirm/page.tsx
// separate two modals for each particular send POL transaction
// Retry modal until each particular trasaction succeeded
// src/app/referrer/confirm/page.tsx
// src/app/referrer/confirm/page.tsx
"use client";

import { useTheme } from '@/context/ThemeContext';
import { client } from "@/lib/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import WalletConnect from "../../../components/WalletConnect";
import { useActiveAccount } from "thirdweb/react";
import dprojectIcon from "../../../../public/DProjectLogo_650x600.svg";
import { defineChain, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import Footer from "@/components/Footer";
import { prepareContractCall, toWei, sendTransaction, readContract } from "thirdweb";
import { ConfirmModal } from "@/components/confirmModal";
import { useRouter } from "next/navigation";
import { privateKeyToAccount } from "thirdweb/wallets";

// Constants
const RECIPIENT_ADDRESS = "0x3BBf139420A8Ecc2D06c64049fE6E7aE09593944";
const KTDFI_SENDER_ADDRESS = "0x984395c00E5451437ed47346e6911c2F5CC31ad3";
const KTDFI_CONTRACT_ADDRESS = "0x532313164FDCA3ACd2C2900455B208145f269f0e";
const KTDFI_AMOUNT = "1000"; // 1,000 KTDFI tokens
const EXCHANGE_RATE_REFRESH_INTERVAL = 300000; // 5 minutes in ms
const EXCHANGE_RATE_BUFFER = 0.1; // 0.1 THB buffer to protect against fluctuations
const FALLBACK_EXCHANGE_RATE = 4.35; // Fallback rate if all APIs fail

// Membership options
const MEMBERSHIP_OPTIONS = [
  {
    id: 'novice',
    name: 'Premium Member',
    thb: 400,
    description: '',
    ktdfiBonus: 1000
  },
  {
    id: 'jubilant',
    name: 'Special 1',
    thb: 4000,
    description: '',
    ktdfiBonus: 50000
  },
  {
    id: 'buoyant',
    name: 'Special 2',
    thb: 8000,
    description: '',
    ktdfiBonus: 120000
  }
];

// KTDFI Sender Private Key (should be in environment variables)
const KTDFI_SENDER_PRIVATE_KEY = process.env.NEXT_PUBLIC_KTDFI_SENDER_PRIVATE_KEY;

type UserData = {
  var1: string;
  var2: string;
  var3: string;
  var4: string;
};

type TransactionStatus = {
  firstTransaction: boolean;
  secondTransaction: boolean;
  thirdTransaction: boolean;
  error?: string;
};

type PlanAData = {
  dateTime: string;
  POL: string;
  rateTHBPOL: string;
  seventyPOL: string;
  thirtyPOL: string;
  seventyTxHash: string;
  thirtyTxHash: string;
  ktdfiTxHash: string;
  linkIPFS: string;
  membershipType: string;
  membershipName: string;
  membershipTHB: number;
};

type DatabaseUserData = {
  user_id: string;
  referrer_id: string;
  plan_a: PlanAData;
};

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

// Membership Selection Modal Component
const MembershipSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (membership: typeof MEMBERSHIP_OPTIONS[0]) => void;
  polBalance: string;
  exchangeRate: number | null;
}> = ({ isOpen, onClose, onSelect, polBalance, exchangeRate }) => {
  if (!isOpen) return null;

  return (
    <ConfirmModal onClose={onClose} disableClose={false}>
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full">
        <h3 className="text-[24px] font-bold mb-2 text-center">รูปแบบสมาชิก</h3>
        <p className="text-gray-300 text-[18px] text-center pb-6">Membership</p>
        
        <div className="space-y-4 mb-6">
          {MEMBERSHIP_OPTIONS.map((membership) => (
            <div
              key={membership.id}
              className="p-4 bg-emerald-950 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onSelect(membership)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-amber-300">{membership.name}</h4>
                  <p className="text-yellow-300 text-sm">{membership.description}</p>
                  <p className="text-purple-300 text-m mt-1">
                    โบนัส: {membership.ktdfiBonus.toLocaleString()} KTDFI
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-300 font-bold text-lg">{membership.thb.toLocaleString()} THB</p>
                  {exchangeRate && (
                    <p className="text-gray-200 text-sm">
                      ≈ {((membership.thb / exchangeRate)).toFixed(4)} POL
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {exchangeRate && (
          <div className="text-center text-sm text-gray-400 mb-4">
            <p>อัตราแลกเปลี่ยนปัจจุบัน: {exchangeRate.toFixed(4)} THB/POL</p>
            <p>POL ในกระเป๋าของคุณ: <span className="text-green-400">{polBalance}</span></p>
          </div>
        )}

        <button
          className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-lg cursor-pointer"
          onClick={onClose}
        >
          ปิด
        </button>
      </div>
    </ConfirmModal>
  );
};

const ConfirmPage = () => {
  const router = useRouter();
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    firstTransaction: false,
    secondTransaction: false,
    thirdTransaction: false
  });
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [adjustedExchangeRate, setAdjustedExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showMembershipSelection, setShowMembershipSelection] = useState(false);
  const [showFirstConfirmationModal, setShowFirstConfirmationModal] = useState(false);
  const [showSecondConfirmationModal, setShowSecondConfirmationModal] = useState(false);
  const [showThirdConfirmationModal, setShowThirdConfirmationModal] = useState(false);
  const [isProcessingFirst, setIsProcessingFirst] = useState(false);
  const [isProcessingSecond, setIsProcessingSecond] = useState(false);
  const [isProcessingThird, setIsProcessingThird] = useState(false);
  const [firstTxHash, setFirstTxHash] = useState<string>("");
  const [secondTxHash, setSecondTxHash] = useState<string>("");
  const [thirdTxHash, setThirdTxHash] = useState<string>("");
  const [polBalance, setPolBalance] = useState<string>("0");
  const [isMember, setIsMember] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [ktdfiSenderAccount, setKtdfiSenderAccount] = useState<any>(null);
  const [selectedMembership, setSelectedMembership] = useState<typeof MEMBERSHIP_OPTIONS[0] | null>(null);
  const account = useActiveAccount();

  // Initialize KTDFI sender account
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

  // Fetch wallet balance when account changes
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
        console.error("Error fetching balance:", err);
        setPolBalance("0");
      }
    };

    fetchBalance();
  }, [account]);

  // Fetch THB to POL exchange rate and calculate adjusted rate
  useEffect(() => {
    const updateExchangeRate = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    updateExchangeRate();
    const interval = setInterval(updateExchangeRate, EXCHANGE_RATE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Exchange rate fetch function
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

  // Retrieve stored data when page loads
  useEffect(() => {
    const storedData = sessionStorage.getItem("mintingsData");
    if (storedData) {
      try {
        setData(JSON.parse(storedData));
      } catch (err) {
        console.error("Error parsing stored data:", err);
      }
    }
  }, []);

  // Check membership status from PostgreSQL
  useEffect(() => {
    const checkMembership = async () => {
      if (!account?.address) {
        setIsMember(false);
        return;
      }

      setLoadingMembership(true);
      try {
        const response = await fetch(`/api/check-membership?walletAddress=${account.address}`);
        if (!response.ok) throw new Error("Failed to fetch membership data");
        
        const result = await response.json();
        setIsMember(result.isMember);
      } catch (error) {
        console.error("Error checking membership:", error);
        setIsMember(false);
      } finally {
        setLoadingMembership(false);
      }
    };

    checkMembership();
  }, [account?.address]);

  const calculatePolAmount = () => {
    if (!adjustedExchangeRate || !selectedMembership) return null;
    const polAmount = selectedMembership.thb / adjustedExchangeRate;
    return polAmount.toFixed(4);
  };

  // IPFS Storage Function with error handling
  const storeReportInIPFS = async (report: unknown): Promise<string | null> => {
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
            name: `membership-payment-${Date.now()}.json`
          }
        })
      });

      if (!response.ok) {
        console.warn('Failed to store report in IPFS, continuing without IPFS storage');
        return null;
      }
      
      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.warn("Error storing report in IPFS, continuing without IPFS storage:", error);
      return null;
    }
  };

  const addUserToDatabase = async (userData: DatabaseUserData) => {
    try {
      const response = await fetch('/api/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`Database error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error adding user to database:', error);
      throw error;
    }
  };

  const executeTransaction = async (to: string, amountWei: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract: getContract({
          client,
          chain: defineChain(polygon),
          address: "0x0000000000000000000000000000000000001010"
        }),
        method: {
          type: "function",
          name: "transfer",
          inputs: [
            { type: "address", name: "to" },
            { type: "uint256", name: "value" }
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "payable"
        },
        params: [to, amountWei],
        value: amountWei
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: account!
      });

      return { success: true, transactionHash };
    } catch (error) {
      console.error("Transaction failed:", error);
      return { success: false, error: (error as Error).message };
    }
  };

  const executeKTDFITransaction = async (to: string, amount: string) => {
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
      if (balanceInTokens < Number(amount)) {
        throw new Error(`Insufficient KTDFI balance. Sender has ${balanceInTokens} KTDFI, but needs ${amount} KTDFI`);
      }

      console.log(`Sending ${amount} KTDFI from ${KTDFI_SENDER_ADDRESS} to ${to}`);

      // KTDFI is an ERC-20 token, so we need to use the transfer function
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
        params: [to, toWei(amount)] // Convert KTDFI amount to wei (assuming 18 decimals)
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: ktdfiSenderAccount // Use the KTDFI sender's account
      });

      console.log(`KTDFI transaction successful: ${transactionHash}`);
      return { success: true, transactionHash };
    } catch (error) {
      console.error("KTDFI transaction failed:", error);
      return { success: false, error: (error as Error).message };
    }
  };

  // Membership selection handler
  const handleMembershipSelect = (membership: typeof MEMBERSHIP_OPTIONS[0]) => {
    setSelectedMembership(membership);
    setShowMembershipSelection(false);
    setShowFirstConfirmationModal(true);
  };

  const handleFirstTransaction = async () => {
    if (!account || !adjustedExchangeRate || !data?.var1 || !selectedMembership) return;
    
    setIsProcessingFirst(true);
    setTransactionError(null);

    try {
      const totalPolAmount = calculatePolAmount();
      if (!totalPolAmount) throw new Error("Unable to calculate POL amount");

      const totalAmountWei = toWei(totalPolAmount);
      const seventyPercentWei = BigInt(Math.floor(Number(totalAmountWei) * 0.7));

      // Execute first transaction (70% to fixed recipient)
      const firstTransaction = await executeTransaction(RECIPIENT_ADDRESS, seventyPercentWei);
      
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
    if (!account || !adjustedExchangeRate || !data?.var1 || !firstTxHash || !selectedMembership) return;
    
    setIsProcessingSecond(true);
    setTransactionError(null);

    try {
      const totalPolAmount = calculatePolAmount();
      if (!totalPolAmount) throw new Error("Unable to calculate POL amount");

      const totalAmountWei = toWei(totalPolAmount);
      const seventyPercentWei = BigInt(Math.floor(Number(totalAmountWei) * 0.7));
      const thirtyPercentWei = BigInt(totalAmountWei) - seventyPercentWei;

      // Execute second transaction (30% to referrer)
      const secondTransaction = await executeTransaction(data.var1, thirtyPercentWei);
      
      if (!secondTransaction.success) {
        throw new Error(`Second transaction failed: ${secondTransaction.error}`);
      }
      
      setSecondTxHash(secondTransaction.transactionHash!);
      setTransactionStatus(prev => ({ ...prev, secondTransaction: true }));

      // Close second modal and open third modal for KTDFI transfer
      setShowSecondConfirmationModal(false);
      setShowThirdConfirmationModal(true);

    } catch (err) {
      console.error("Second transaction failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingSecond(false);
    }
  };

  const handleThirdTransaction = async () => {
    if (!account || !firstTxHash || !secondTxHash || !ktdfiSenderAccount || !selectedMembership) return;
    
    setIsProcessingThird(true);
    setTransactionError(null);

    try {
      // Calculate POL amount first
      const totalPolAmount = calculatePolAmount();
      if (!totalPolAmount) throw new Error("Unable to calculate POL amount");

      const totalAmountWei = toWei(totalPolAmount);
      const seventyPercentWei = BigInt(Math.floor(Number(totalAmountWei) * 0.7));
      const thirtyPercentWei = BigInt(totalAmountWei) - seventyPercentWei;

      // Execute third transaction (KTDFI token transfer to new member)
      const ktdfiAmount = selectedMembership.ktdfiBonus.toString();
      const thirdTransaction = await executeKTDFITransaction(account.address, ktdfiAmount);
      
      if (!thirdTransaction.success) {
        throw new Error(`KTDFI transaction failed: ${thirdTransaction.error}`);
      }
      
      setThirdTxHash(thirdTransaction.transactionHash!);
      setTransactionStatus(prev => ({ ...prev, thirdTransaction: true }));

      // Get current time in Bangkok timezone
      const now = new Date();
      const formattedDate = now.toLocaleString('en-GB', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');

      // Store report in IPFS (optional - will continue even if it fails)
      let ipfsHash = null;
      let ipfsLink = "N/A";

      try {
        const report = {
          senderAddress: account.address,
          dateTime: formattedDate,
          timezone: "Asia/Bangkok (UTC+7)",
          referrer: data!.var1,
          membershipType: selectedMembership.id,
          membershipName: selectedMembership.name,
          membershipTHB: selectedMembership.thb,
          currentExchangeRate: exchangeRate,
          adjustedExchangeRate: adjustedExchangeRate,
          exchangeRateBuffer: EXCHANGE_RATE_BUFFER,
          transactions: [
            {
              recipient: RECIPIENT_ADDRESS,
              amountPOL: (Number(seventyPercentWei) / 10**18).toFixed(4),
              amountTHB: (selectedMembership.thb * 0.7).toFixed(2),
              transactionHash: firstTxHash
            },
            {
              recipient: data!.var1,
              amountPOL: (Number(thirtyPercentWei) / 10**18).toFixed(4),
              amountTHB: (selectedMembership.thb * 0.3).toFixed(2),
              transactionHash: secondTxHash
            },
            {
              type: "KTDFI_TOKEN_TRANSFER",
              recipient: account.address,
              amountKTDFI: ktdfiAmount,
              sender: KTDFI_SENDER_ADDRESS,
              transactionHash: thirdTransaction.transactionHash
            }
          ],
          totalAmountPOL: totalPolAmount,
          totalAmountTHB: selectedMembership.thb
        };

        ipfsHash = await storeReportInIPFS(report);
        if (ipfsHash) {
          ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          setIpfsHash(ipfsHash);
        }
      } catch (ipfsError) {
        console.warn("IPFS storage failed, but continuing with database update:", ipfsError);
        // Continue with database update even if IPFS fails
      }

      // Add user to PostgreSQL database (this will happen even if IPFS fails)
      const newUser: DatabaseUserData = {
        user_id: account.address,
        referrer_id: data!.var1,
        plan_a: {
          dateTime: formattedDate,
          POL: totalPolAmount,
          rateTHBPOL: adjustedExchangeRate!.toFixed(4),
          seventyPOL: (Number(seventyPercentWei) / 10**18).toFixed(4),
          thirtyPOL: (Number(thirtyPercentWei) / 10**18).toFixed(4),
          seventyTxHash: firstTxHash,
          thirtyTxHash: secondTxHash,
          ktdfiTxHash: thirdTransaction.transactionHash!,
          linkIPFS: ipfsLink,
          membershipType: selectedMembership.id,
          membershipName: selectedMembership.name,
          membershipTHB: selectedMembership.thb
        }
      };

      await addUserToDatabase(newUser);

      setIsTransactionComplete(true);
      setShowThirdConfirmationModal(false);
      
      // Redirect to user page after successful completion
      router.push(`/users/${account.address}`);

    } catch (err) {
      console.error("Third transaction or database update failed:", err);
      setTransactionError(`การทำรายการล้มเหลว: ${(err as Error).message}`);
    } finally {
      setIsProcessingThird(false);
    }
  };

  const handleCloseFirstModal = () => {
    if (transactionStatus.firstTransaction) {
      // If first transaction is already completed, don't allow closing
      return;
    }
    setShowFirstConfirmationModal(false);
    setSelectedMembership(null);
    setTransactionError(null);
  };

  const handleCloseSecondModal = () => {
    if (transactionStatus.secondTransaction) {
      // If second transaction is already completed, don't allow closing
      return;
    }
    setShowSecondConfirmationModal(false);
    setTransactionError(null);
  };

  const handleCloseThirdModal = () => {
    if (transactionStatus.thirdTransaction) {
      // If third transaction is already completed, don't allow closing
      return;
    }
    setShowThirdConfirmationModal(false);
    setTransactionError(null);
  };

  const handleCloseMembershipModal = () => {
    setShowMembershipSelection(false);
  };

  const PaymentButton = () => {
    if (loadingMembership) {
      return (
        <div className="flex justify-center py-4">
          <p className="text-red-600 text-[18px]">กำลังตรวจสอบสถานะสมาชิก...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 md:gap-8">
        <p className="mt-4 text-center text-[18px] text-gray-200">
          <b>รูปแบบสมาชิก</b>
          {adjustedExchangeRate && (
            <>
              <br />
              <span className="text-[17px] text-green-400">
                อัตราแลกเปลี่ยน: {adjustedExchangeRate.toFixed(2)} THB/POL
              </span>
            </>
          )}
          {loading && !error && (
            <span className="text-sm text-red-600 text-[18px]">กำลังโหลดอัตราแลกเปลี่ยน...</span>
          )}
          {error && (
            <span className="text-sm text-yellow-500">{error}</span>
          )}
        </p>
        <div className="flex flex-col gap-2 md:gap-4">
          {isMember ? (
            <button
              className="flex flex-col mt-1 border border-zinc-100 px-4 py-3 rounded-lg bg-gray-600 cursor-not-allowed"
              disabled
            >
              <span className="text-[18px] text-gray-900">ท่านเป็นสมาชิกอยู่แล้ว</span>
            </button>
          ) : (
            <button
              className={`flex flex-col mt-1 border border-zinc-100 px-4 py-3 rounded-lg transition-colors ${
                !account || !adjustedExchangeRate || isProcessingFirst || isProcessingSecond || isProcessingThird
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-red-700 hover:bg-red-800 hover:border-zinc-400 cursor-pointer"
              }`}
              onClick={() => setShowMembershipSelection(true)}
              disabled={!account || !adjustedExchangeRate || isProcessingFirst || isProcessingSecond || isProcessingThird}
            >
              <span className="text-[18px]">
                {!account ? "กรุณาเชื่อมต่อกระเป๋า" : "ดำเนินการต่อ"}
              </span>
            </button>
          )}
        </div>
        <p className="text-center text-[18px] text-gray-200">
          <p>
          เพื่อสนับสนุน <b>แอพพลิเคชั่น <span className="text-[26px] text-red-600">ก๊อกๆๆ</span></b> <br />
          ถือเป็นการยืนยันสถานภาพ
          </p>
          <span className="text-yellow-500 text-[22px]">
            <b>&quot;สมาชิกพรีเมี่ยม&quot;</b>
          </span><br />
          ภายใต้การแนะนำของ<br />
        </p>
        {data && (
          <div className="text-center text-[18px] text-gray-300 bg-gray-900 p-4 border border-zinc-300 rounded-lg">
            <p className="text-lg text-gray-300">
              <b>เลขกระเป๋าผู้แนะนำ:</b> {data.var1.slice(0, 6)}...{data.var1.slice(-4)}
            </p>
            <p className="text-lg text-gray-300 mt-2">
              <b>อีเมล:</b> {data.var2}
            </p>
            <p className="text-lg text-gray-300 mt-2">
              <b>ชื่อ:</b> {data.var3}
            </p>
            <p className="text-lg text-red-500 mt-2">
              <b>Token ID: {data.var4}</b>
            </p>            
          </div>
        )}
      </div>
    );
  };

  const { theme } = useTheme();

  return (
    <main className="p-4 pb-10 min-h-[100vh] flex flex-col justify-center items-center bg-gray-950">
      <div className="{theme === 'dark' ? 'bg-[#110030] text-white' : 'bg-white text-black'}">
      <div className="flex flex-col items-center justify-center p-6 md:p-10 m-2 md:m-5 border border-gray-800 rounded-lg max-w-md w-full">
        <Image
          src={dprojectIcon}
          alt="DProject Logo"
          className="mb-4 size-[80px] md:size-[100px]"
          style={{
            filter: "drop-shadow(0px 0px 24px #a726a9a8"
          }}
          priority
        />
        <p className="p-4 text-2xl text-amber-400 font-semibold md:font-bold tracking-tighter text-center">
          ยืนยันการเป็นสมาชิก
        </p>
        
        <WalletConnect />
        
        {data ? (
          <>
            <div className="flex flex-col items-center justify-center w-full p-2 m-2">
              <PaymentButton />
              
              {/* Membership Selection Modal */}
              <MembershipSelectionModal
                isOpen={showMembershipSelection}
                onClose={handleCloseMembershipModal}
                onSelect={handleMembershipSelect}
                polBalance={polBalance}
                exchangeRate={exchangeRate}
              />

              {/* First Confirmation Modal - Cannot be closed if transaction is in progress or completed */}
              {showFirstConfirmationModal && selectedMembership && (
                <ConfirmModal 
                  onClose={handleCloseFirstModal}
                  disableClose={isProcessingFirst || transactionStatus.firstTransaction}
                >
                  <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
                    <h3 className="text-xl font-bold mb-4 text-center">ยืนยันการชำระครั้งที่ 1</h3>
                    <div className="mb-6 text-center">
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                        <p className="text-lg font-bold text-white">{selectedMembership.name}</p>
                        <p className="text-yellow-500 text-[22px] font-bold">
                          {selectedMembership.thb.toLocaleString()} THB
                        </p>
                        <p className="text-gray-400 text-sm">{selectedMembership.description}</p>
                      </div>
                      <p className="text-[18px] text-gray-200">
                        โอนค่าสมาชิกส่วนที่ 1 (70%)<br />
                        <span className="text-yellow-500 text-[22px] font-bold">
                          {(selectedMembership.thb * 0.7).toFixed(2)} THB <br />
                          (≈ {(Number(calculatePolAmount()) * 0.7).toFixed(4)} POL)
                        </span>
                        <p className="text-[16px] mt-2 text-gray-200">ไปยังระบบ</p>
                      </p>
                      {exchangeRate && adjustedExchangeRate && (
                        <div className="mt-3 text-sm text-gray-300">
                          <p>อัตราแลกเปลี่ยน: {adjustedExchangeRate.toFixed(4)} THB/POL</p>
                          {error && <p className="text-yellow-400 text-xs mt-1">{error}</p>}
                        </div>
                      )}
                      {account && (
                        <p className="mt-3 text-[16px] text-gray-200">
                          POL ในกระเป๋าของคุณ: <span className="text-green-400">{polBalance}</span>
                        </p>
                      )}
                      {account && parseFloat(polBalance) < parseFloat(calculatePolAmount() || "0") && (
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
                        className={`px-6 py-3 rounded-lg font-medium  text-[17px] ${
                          !account || parseFloat(polBalance) < parseFloat(calculatePolAmount() || "0") || isProcessingFirst
                            ? "bg-gray-600 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 cursor-pointer"
                        }`}
                        onClick={handleFirstTransaction}
                        disabled={!account || isProcessingFirst || parseFloat(polBalance) < parseFloat(calculatePolAmount() || "0")}
                      >
                        {isProcessingFirst ? 'กำลังดำเนินการ...' : 'ยืนยันการโอนครั้งที่ 1'}
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

              {/* Second Confirmation Modal - Cannot be closed if transaction is in progress or completed */}
              {showSecondConfirmationModal && (
                <ConfirmModal 
                  onClose={handleCloseSecondModal}
                  disableClose={isProcessingSecond || transactionStatus.secondTransaction}
                >
                  <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
                    <h3 className="text-xl font-bold mb-4 text-center">ยืนยันการชำระครั้งที่ 2</h3>
                    <div className="mb-6 text-center">
                      {selectedMembership && (
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                          <p className="text-lg font-bold text-white">{selectedMembership.name}</p>
                          <p className="text-yellow-500 text-[22px] font-bold">
                            {selectedMembership.thb.toLocaleString()} THB
                          </p>
                        </div>
                      )}
                      <p className="text-[18px] text-gray-200">
                        โอนค่าสมาชิกส่วนที่ 2 (30%)<br />
                        <span className="text-yellow-500 text-[22px] font-bold">
                          {selectedMembership ? (selectedMembership.thb * 0.3).toFixed(2) : '0.00'} THB (≈ {(Number(calculatePolAmount()) * 0.3).toFixed(4)} POL)
                        </span>
                        <p className="text-[16px] mt-2 text-gray-200">ไปยังผู้แนะนำ</p>
                      </p>
                      {data && (
                        <p className="text-sm text-gray-300 mt-2">
                          ผู้แนะนำ: {data.var1.slice(0, 6)}...{data.var1.slice(-4)}
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
                          isProcessingSecond ? "bg-gray-600 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 cursor-pointer"
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

              {/* Third Confirmation Modal - KTDFI Token Transfer */}
              {showThirdConfirmationModal && (
                <ConfirmModal 
                  onClose={handleCloseThirdModal}
                  disableClose={isProcessingThird || transactionStatus.thirdTransaction}
                >
                  <div className="p-6 bg-gray-900 rounded-lg border border-gray-700 max-w-md">
                    <h3 className="text-xl font-bold mb-4 text-center">รับเหรียญ KTDFI</h3>
                    <div className="mb-6 text-center">
                      {selectedMembership && (
                        <div className="mb-4 p-3 bg-purple-800 rounded-lg">
                          <p className="text-lg font-bold text-white">{selectedMembership.name}</p>
                          <p className="text-yellow-500 text-[22px] font-bold">
                            {selectedMembership.thb.toLocaleString()} THB
                          </p>
                          <p className="text-purple-300 text-lg font-bold">
                            โบนัส: {selectedMembership.ktdfiBonus.toLocaleString()} KTDFI
                          </p>
                        </div>
                      )}
                      <p className="text-[18px] text-gray-200">
                        ขอแสดงความยินดี!<br />
                        คุณจะได้รับเหรียญ KTDFI
                        <span className="text-yellow-500 text-[22px] font-bold">
                          <br />{selectedMembership?.ktdfiBonus.toLocaleString()} KTDFI
                        </span>
                        <p className="text-[16px] mt-2 text-gray-200">Welcome Bonus</p>
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
                        ✅ การโอนค่าสมาชิกทั้ง 2 ครั้งสำเร็จแล้ว
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
                        {transactionStatus.thirdTransaction ? 'เสร็จสิ้น' : 'ข้าม'}
                      </button>
                    </div>
                  </div>
                </ConfirmModal>
              )}
            </div>
            <div className="w-full text-center text-gray-200 flex flex-col items-center justify-center p-3 m-2 border border-gray-800 rounded-lg break-all">
              <p className="mb-4 font-medium"><u>ข้อมูลเพื่อการตรวจสอบระบบ</u></p> 
              <p className="mb-3">เลขกระเป๋าผู้แนะนำ:<br /> {data.var1}</p>
              <p className="mb-3">อีเมล: {data.var2}</p>
              <p className="mb-3">ชื่อ: {data.var3}</p>
              <p>TokenId: {data.var4}</p>
            </div>
          </>
        ) : (
          <p className="text-red-400 py-4">ไม่พบข้อมูลผู้แนะนำ</p>
        )}

        {isTransactionComplete && ipfsHash && (
          <div className="mt-4 p-4 bg-green-900 border border-green-400 rounded-lg">
            <p className="text-green-200 text-center">
              รายงานถูกเก็บไว้ใน IPFS สำเร็จ!
            </p>
            <p className="text-green-200 text-sm text-center mt-2">
              Hash: {ipfsHash.slice(0, 12)}...{ipfsHash.slice(-8)}
            </p>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-blue-300 underline mt-2"
            >
              ดูรายงานใน IPFS
            </a>
          </div>
        )}
      </div>
      </div>
      <div className='w-full mt-8'>
        <Footer />
      </div>
    </main>    
  );
};

export default ConfirmPage;