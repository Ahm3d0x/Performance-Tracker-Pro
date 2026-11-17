import React from 'react';

interface MilitaryAcademyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const MilitaryAcademyLogo: React.FC<MilitaryAcademyLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Golden ambient glow */}
        <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-xs pointer-events-none" />
        <img
          src="/logo.svg"
          alt="شعار الكلية الحربية المصرية"
          className={`${sizeMap[size]} object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-300 hover:scale-105`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/military_academy_crest.jpg';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col text-right select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 tracking-wider">
              الكلية الحربية المصرية
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
              مصنع الرجال
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-white tracking-tight">
            منظومة التقييم واللياقة البدنية
          </span>
          <span className="text-[10px] text-slate-300 font-semibold tracking-widest">
            الـواجـب · الـشـرف · الـوطـن
          </span>
        </div>
      )}
    </div>
  );
};
