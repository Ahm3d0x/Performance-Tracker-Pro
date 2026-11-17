import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const desktop = path.join(os.homedir(), 'Desktop');
const lnkPath = path.join(desktop, 'منظومة اللياقة البدنية.lnk');
const appDir = process.cwd();
const icoPath = path.join(appDir, 'app.ico');
const exePath = path.join(appDir, 'منظومة_اللياقة_البدنية.exe');

const vbsContent = [
  'Set oWS = CreateObject("WScript.Shell")',
  `sLink = "${lnkPath}"`,
  'Set oLink = oWS.CreateShortcut(sLink)',
  `oLink.TargetPath = "${exePath}"`,
  `oLink.WorkingDirectory = "${appDir}"`,
  `oLink.IconLocation = "${icoPath}"`,
  'oLink.Description = "منظومة اللياقة البدنية للقوات المسلحة - الكلية الحربية"',
  'oLink.Save',
].join('\r\n');

fs.writeFileSync('create_shortcut.vbs', vbsContent, 'utf16le');
try {
  execSync('cscript //nologo create_shortcut.vbs');
  console.log('Shortcut created/updated successfully with app.ico!');
} finally {
  if (fs.existsSync('create_shortcut.vbs')) {
    fs.unlinkSync('create_shortcut.vbs');
  }
}
