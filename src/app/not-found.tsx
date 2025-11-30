"use client";
import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="p-4 pb-10 min-h-[100vh] flex flex-col justify-items-center">
    <div className="flex flex-col justify-items-center p-10 m-5 border border-gray-800 rounded-lg break-words">
        {/* <div className="text-center flex flex-col items-center">
          <p>Please wait for system update to Plan B service</p>
          <p>ปิดระบบชั่วคราวเพื่อเตรียมรองรับแผน B</p>
          <p>&nbsp;</p>
          <p>System will open again on <br /> 1 April 2025 at 10:00 am. for Plan A Participation Process</p>
          <p>ระบบจะเปิดให้ทำการยืนยันเข้าร่วมแผน A อีกครั้งหนึ่ง ในวันที่ <br /> 1 เมษายน 2568 เวลา 10:00 น.</p>
          <p>&nbsp;</p>
          <p>Sorry for the inconvenience!</p>
          <p>ขออภัยในความไม่สะดวก!</p>
        </div> */}
        <div className="text-center flex flex-col items-center">
          <p>This area is not available<br />to your obligation.<br />We apologize for the inconvenience!</p>
          <p>&nbsp;</p>
          <p>ท่านไม่ได้รับสิทธิ์<br />ในการเข้าถึงพื้นที่นี้<br />ขออภัยในความไม่สะดวก!</p>
        </div>
        <div className="flex flex-col items-center">
            <Link 
                className="flex flex-col mt-8 border border-zinc-500 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors hover:border-zinc-800"
                href="/">
                Home / กลับหน้าหลัก
            </Link>
        </div>
    </div>
    </main>
  )
}
