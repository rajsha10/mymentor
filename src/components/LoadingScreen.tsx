import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4">
      <div className="bg-white p-12 rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center max-w-sm w-full mx-auto">
        <img src="/logo.png" alt="MyMentor Logo" className="h-32 w-auto object-contain mb-8 animate-pulse" />
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-black border-r-[#FF6B57] rounded-full animate-spin"></div>
        </div>
        <div className="mt-8 text-black font-extrabold text-xl tracking-wide uppercase">
          Loading...
        </div>
      </div>
    </div>
  );
}
