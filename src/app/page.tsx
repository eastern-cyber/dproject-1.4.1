// src/app/page.tsx

"use client";

import { useTheme } from '../context/ThemeContext';
import Image from "next/image";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import dprojectIcon from "../../public/DProjectLogo_650x600.svg";
import { getContractMetadata } from "thirdweb/extensions/common";
import { contract } from "../../utils/contracts";
import Link from "next/link";
import WalletConnect from "@/components/WalletConnect";
import Footer from "@/components/Footer";

export default function Home() {
  const account = useActiveAccount();
  const { theme } = useTheme();


  const { data: contractMetadata } = useReadContract(
    getContractMetadata,
    {
      contract: contract,
    }
  );

  if(!account)
  {
    return (
      <main className="min-h-screen w-full flex flex-col">
      <div className={theme === 'dark' ? 'bg-[#110033] text-amber-100' : 'bg-gray-50 text-gray-900'}>
        <div className="flex-grow flex flex-col items-center justify-center py-20 w-full">
          <Header />
          <div className="my-8 w-full flex justify-center">
            <ThirdwebResources />
          </div>
          <div className='w-full mt-8'>
            <Footer />
          </div>
        </div>
      </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-5 w-full">
        <div className="flex flex-col items-center justify-center p-5 border border-gray-300 rounded-lg max-w-md w-full">
          <Image
            src={dprojectIcon}
            alt=""
            className="size-[150px] md:size-[150px] mb-6"
            style={{
              filter: "drop-shadow(0px 0px 24px #a726a9a8)",
            }}
          />
          <WalletConnect />
          {contractMetadata && (
            <div className="flex flex-col items-center justify-center p-5 mt-2 w-full">
              <div className="flex flex-col items-center justify-center mt-2 w-full">
                <p className="text-xl font-bold text-center">
                  ยินดีต้อนรับสู่ DProject
                </p>
                <p className="mt-5 w-full">
                  <Link 
                    href="/member-area"
                    className="flex flex-col border bg-zinc-800 border-zinc-500 px-4 py-3 rounded-lg hover:bg-[#6890000] transition-colors hover:border-zinc-300 w-full text-center"
                  >
                    <p className="text-lg break-words">เข้าสู่พื้นที่สมาชิก</p>
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 w-full max-w-4xl flex justify-center">
          <ThirdwebResources />
        </div>
        <div className="mt-8 w-full max-w-4xl">
          <Footer />
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-col items-center w-full mb-8">
      <Link href="/" passHref>
        <Image
          src={dprojectIcon}
          alt="DProject"
          className="size-[150px] md:size-[150px]"
          style={{
            filter: "drop-shadow(0px 0px 24px #a726a9a8)",
          }}
        />
      </Link>
      <p className="my-4"></p>
      <p className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-800 text-center">
        <span className="inline-block text-blue-500"> DProject </span>
        &nbsp;&nbsp;&nbsp;
        <span className="inline-block -skew-x-6 text-gray-500"> Login </span>
        &nbsp;
        <span className="text-zinc-400 inline-block mx-1"> + </span>
        &nbsp;
        <span className="inline-block -skew-x-6 text-gray-500"> Register </span>
      </p>
      <p className="text-xl text-center text-zinc-400 mb-6">
        Version 1.3.1
      </p>
      <p className="text-center text-zinc-500 text-base mb-8 max-w-2xl px-4">
        ล็อกอินด้วยอีเมลล์{" "}
        <code className="bg-zinc-800 text-zinc-500 px-2 rounded py-1 text-sm mx-1">
          OTP
        </code>{" "}
        e-mail Login
      </p>
      <WalletConnect />
    </header>
  );
}

function ThirdwebResources() {
  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-6xl px-4">
        <ArticleCard
          title="เกี่ยวกับโครงการ DProject"
          href="/about"
          description="More detail about DProject"
        />

        <ArticleCard
          title="ต้นแบบ Application ก๊อกๆๆ"
          href="https://3k.dfi.fund/templates/index.html/"
          description="3K หรือ Kok Kok Kok จะต่อยอดจาก SocialApp ยอดนิยม"
        />

        <ArticleCard
          title="DProject Timeline"
          href="/timeline"
          description="แสดงรายละเอียดไทม์ไลน์และความคืบหน้าของโครงการ"
        />
      </div>
  );
}

function ArticleCard(props: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={props.href + "?utm_source=next-template"}
      className="flex flex-col border border-zinc-800 p-4 rounded-lg hover:bg-zinc-900 transition-colors hover:border-zinc-700 h-full"
    >
      <article>
        <p className="text-lg text-yellow-500 font-semibold mb-2">{props.title}</p>
        <p className="text-sm text-zinc-500">{props.description}</p>
      </article>
    </Link>
  );
}