$docxPath = "F:\PROMPTFROM\PromptForm_AI_Final_Project_Report.docx"
$pdfPath = "F:\PROMPTFROM\PromptForm_AI_Final_Project_Report.pdf"

Write-Host "Opening Word COM Automation..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
    Write-Host "Opening Document: $docxPath"
    $doc = $word.Documents.Open($docxPath)
    Write-Host "Exporting to PDF: $pdfPath"
    $doc.ExportAsFixedFormat($pdfPath, 17) # 17 = wdExportFormatPDF
    $doc.Close([ref]$false)
    Write-Host "PDF Export Successful!"
} catch {
    Write-Host "Error converting to PDF: $_"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
