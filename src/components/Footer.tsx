// src/components/Footer.tsx

"use client";

import { Facebook, Instagram, Youtube, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { theme, toggleTheme } = useTheme();

  return (
    <footer className="w-full py-6 mt-8">
      <div className={theme === 'dark' ? 'bg-[#040444] text-amber-100' : 'bg-amber-50 text-gray-900'}>
        <div className="max-w-6xl mx-auto mt-8 py-4 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div className="flex flex-col w-full justify-top items-right">
            <p className="text-[24px] text-yellow-500 font-bold hover:text-red-500">
              <Link href="/">DFI.Fund</Link>
            </p>
            <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}>
            <p className="mt-1 text-[18px]">
              <b>D</b>Project<br /> <b>F</b>inancial<br /> <b>I</b>novation<br />
            </p>
            </div>
            <p className="mt-3 text-[14px] text-gray-500">Version 1.3.1</p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col justify-top md:items-center">
            <p className="text-[18px] font-semibold text-yellow-500 mb-4">Navigation</p>
            <ul className="space-y-2 text-[15px]">
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="/">Home - หน้าแรก</Link></li>
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="/about">About - ข้อมูลโครงการ</Link></li>
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="/timeline">Timeline - ความคืบหน้า</Link></li>
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="/member-area/">MemberArea - พื้นที่สมาชิก</Link></li>
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="/users">All Users - ผู้ใช้งานทั้งหมด</Link></li>
              <li className="hover:text-blue-300 hover:font-semibold"><Link href="http://www.dpjdd.com/">DOS - ตรวจสอบส่วนแบ่งรายได้</Link></li>
            </ul>
          </div>

          {/* Social Icons */}
          <div className="flex flex-col justify-top items-center">
            <p className="flex text-[18px] font-semibold text-yellow-500 mb-4">Follow DProject</p>
              <div className="flex space-x-5 items-center">
                <Link href="https://www.facebook.com/people/KOK-KOK-KOK/61573998052437/" target="_blank" aria-label="Facebook"><Facebook className="w-6 h-6 hover:text-blue-500" /></Link>
                <Link href="#" target="_blank" aria-label="X (formerly Twitter)"><span className="text-[23px] font-bold hover:text-yellow-400">X</span></Link>
                <Link href="https://www.youtube.com/@DProject-w5z" target="_blank" aria-label="YouTube Channel"><Youtube className="w-7 h-7 hover:text-red-500" /></Link>            
                <Link href="https://www.instagram.com/kokkokkok.3k?igsh=emNrZ2tta2drdzV2" target="_blank" aria-label="Instagram"><Instagram className="w-6 h-6 hover:text-orange-500" /></Link>
                <Link href="https://lin.ee/xGUnJcK" target="_blank" aria-label="Line App"><span className="text-[22px] font-bold hover:text-yellow-400">Line</span></Link>
              </div>
              <Link target="_blank" href="https://3k.dfi.fund/templates/index.html"><p className="text-[20px] font-bold mt-4"><span className="text-red-500">Kok</span><span className="text-yellow-500">Kok</span><span className="text-green-500">Kok</span><sup className="text-[10px] font-bold">TM</sup></p></Link>
              <p className={theme === 'dark' ? 'bg-[#040444] text-amber-100' : 'bg-amber-50 text-gray-900'}><b>Web3 SuperApp</b> for the Future.</p>
                <div className="flex items-center mt-2 cursor-pointer" onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      <span>Switch to Dark</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 mr-2" />
                      <span>Switch to Light</span>
                    </>
                  )}
                </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 mb-6 border-t border-gray-700 px-2 pt-4 text-center text-[15px] text-gray-500">
          &copy; {new Date().getFullYear()} <b>DFI.Fund</b> All rights reserved.
        </div>
      </div>
    </footer>
  );
}