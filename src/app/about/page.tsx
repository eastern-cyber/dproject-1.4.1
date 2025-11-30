import Footer from '@/components/Footer'
import Link from 'next/link'
import React from 'react'

export default function About() {
  return (
    <div style={{
        display: "flex",
        margin: "30px",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}>
        <div style={{
          display: "flex",
          margin: "5px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          border: "1px solid #333",
          borderRadius: "8px",
        }}>
            <div style={{
                display: "flex",
                fontSize: "25px",
            }}>About</div>
            <div style={{
                display: "flex",
                fontSize: "20px",
                margin: "15px",
            }}>D Project</div>
            <div>ดำเนินงานภายใต้แนวความคิดเพื่อการพัฒนาศักยภาพการแข่งขันของประเทศไทย เริ่มจาก Application ก๊อกก๊อกก๊อก (3K) ซึ่งเริ่มจากการพัฒนาให้เป็น Web3 SocialApp และไปสู่การเป็น Web3 SuperApp ในที่สุด</div>
        </div>

        <div style={{
          display: "flex",
          margin: "5px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          border: "1px solid #333",
          borderRadius: "8px",
        }}>
            <div style={{
                display: "flex",
                fontSize: "25px",
            }}>หลักสำคัญของ Web3</div>
            <div style={{
                display: "flex",
                fontSize: "20px",
                margin: "15px",
            }}>เก็บข้อมูลแบบกระจายศูนย์</div>
            <div>สิ่งสำคัญที่เป็นประโยชน์อย่างมากต่อผู้ใช้งาน คือ ผู้ใช้งานจะเป็นเจ้าของข้อมูลทั้งหมดที่ตนเองโพสต์บนโซเชียล โดย ผู้ให้บริการ หรือ เจ้าของแพล็ตฟอร์ม จะไม่สามารถลบข้อมูลของผู้ใช้งาน หรือ หากมีการยกเลิกบัญชีผู้ใช้งานจากแพล็ตฟอร์มไปแล้ว แต่ข้อมูลทั้งหมดที่เป็นของผู้ใช้งานก็ยังคงอยู่ และจะติดตามไปในแพล็ตฟอร์มอื่นๆ ที่อยู่บนโปรโตคอลเดียวกัน ซึ่งจะมีให้เลือกใช้มากมายในอนาคต แม้กระทั่งผู้ใช้งานที่มีผู้ติดตามจำนวนมาก ก็จะยังคงรักษาจำนวนผู้ติดตามทั้งหมดไว้ได้ เนื่องจากข้อมูลการติดตามจะถูกเก็บไว้บนบล็อกเชน ซึ่งจะติดตามผู้ใช้งานไปทุกที่ รวมถึงข้อความและเนื้อหาทั้งหมดที่มีผู้ใช้งานได้โพสต์ไว้ด้วย</div>
        </div>

        <div style={{
          display: "flex",
          margin: "5px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          border: "1px solid #333",
          borderRadius: "8px",
        }}>
            <div style={{
                display: "flex",
                fontSize: "25px",
            }}>ระบบสมาชิก</div>
            <div style={{
                display: "flex",
                fontSize: "20px",
                margin: "10px",
            }}>DProject Membership</div>
            <div>เปิดโอกาสให้สมาชิกได้รับผลตอบแทนจากการใช้งาน Web3 Application ชื่อ Kok Kok Kok (ก๊อกๆๆ) หรือ 3K ซึ่งจะถูกพัฒนาขึ้น เพื่อให้สมาชิกมีรายได้จากระบบ ในรูปแบบ Passive Income หรือ รายได้ที่จะคงอยู่ตลอดไป ทั้งนี้สามารถสอบถามรายละเอียดได้จากผู้แนะนำ</div>
        </div>
        <div className='px-1 w-full'>
          <Footer />
        </div>
        <div className='mt-4'>
                <Link 
                    className="flex flex-col px-4 py-3 mt-2 border border-zinc-500 rounded-lg hover:bg-zinc-800 transition-colors hover:border-zinc-800"
                    href="/">กลับหน้าหลัก</Link>
        </div>
    </div>
  )
}
