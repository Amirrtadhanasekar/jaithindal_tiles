6$ErrorActionPreference = "Stop"
try {
    $path = "C:/Users/AMIRRTA/.gemini/antigravity/brain/a57affc5-2fec-478f-8d38-bac979883533/system_comparison_table_1767343066047.png"
    $newPath = $path -replace '\.png$', '.jpg'
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile($path)
    $img.Save($newPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $img.Dispose()
    Write-Host "Converted: $newPath"
} catch {
    Write-Error $_
}
