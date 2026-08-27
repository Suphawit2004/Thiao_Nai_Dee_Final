$slugs = @("baan-baann", "lakeland-cafe", "sippin-cafe", "at-home-cafe", "nitan-ban-tonmai", "sweet-cycle", "bestpart-cafe", "scene-cafe", "the-lake-cafe", "baan-ing-kwan", "norbulingka-coffee", "mr-handsome-cafe")
foreach ($slug in $slugs) {
    $url = "https://picsum.photos/seed/$slug/800/600.jpg"
    $out = "public\images\cafes\$slug\main.jpg"
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -TimeoutSec 30
        Write-Host "Downloaded: $slug"
    } catch {
        Write-Host "Failed: $slug - $($_.Exception.Message)"
    }
}