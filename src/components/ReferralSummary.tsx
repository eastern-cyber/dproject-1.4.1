"use client";

import Link from "next/link";
import { useState } from "react";

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

const ReferralSummary: React.FC<Props> = ({ referrerId, setReferrerId, users, reportData }) => {
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const matchingUser = users.find(user => user.userId === referrerId);
    const matchingUsers = users.filter(
        (user) => user.referrerId === referrerId && user.userId.trim() !== ""
    ).map((user, index) => ({ ...user, recordNumber: index + 1 }));

    const relevantReports = reportData.filter(report => report.walletAddress === matchingUser?.userId);
    const latestSentDate = relevantReports.length > 0 
        ? relevantReports[relevantReports.length - 1].sentDate 
        : "N/A";

    const totalSentAmount = relevantReports.reduce((sum, report) => sum + Number(report.sentAmount), 0);

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

    // Add useEffect and pagination logic
    const [currentPage, setCurrentPage] = useState(1);
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


    return (
        <>
            <h1 className="text-center text-[20px] font-bold">รายละเอียด ส่วนแบ่งรายได้</h1>
            <h2 className="text-center text-[16px] break-all">ใส่เลขกระเป๋าของท่าน หรือ เลขกระเป๋าของผู้ที่ต้องการจะตรวจสอบ</h2>
            <input
                type="text"
                placeholder="ใส่เลขกระเป๋า..."
                value={referrerId}
                onChange={(e) => setReferrerId(e.target.value)}
                className="text-[18px] text-center border border-gray-400 p-2 rounded mt-4 w-full bg-gray-900 text-white break-all"
            />

            {matchingUser && (
                <table className="table-auto border-collapse border border-gray-500 mt-4 w-full">
                    <thead>
                        <tr>
                            <th className="text-[19px] border border-gray-400 px-4 py-2">รายละเอียดสมาชิก</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th className="text-[18px] text-left font-normal border border-gray-400 px-6 py-2 break-word">
                                <b>เลขกระเป๋า:</b> <span className="text-red-500 break-all">{matchingUser.userId}</span><br />
                                <b>อีเมล:</b> {matchingUser.email || "N/A"}<br />
                                <b>ชื่อ:</b> {matchingUser.name || "N/A"}<br />
                                <b>ลงทะเบียน:</b> {matchingUser.userCreated || "N/A"}<br />
                                <b>เข้า Plan A:</b> {matchingUser.planA || "N/A"}<br />
                                <b>เข้า Plan B:</b> {matchingUser.planB || "N/A"}<br />
                                <span className="text-[19px] text-red-600">
                                    <b>Token ID: {matchingUser.tokenId || "N/A"}</b>
                                </span><br />
                                <b>PR by:</b>&nbsp;
                                <button
                                    className="text-left font-normal text-[18px] text-yellow-500 hover:text-red-500 cursor-pointer break-all"
                                    onClick={() => setReferrerId(matchingUser.referrerId)}
                                >
                                    {matchingUser.referrerId}
                                </button>
                            </th>
                        </tr>
                    </tbody>
                </table>
            )}

            {/* Matching Direct PR Members */}
            {matchingUsers.length > 0 && (
                <>
                    <table className="table-auto border-collapse mt-4 w-full">
                        <thead>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 w-1/6">#</th>
                                <th className="text-[19px] border border-gray-400 px-4 py-2">รายละเอียดสมาชิก Direct PR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user) => (
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
                                </tr>
                            ))}
                        </tbody>
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
                                    <p className="text-[19px] m-2 font-semibold">ส่วนแบ่งรายได้  PR Bonus</p>
                                </th>
                            </tr>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 text-center">
                                    <p className="text-[18px]">
                                        ยอดรวม <span className="text-[24px] text-yellow-500 animate-blink">{matchingUsers.length * 12}</span> POL
                                    </p>
                                    <p className="text-[18px]">
                                        รับแล้ว <span className="text-[24px] text-green-500 animate-blink">{totalSentAmount}</span> POL
                                    </p>
                                    <p className="text-[18px]">
                                        ยอดใหม่ <span className="text-[24px] text-red-500 animate-blink">{matchingUsers.length * 12 - totalSentAmount}</span> POL
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
                                            <p className="mt-3">{latestSentDate}</p>
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

export default ReferralSummary;
