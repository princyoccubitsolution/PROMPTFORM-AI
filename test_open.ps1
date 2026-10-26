$w = New-Object -ComObject Word.Application
$w.Visible = $false
try {
    $d = $w.Documents.Open('F:\PROMPTFROM\test_img.docx')
    Write-Host "Opened test_img.docx successfully!"
    $d.Close([ref]$false)
} catch {
    Write-Host "Error: $_"
} finally {
    $w.Quit()
}
