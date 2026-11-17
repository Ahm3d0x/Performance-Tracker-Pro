import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const desktop = path.join(os.homedir(), 'Desktop');
const lnkPath = path.join(desktop, 'منظومة اللياقة البدنية.lnk');
const appDir = process.cwd();
const icoPath = path.join(appDir, 'app.ico');
const exePath = path.join(appDir, 'منظومة_اللياقة_البدنية.exe');

// Delete existing shortcut to force Windows Explorer to flush cached icon
if (fs.existsSync(lnkPath)) {
  try {
    fs.unlinkSync(lnkPath);
  } catch (e) {
    console.error('Failed to unlink existing shortcut:', e.message);
  }
}

const vbsContent = [
  'Set oWS = CreateObject("WScript.Shell")',
  `sLink = "${lnkPath}"`,
  'Set oLink = oWS.CreateShortcut(sLink)',
  `oLink.TargetPath = "${exePath}"`,
  `oLink.WorkingDirectory = "${appDir}"`,
  `oLink.IconLocation = "${icoPath},0"`,
  'oLink.Description = "منظومة التقييم واللياقة البدنية للقوات المسلحة - الكلية الحربية"',
  'oLink.Save',
].join('\r\n');

fs.writeFileSync('create_shortcut.vbs', vbsContent, 'utf16le');
try {
  execSync('cscript //nologo create_shortcut.vbs');
  console.log('Shortcut created with fresh official military emblem app.ico!');
} finally {
  if (fs.existsSync('create_shortcut.vbs')) {
    fs.unlinkSync('create_shortcut.vbs');
  }
}

// Refresh shell icon cache
try {
  execSync('powershell -ExecutionPolicy Bypass -File scripts\\refresh_shell.ps1', { stdio: 'inherit' });
} catch (e) {
  console.error('Could not run refresh_shell.ps1:', e.message);
}
