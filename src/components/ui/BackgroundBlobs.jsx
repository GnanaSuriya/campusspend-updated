import React from 'react';

export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f8f9ff] dark:bg-slate-950 transition-colors duration-500">
      {/* Indigo Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float"></div>
      
      {/* Purple Blob */}
      <div className="absolute top-[20%] right-[-5%] w-80 h-80 bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-float-delayed"></div>
      
      {/* Mint Blob */}
      <div className="absolute bottom-[-10%] left-[20%] w-[30rem] h-[30rem] bg-mint-400/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-float"></div>
    </div>
  );
}


