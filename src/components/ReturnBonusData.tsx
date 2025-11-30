//src/components/ReturnBonusData.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

interface TransactionData {
    "Transaction Hash": string;
    "DateTime (UTC)": string;
    From: string;
    To: string;
    "Value_OUT(POL)": string;
}

interface UserData {
    userId: string;
    referrerId: string;
    name?: string;
    email?: string;
    tokenId?: string;
    userCreated?: string;
    planA?: string;
    planB?: string;
    recordNumber?: number;
}

interface ReportData {
    walletAddress: string;
    sentAmount: number;
    sentDate: string;
}

interface Props {
    referrerId: string;
    setReferrerId: (id: string) => void;
    users: UserData[];
    reportData: ReportData[];
}

const ReturnBonusData: React.FC<Props> = ({ referrerId, setReferrerId, users, reportData }) => {
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [userPolMap, setUserPolMap] = useState<{ [key: string]: number }>({});
    const [returnBonusTotalPol, setReturnBonusTotalPol] = useState<number>(0);
    const [latestReturnBonusDate, setLatestReturnBonusDate] = useState<string>("N/A");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        // Fetch the JSON data
        fetch("https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.1/main/public/CaringBonus-Payout-Success_Polygonscan.json")
            .then((response) => response.json())
            .then((data: TransactionData[]) => {
                // Create a map to store the total POL for each user
                const polMap: { [key: string]: number } = {};

                data.forEach((transaction) => {
                    const toAddress = transaction.To.toLowerCase();
                    const valueOut = parseFloat(transaction["Value_OUT(POL)"]);
                    if (!isNaN(valueOut)) {
                        polMap[toAddress] = (polMap[toAddress] || 0) + valueOut;
                    }
                });

                setUserPolMap(polMap);
            })
            .catch((error) => {
                console.error("Error fetching transaction data:", error);
            });
    }, []);

    const matchingUser = users.find(user => user.userId === referrerId);
    const matchingUsers = users.filter(
        (user) => user.referrerId === referrerId && user.userId.trim() !== ""
    ).map((user, index) => ({ ...user, recordNumber: index + 1 }));

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})$/);
        if (!match) return "Invalid Date";
        const [, day, month, year, hour, minute, second] = match.map(Number);
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    const formatUTCDate = (utcString: string): string => {
        const date = new Date(utcString);
        if (isNaN(date.getTime())) return "Invalid Date";

        // Add 7 hours for GMT+7 (Bangkok)
        date.setUTCHours(date.getUTCHours() + 7);

        const pad = (n: number) => n.toString().padStart(2, "0");

        const day = pad(date.getUTCDate());
        const month = pad(date.getUTCMonth() + 1);
        const year = date.getUTCFullYear();
        const hours = pad(date.getUTCHours());
        const minutes = pad(date.getUTCMinutes());
        const seconds = pad(date.getUTCSeconds());

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    useEffect(() => {
        const fetchReturnBonusTransactions = async () => {
            try {
                const response = await fetch(
                    "https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.2/main/public/ReturnBonus-Payout-Success_Polygonscan.json"
                );
                const data: TransactionData[] = await response.json();

                const matchingTo = matchingUser?.userId?.toLowerCase();

                if (!matchingTo) {
                    setReturnBonusTotalPol(0);
                    setLatestReturnBonusDate("N/A");
                    return;
                }

                const matchingTxs = data.filter((tx) => tx.To.toLowerCase() === matchingTo);

                const total = matchingTxs.reduce(
                    (sum, tx) => sum + parseFloat(tx["Value_OUT(POL)"] || "0"),
                    0
                );
                setReturnBonusTotalPol(total);

                if (matchingTxs.length > 0) {
                    const latestTx = matchingTxs[matchingTxs.length - 1];
                    const rawDate = latestTx["DateTime (UTC)"];

                    const formattedDate = formatUTCDate(rawDate);
                    setLatestReturnBonusDate(formattedDate);
                } else {
                    setLatestReturnBonusDate("N/A");
                }
            } catch (error) {
                console.error("Error fetching Return Bonus Payout JSON:", error);
                setReturnBonusTotalPol(0);
                setLatestReturnBonusDate("N/A");
            }
        };

        fetchReturnBonusTransactions();
    }, [matchingUser]);

    // Pagination logic
    const usersPerPage = 10;
    const totalPages = Math.ceil(matchingUsers.length / usersPerPage);

    const paginatedUsers = matchingUsers.slice(
        (currentPage - 1) * usersPerPage,
        currentPage * usersPerPage
    );

    const changePage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 7;
        const start = Math.max(1, currentPage - 3);
        const end = Math.min(totalPages, start + maxPagesToShow - 1);

        if (start > 1) {
            pages.push(<span key="startEllipsis">...</span>);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    className={`mx-1 px-2 py-1 rounded ${
                        i === currentPage ? "bg-yellow-500 text-black font-bold" : "bg-gray-700 text-white"
                    } hover:bg-red-600 cursor-pointer`}
                    onClick={() => changePage(i)}
                >
                    {i}
                </button>
            );
        }

        if (end < totalPages) {
            pages.push(<span key="endEllipsis">...</span>);
        }

        return pages;
    };
    
    const paginatedTotalPol = paginatedUsers.reduce((sum, user) => {
        const userIdLower = user.userId.toLowerCase();
        return sum + (userPolMap[userIdLower] || 0);
    }, 0);    

    const grandTotalPol = matchingUsers.reduce((sum, user) => {
        const userIdLower = user.userId.toLowerCase();
        return sum + (userPolMap[userIdLower] || 0);
    }, 0);

    // Calculate return bonus summary using useMemo to avoid recalculating on every render
    const returnBonusSummary = useMemo(() => {
        const total = grandTotalPol;
        const returnKeep = (total / 75) * 25;
        const directReturn = total + returnKeep;
        const received = returnBonusTotalPol;
        const newAmount = total - received;

        const formatNumber = (num: number) =>
            num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });

        return {
            total: formatNumber(directReturn),
            returnKeep: formatNumber(returnKeep),
            receivedTotal: formatNumber(total),
            received: formatNumber(received),
            newAmount: formatNumber(newAmount)
        };
    }, [grandTotalPol, returnBonusTotalPol]);

    return (
        <>
            <h1 className="text-center text-[20px] font-bold">รายละเอียด Return Bonus</h1>
            <input
                type="text"
                placeholder="ใส่เลขกระเป๋า..."
                value={referrerId}
                onChange={(e) => setReferrerId(e.target.value)}
                className="text-[18px] text-center border border-gray-400 p-2 rounded mt-4 w-full bg-gray-900 text-white break-all"
            />

            {/* Matching Direct PR Members */}
            {matchingUsers.length > 0 && (
                <>
                    <table className="table-auto border-collapse mt-4 w-full">
                        <thead>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 w-1/6">#</th>
                                <th className="text-[19px] border border-gray-400 px-4 py-2">Return Bonus from Direct PR</th>
                                <th className="text-[19px] border border-gray-400 px-4 py-2">POL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => {
                                const userIdLower = user.userId.toLowerCase();
                                const totalPol = userPolMap[userIdLower] || 0;

                                return (
                                    <tr key={user.userId}>
                                        <th className="border border-gray-400 px-4 py-2">{user.recordNumber}</th>
                                        <th className="text-[18px] font-normal text-left border border-gray-400 px-4 py-2 break-all relative">
                                            <b>เลขกระเป๋า:</b>&nbsp;
                                            <button
                                                className="text-left font-normal text-[18px] text-yellow-500 hover:text-red-500 cursor-pointer break-all"
                                                onClick={() => setReferrerId(user.userId)}
                                            >
                                                {user.userId}
                                            </button>
                                            <br />
                                            <b>อีเมล:</b> {user.email || "N/A"}

                                            <button
                                                className="absolute top-2 right-4 text-yellow-500 hover:text-red-500 cursor-pointer"
                                                onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                                            >
                                                {expandedUser === user.userId ? "⏶" : "⏷"}
                                            </button>

                                            {expandedUser === user.userId && (
                                                <div className="mt-2 break-word">
                                                    <b>ชื่อ:</b> {user.name || "N/A"}<br />
                                                    <b>ลงทะเบียน:</b> {user.userCreated || "N/A"}<br />
                                                    <b>เข้า Plan A:</b> {formatDate(user.planA)}<br />
                                                    <b>เข้า Plan B:</b> {formatDate(user.planB)}<br />
                                                    <span className="text-[19px] text-red-600">
                                                        <b>Token ID: {user.tokenId || "N/A"}</b>
                                                    </span>
                                                </div>
                                            )}
                                        </th>
                                        <th className="border border-gray-400 px-4 py-2">{totalPol.toFixed(2)}</th>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-900 text-white font-bold">
                                <td className="border border-gray-400 px-4 py-2 text-center" colSpan={2}>
                                    รวม Return Bonus หน้านี้
                                </td>
                                <td className="border border-gray-400 px-4 py-2 text-center">
                                    {paginatedTotalPol.toFixed(2)}
                                </td>
                            </tr>
                            <tr className="bg-gray-800 text-white font-bold">
                                <td className="border border-gray-400 px-4 py-2 text-center" colSpan={2}>
                                    รวม Return Bonus ทั้งหมด &#40; POL &#41;
                                </td>
                                <td className="border border-gray-400 px-4 py-2 text-center">
                                    {grandTotalPol.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="flex justify-center items-center mt-6 space-x-1 text-sm flex-wrap">
                        <button
                            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                            onClick={() => changePage(1)}
                            disabled={currentPage === 1}
                        >
                            |&lt;
                        </button>
                        <button
                            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                            onClick={() => changePage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            &lt;
                        </button>
                        {renderPageNumbers()}
                        <button
                            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                            onClick={() => changePage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            &gt;
                        </button>
                        <button
                            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                            onClick={() => changePage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            &gt;|
                        </button>
                        <div className="pl-2 ml-4 text-white">
                            หน้า <span className="text-yellow-400">{currentPage}</span> /{" "}
                            <span className="text-yellow-400">{totalPages}</span>
                        </div>
                    </div>

                    {/* Summary table */}
                    <table className="w-full justify-center items-center">
                        <tbody>
                            <tr>
                                <th>
                                    <p className="mb-12 text-center m-4 pr-10 text-lg font-semibold">
                                        <span className="text-[19px] text-center">
                                            รวมจำนวนสมาชิก Direct PR : &nbsp;
                                            <span className="text-[24px] text-yellow-500">{matchingUsers.length}</span> ท่าน
                                        </span>
                                    </p>
                                </th>
                            </tr>
                        </tbody>
                        <tbody className="mt-6">
                            <tr className="bg-gray-900 text-[19px] font-bold">
                                <th className="border border-gray-400 py-3 px-4 text-center">
                                    <p className="text-[19px] m-2 font-semibold">ส่วนแบ่งรายได้  Return Bonus</p>
                                    <p className="text-[19px] m-2 font-semibold">100% Caring Bonus ของ Direct PR</p>
                                </th>
                            </tr>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 text-center">
                                    <p className="text-[18px]">
                                        ยอดรวม
                                        <span className="text-[24px] text-yellow-500 animate-blink">
                                            &nbsp;{returnBonusSummary.total}&nbsp;
                                        </span>{' '}
                                        POL
                                    </p>
                                    <p className="text-[18px]">
                                         เก็บสะสม 25%{' '}
                                        <span className="text-[24px] text-yellow-500 animate-blink">
                                            &nbsp;{returnBonusSummary.returnKeep}&nbsp;
                                        </span>{' '}
                                        POL
                                    </p>
                                    <p className="text-[18px]">
                                        ยอดรับ{' '}
                                        <span className="text-[24px] text-yellow-500 animate-blink">
                                            &nbsp;{returnBonusSummary.receivedTotal}&nbsp;
                                        </span>{' '}
                                        POL
                                    </p>
                                    <p className="text-[18px]">
                                        รับแล้ว
                                        <span className="text-[24px] text-yellow-500 animate-blink">
                                            &nbsp;{returnBonusSummary.received}&nbsp;
                                        </span>{' '}
                                        POL
                                    </p>
                                    <p className="text-[18px]">
                                         ยอดใหม่{' '}
                                        <span className="text-[24px] text-yellow-500 animate-blink">
                                            &nbsp;{returnBonusSummary.newAmount}&nbsp;
                                        </span>{' '}
                                        POL
                                    </p>
                                </th>
                            </tr>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 text-center">
                                    <p className="text-[19px]">
                                        รับครั้งล่าสุด<br />
                                        <Link
                                            href={`https://polygonscan.com/address/${referrerId}`}
                                            className="text-[18px] text-blue-300 hover:text-red-500 cursor-pointer"
                                            target="_blank"
                                        >
                                            <p className="mt-3">{latestReturnBonusDate}</p>
                                        </Link>
                                    </p>
                                </th>
                            </tr>
                        </tbody>
                    </table>
                </>
            )}
        </>
    );
};

export default ReturnBonusData;