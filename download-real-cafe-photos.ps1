<# 
.SYNOPSIS
    Downloads real cafe photos from Wongnai for all 12 Phayao cafes
#>

$ErrorActionPreference = "Stop"

$cafes = @{
    "baan-baann"       = "https://www.wongnai.com/restaurants/2793239df-baan-baann"
    "lakeland-cafe"    = "https://www.wongnai.com/restaurants/2028220pI-sweet-cycle-coffee-phayao"
    "sippin-cafe"      = "https://www.wongnai.com/restaurants/21467zd-at-home-cafe-phayao"
    "at-home-cafe"     = "https://www.wongnai.com/restaurants/21467zd-at-home-cafe-phayao"
    "nitan-ban-tonmai" = "https://www.wongnai.com/restaurants/162022RJ-%E0%B8%99%E0%B8%B4%E0%B8%97%E0%B8%B2%E0%B8%99%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%95%E0%B9%89%E0%B8%99%E0%B9%84%E0%B8%A1%E0%B9%89"
    "sweet-cycle"      = "https://www.wongnai.com/restaurants/2028220pI-sweet-cycle-coffee-phayao"
    "bestpart-cafe"    = "https://www.wongnai.com/restaurants/???-bestpart-cafe-phayao"
    "scene-cafe"       = "https://www.wongnai.com/restaurants/1406903bb-scene-caf%C3%A9"
    "the-lake-cafe"    = "https://www.wongnai.com/restaurants/???-the-lake-cafe-phayao"
    "baan-ing-kwan"    = "https://www.wongnai.com/restaurants/???-baan-ing-kwan-phayao"
    "norbulingka-coffee" = "https://www.wongnai.com/restaurants/???-norbulingka-coffee-phayao"
    "mr-handsome-cafe" = "https://www.wongnai.com/restaurants/???-mr-handsome-cafe-phayao"
}

$baseDir = "public\images\cafes"
if (-not (Test-Path $baseDir)) { New-Item -ItemType Directory -Path $baseDir -Force | Out-Null }

Add-Type -AssemblyName System.Drawing

function Download-CafePhoto {
    param([string]$Slug, [string]$WongnaiUrl)

    Write-Host ("Processing: {0}" -f $Slug) -ForegroundColor Cyan
    
    $outDir = Join-Path $baseDir $Slug
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    
    $outFile = Join-Path $outDir "main.jpg"
    $tempFile = Join-Path $outDir "temp_original.jpg"

    try {
        Write-Host "  Fetching page..." -ForegroundColor Gray
        $page = Invoke-WebRequest -Uri $WongnaiUrl -UseBasicParsing -TimeoutSec 30
        
        $imgMatches = $page.Content | Select-String -Pattern 'img\.wongnai\.com/p/\d+x\d+/[\w/.-]+\.jpg' -AllMatches
        
        if (-not $imgMatches.Matches) {
            $photosUrl = $WongnaiUrl.TrimEnd('/') + "/photos"
            Write-Host "  Trying photos page..." -ForegroundColor Gray
            $photosPage = Invoke-WebRequest -Uri $photosUrl -UseBasicParsing -TimeoutSec 30
            $imgMatches = $photosPage.Content | Select-String -Pattern 'img\.wongnai\.com/p/\d+x\d+/[\w/.-]+\.jpg' -AllMatches
        }

        if (-not $imgMatches.Matches) {
            Write-Warning ("  No image URLs found for {0}" -f $Slug)
            return $false
        }

        $imageUrls = $imgMatches.Matches.Value | Sort-Object -Unique
        $preferredUrl = $imageUrls | Where-Object { $_ -match '/(800|1200)x/' } | Select-Object -First 1
        if (-not $preferredUrl) { $preferredUrl = $imageUrls[0] }
        
        Write-Host ("  Found image: {0}" -f $preferredUrl) -ForegroundColor Green

        Write-Host "  Downloading..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $preferredUrl -OutFile $tempFile -TimeoutSec 60

        Write-Host "  Resizing to 800x600..." -ForegroundColor Gray
        $srcImg = [System.Drawing.Image]::FromFile($tempFile)
        $targetWidth = 800
        $targetHeight = 600
        
        $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        
        $srcRatio = $srcImg.Width / $srcImg.Height
        $targetRatio = $targetWidth / $targetHeight
        
        if ($srcRatio -gt $targetRatio) {
            $cropHeight = $srcImg.Height
            $cropWidth = $cropHeight * $targetRatio
            $x = ($srcImg.Width - $cropWidth) / 2
            $y = 0
        } else {
            $cropWidth = $srcImg.Width
            $cropHeight = $cropWidth / $targetRatio
            $x = 0
            $y = ($srcImg.Height - $cropHeight) / 2
        }
        
        $srcRect = New-Object System.Drawing.RectangleF($x, $y, $cropWidth, $cropHeight)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)
        $gfx.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        $gfx.Dispose()
        $srcImg.Dispose()
        
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, 85L)
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | 
            Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
        $bmp.Save($outFile, $jpegCodec, $encoderParams)
        $bmp.Dispose()
        
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        
        Write-Host ("  Saved: {0}" -f $outFile) -ForegroundColor Green
        return $true

    } catch {
        $errMsg = $_.Exception.Message
        Write-Error ("  Failed for {0}: {1}" -f $Slug, $errMsg)
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
        return $false
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Downloading Real Cafe Photos (12 cafes)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$success = 0
$failed = @()

foreach ($slug in $cafes.Keys) {
    $url = $cafes[$slug]
    if ($url -match '\?\?\?') {
        Write-Warning ("  SKIP {0}: Wongnai URL not yet known" -f $slug)
        $failed += $slug
        continue
    }
    
    $result = Download-CafePhoto -Slug $slug -WongnaiUrl $url
    if ($result) { $success++ } else { $failed += $slug }
    Write-Host ""
    Start-Sleep -Seconds 2
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host ("  Success: {0} / {1}" -f $success, $cafes.Count) -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host ("  Failed/Skipped: {0}" -f ($failed -join ", ")) -ForegroundColor Red
    Write-Host "For failed cafes, find their Wongnai URLs." -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan