import React, { useEffect } from 'react';

export const AdBanner = () => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Error", e);
        }
    }, []);

    return (
        <div className="w-full my-4 flex justify-center">
            <div className="w-full max-w-4xl min-h-[100px] flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 p-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-yellow-400 text-[9px] font-bold px-1 py-0.5 text-black rounded-br z-10">
                    AD
                </div>

                <ins className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client="ca-pub-5733298100433649"
                    data-ad-slot="8641718716"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
        </div>
    );
};
