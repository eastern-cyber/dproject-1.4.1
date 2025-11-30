import React from "react";
import "./timeline.css";
import Footer from "@/components/Footer";
import Link from "next/link";

const Timeline: React.FC = () => {
  return (
    <div style={{
        margin: "25px 25px 25px 25px",
    }}>
        <div style={{
            fontSize:"25px",
            textAlign:"center",
            fontWeight:"bold",
            marginTop:"60px",
        }}>
            DProject Timeline
        </div>
        <div className="timeline">
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>08.08.2024</b></ul>
                <h3><b>Proof of Concept</b></h3>
                <p>ได้ข้อสรุปโครงการ แนวทางการดำเนินงาน แผนโครสร้างรายได้ และตั้งทีมทำงาน</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>09.09.2024</b></ul>
                <h3><b>Kickoff</b></h3>
                <p>ฤกษ์งามยามดี เริ่มดำเนินงาน</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>10.10.2024</b></ul>
                <h3><b>Backend System</b></h3>
                <p>ระบบหลังบ้าน การต่อสายงาน แผนโครงสร้างรายได้ และ การเชื่อมต่อแบบออโต้รัน</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>11.11.2024</b></ul>
                <h3><b>DProject Token and 3K NFT</b></h3>
                <p>กำเนิด DProject Token และ 3K NFT สำหรับการใช้งาน Premium Member</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>31.12.2024</b></ul>
                <h3><Link target="_blank" href="https://3k.aseanquality.com/"><b>3K SocialApp v.1.1</b></Link></h3>
                <p>กำเนิดต้นแบบ Application ก๊อกๆๆ เพื่อให้หน้าตา และ การใช้งานเบื้องต้น</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>18.01.2025</b></ul>
                <h3><b>18K Meeting</b></h3>
                <p>ประชุมนัดแรก 18 ขุนพล ผู้นำทัพ เผยแผ่โครงการดีๆ สู่สาธารณะ โดยเน้นการสร้างเครือข่ายสายงานอันทรงประสิทธิภาพ</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>24.01.2025</b></ul>
                <h3><b>DProject Referrer Link (Test)</b></h3>
                <p>ลิ้งค์แนะนำสมาชิก (ทดสอบ) ทดลองการใช้งาน ส่งลิ้งค์แนะนำสมาชิก ซื้อ NFT เพื่อการสมัครสมาชิก</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>28.01.2025</b></ul>
                <h3><b>Member Backend</b></h3>
                <p>เชื่อมต่อระบบจัดการสมาชิกหลังบ้าน ฐานข้อมูลการสมัครสมาชิกจากลิ้งค์แนะนำ</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>08.02.2025</b></ul>
                <h3><b>3K SocialApp v.1.2</b></h3>
                <p>3K Application ก๊อกๆๆ ที่สามารถใช้งานได้ ใกล้เคียงเวอร์ชั่นสมบูรณ์มากยิ่งขึ้น</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>14.02.2025</b></ul>
                <h3><b>Soft Opening</b></h3>
                <p>14 กุมภาฯ วันวาเลนไทน์ ฤกษ์ดีเปิดตัว (ซอฟท์โอเพนนิ่ง) ในกลุ่มผู้ร่วมริเริ่มอย่างพวกเรา</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>28.02.2025</b></ul>
                <h3><b>Valentine Promotion Extended</b></h3>
                <p>ขยายเวลา วาเลนไทน์ โปรโมชั่น รับเพิ่มอีก 1,000 DFI จนถึง 15/03/2025 </p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>15.03.2025</b></ul>
                <h3><b>Valentine Promotion Ended</b></h3>
                <p>จบช่วงเวลา วาเลนไทน์ โปรโมชั่น และยังคงได้สิทธิ์โปรโมชั่นเริ่มต้นที่ 1,000 DFI ต่อไป</p>
                </div>
            </div>            
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>16.03.2025</b></ul>
                <h3><b>Initiate 40% Sponsoring PayOut</b></h3>
                <p>รับส่วนแบ่งรายได้การประชาสัมพันธ์ 40% เป็นครั้งแรก</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>31.03.2025</b></ul>
                <h3><b>Prepare System for Plan B</b> Avatar & AutoRun Enable</h3>
                <p>ปรับระบบ เตรียมพร้อมสำหรับ แผนบี และ โครงสร้างองค์กรในอนาคตเพื่อรองรับรูปแบบ อวตาร์และออโต้รัน</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>01.04.2025</b></ul>
                <h3><b>1-255 Organization Structure </b></h3>
                <p>ปรับเปลี่ยน Token ID สำหรับ โครงสร้างองค์กร 1-255</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>02.04.2025</b></ul>
                <h3><b>19 Knights Initiative </b></h3>
                <p>ปรับทีมผู้นำทัพ 18K (18 ขุนพล) เป็น 19K (19 อัศวิน) เพื่อความเหมาะสมด้วยประการทั้งปวง</p>
                </div>
            </div>
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>07.04.2025</b></ul>
                <h3><b>Initiate 20% Unilevel & 20% Referee Matching Payout </b></h3>
                <p>รับส่วนแบ่งรายได้ 20% 10 ชั้นลึก และ 20% Referee Matching เป็นครั้งแรก</p>
                </div>
            </div>                      
            <div className="timeline-item">
                <div className="timeline-content">
                <ul><b>15.07.2025</b></ul>
                <h3><Link target="_blank" href="https://3k.dfi.fund/templates/index.html/"><b>Kok Kok Kok v. 2.0.1</b></Link></h3>
                <p><Link target="_blank" href="https://3k.dfi.fund/templates/index.html/">ต้นแบบแอพพลิเคชั่น ก๊อกๆๆ เวอร์ชั่น 2.0.1</Link></p>
                </div>
            </div>                      
            <div className="timeline-item">
                <div className="timeline-content">
                {/* <ul><b>20.02.2025</b></ul> */}
                <h3><b>To be continue ... ยังมีต่อ โปรดรอติดตาม</b></h3>
                {/* <p>3K Application ก๊อกๆๆ ที่สามารถใช้งานได้ ใกล้เคียงเวอร์ชั่นสมบูรณ์มากยิ่งขึ้น</p> */}
                </div>
            </div>
        </div>
        <div>
            <Footer />
        </div>
        <div className="flex justify-center mt-4">
                <Link
                    className="flex justify-center w-36 border border-zinc-500 px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors hover:border-zinc-800"
                    href="/">กลับหน้าหลัก</Link>
        </div>
    </div>
  );
};

export default Timeline;
