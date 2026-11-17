@echo off
chcp 65001 >nul
title تحديث المشغل التنفيذي للمنظومة
echo جاري تحديث المشغل التنفيذي لمنظومة اللياقة البدنية...
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /optimize+ /platform:anycpu /out:منظومة_اللياقة_البدنية.exe /win32icon:app.ico /r:System.dll,System.Windows.Forms.dll Launcher.cs
if %errorlevel% equ 0 (
    echo تم تحديث المشغل التنفيذي بنجاح!
) else (
    echo [تنبيه] يرجى إغلاق البرنامج أولاً إذا كان مفتوحاً ثم إعادة تشغيل هذا الملف.
)
pause
