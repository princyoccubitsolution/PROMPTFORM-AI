# Updates all fields (TOC / list page references) in Word, saves the DOCX and exports a PDF.
$docx = 'F:\PROMPTFROM\PromptForm_AI_PPSU_Final_Report.docx'
$pdf  = 'F:\PROMPTFROM\PromptForm_AI_PPSU_Final_Report.pdf'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
    $d = $w.Documents.Open($docx)
    $d.Repaginate()
    $null = $d.Fields.Update()
    $d.Repaginate()
    $null = $d.Fields.Update()
    $d.Save()
    $d.ExportAsFixedFormat($pdf, 17)
    Write-Host "PAGES: $($d.ComputeStatistics(2))"
    $d.Close([ref]$false)
} catch { Write-Host "ERROR: $_" } finally { $w.Quit() }
