Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "public\logo.png not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(256, 128, 64, 48, 32, 16)
$pngBytesList = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}
$src.Dispose()

# Construct ICO stream
$msIco = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $msIco

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)

$offset = 6 + ($sizes.Count * 16)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $data = $pngBytesList[$i]
    
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    
    $bw.Write($wByte)
    $bw.Write($hByte)
    $bw.Write([byte]0)     # Color count
    $bw.Write([byte]0)     # Reserved
    $bw.Write([uint16]1)   # Color planes
    $bw.Write([uint16]32)  # Bit depth
    $bw.Write([uint32]$data.Length) # Image size
    $bw.Write([uint32]$offset)      # Offset
    
    $offset += $data.Length
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $data = $pngBytesList[$i]
    $bw.Write($data)
}

$bw.Flush()
$icoBytes = $msIco.ToArray()
$bw.Dispose()
$msIco.Dispose()

# Write to destinations
$out1 = Join-Path $PSScriptRoot "..\app.ico"
$out2 = Join-Path $PSScriptRoot "..\public\favicon.ico"
$out3 = Join-Path $PSScriptRoot "..\dist\favicon.ico"

[System.IO.File]::WriteAllBytes($out1, $icoBytes)
[System.IO.File]::WriteAllBytes($out2, $icoBytes)
if (Test-Path (Join-Path $PSScriptRoot "..\dist")) {
    [System.IO.File]::WriteAllBytes($out3, $icoBytes)
}

Write-Output "Successfully generated app.ico and favicon.ico ($($sizes.Count) resolutions, $($icoBytes.Length) bytes) from official Egyptian Military Academy logo!"
