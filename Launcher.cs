using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace MilitaryFitnessTracker
{
    static class Program
    {
        private static Process _nodeProcess;
        private static Mutex _mutex;

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            Environment.CurrentDirectory = appDir;

            // Handle shortcut creation flag
            if (args != null && args.Length > 0 && (args[0] == "--create-shortcut" || args[0] == "-s" || args[0] == "/shortcut"))
            {
                CreateDesktopShortcut(true);
                return;
            }

            // Create desktop shortcut automatically on first run if not already present
            CreateDesktopShortcut(false);

            // 1. Single-Instance Mutex
            bool createdNew;
            _mutex = new Mutex(true, "Global\\MilitaryFitnessTracker_App_Mutex_v1", out createdNew);
            if (!createdNew)
            {
                // App already open, bring window forward
                LaunchBrowserWindow("http://localhost:3000", false);
                return;
            }

            AppDomain.CurrentDomain.ProcessExit += OnProcessExit;

            try
            {
                // 2. Check if server is already running
                bool isServerUp = CheckHealth("http://127.0.0.1:3000/api/health");

                if (!isServerUp)
                {
                    string nodePath = FindNodeExecutable(appDir);
                    if (string.IsNullOrEmpty(nodePath))
                    {
                        MessageBox.Show(
                            "لم يتم العثور على محرك التشغيل Node.js على هذا الجهاز.\n\nيرجى التأكد من تثبيت Node.js أو وضع ملف node.exe داخل مجلد bin بالمشروع.",
                            "منظومة التقييم واللياقة البدنية",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                        return;
                    }

                    string serverScript = Path.Combine(appDir, "server.mjs");
                    if (!File.Exists(serverScript))
                    {
                        serverScript = Path.Combine(appDir, "server.ts");
                    }

                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodePath;
                    psi.Arguments = string.Format("\"{0}\"", serverScript);
                    psi.WorkingDirectory = appDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.EnvironmentVariables["NODE_ENV"] = "production";
                    psi.EnvironmentVariables["PORT"] = "3000";

                    _nodeProcess = Process.Start(psi);

                    // Wait for server to become responsive
                    int maxAttempts = 35; // 35 * 200ms = 7 seconds
                    while (maxAttempts > 0 && !isServerUp)
                    {
                        Thread.Sleep(200);
                        isServerUp = CheckHealth("http://127.0.0.1:3000/api/health");
                        maxAttempts--;
                    }

                    if (!isServerUp)
                    {
                        MessageBox.Show(
                            "تعذر تشغيل خادم قاعدة البيانات المحلي. يرجى التأكد من عدم استخدام المنفذ 3000 من قبل برنامج آخر.",
                            "خطأ في بدء المنظومة",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                        CleanupNodeProcess();
                        return;
                    }
                }

                // 3. Launch App Window in Dedicated Desktop Frame
                Process browserProc = LaunchBrowserWindow("http://localhost:3000", true);

                if (browserProc != null)
                {
                    browserProc.WaitForExit();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "حدث خطأ أثناء تشغيل المنظومة:\n" + ex.Message,
                    "خطأ غير متوقع",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                CleanupNodeProcess();
                if (_mutex != null)
                {
                    _mutex.ReleaseMutex();
                    _mutex.Dispose();
                }
            }
        }

        public static void CreateDesktopShortcut(bool showNotice)
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktop, "منظومة اللياقة البدنية.lnk");

                if (!showNotice && File.Exists(shortcutPath))
                {
                    return; // Already exists, no need to overwrite
                }

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;

                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember(
                    "CreateShortcut",
                    BindingFlags.InvokeMethod,
                    null,
                    shell,
                    new object[] { shortcutPath }
                );

                if (shortcut == null) return;
                Type shortcutType = shortcut.GetType();
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string exePath = Path.Combine(appDir, "منظومة_اللياقة_البدنية.exe");

                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { appDir });

                string iconPath = Path.Combine(appDir, "app.ico");
                if (File.Exists(iconPath))
                {
                    shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath });
                }

                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "منظومة التقييم واللياقة البدنية للقوات المسلحة" });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);

                if (showNotice)
                {
                    MessageBox.Show(
                        "تم إنشاء اختصار منظومة اللياقة البدنية بنجاح على سطح المكتب!",
                        "منظومة اللياقة البدنية",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch (Exception ex)
            {
                if (showNotice)
                {
                    MessageBox.Show(
                        "تعذر إنشاء الاختصار: " + ex.Message,
                        "تنبيه",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                }
            }
        }

        private static bool CheckHealth(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 400;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return (resp.StatusCode == HttpStatusCode.OK);
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable(string appDir)
        {
            // 1. Local bin folder
            string localBin = Path.Combine(appDir, "bin", "node.exe");
            if (File.Exists(localBin)) return localBin;

            // 2. Program files
            string pf64 = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(pf64)) return pf64;

            string pf32 = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(pf32)) return pf32;

            // 3. User local appdata
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string userNode = Path.Combine(localAppData, "Programs", "node", "node.exe");
            if (File.Exists(userNode)) return userNode;

            // 4. PATH lookup
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                string[] paths = pathEnv.Split(';');
                foreach (string p in paths)
                {
                    try
                    {
                        string candidate = Path.Combine(p.Trim(), "node.exe");
                        if (File.Exists(candidate)) return candidate;
                    }
                    catch { }
                }
            }

            return null;
        }

        private static Process LaunchBrowserWindow(string url, bool waitForExit)
        {
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
            {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            string selectedBrowser = null;
            if (File.Exists(edgePath)) selectedBrowser = edgePath;
            else if (File.Exists(chromePath)) selectedBrowser = chromePath;

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string profileDir = Path.Combine(localAppData, "MilitaryFitnessTracker", "browser_profile");
            try
            {
                if (!Directory.Exists(profileDir))
                {
                    Directory.CreateDirectory(profileDir);
                }
            }
            catch { }

            if (!string.IsNullOrEmpty(selectedBrowser))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = selectedBrowser;
                psi.Arguments = string.Format(
                    "--app=\"{0}\" --start-maximized --user-data-dir=\"{1}\"",
                    url,
                    profileDir
                );
                psi.UseShellExecute = false;
                return Process.Start(psi);
            }
            else
            {
                // Fallback default browser
                ProcessStartInfo psi = new ProcessStartInfo(url);
                psi.UseShellExecute = true;
                return Process.Start(psi);
            }
        }

        private static void OnProcessExit(object sender, EventArgs e)
        {
            CleanupNodeProcess();
        }

        private static void CleanupNodeProcess()
        {
            try
            {
                if (_nodeProcess != null && !_nodeProcess.HasExited)
                {
                    _nodeProcess.Kill();
                    _nodeProcess.WaitForExit(1000);
                }
            }
            catch { }
            finally
            {
                _nodeProcess = null;
            }
        }
    }
}
