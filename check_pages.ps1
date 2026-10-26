$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open('F:\PROMPTFROM\PromptForm_AI_Final_Project_Report.docx')
    $pages = $doc.ComputeStatistics(2)
    Write-Host "CURRENT_PAGES: $pages"
    $doc.Close([ref]$false)
} catch {
    Write-Host "ERROR: $_"
} finally {
    $word.Quit()
}
