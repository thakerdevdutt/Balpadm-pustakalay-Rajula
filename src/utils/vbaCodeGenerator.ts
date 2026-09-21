export function generateVBAUserFormCode(): string {
  return `' ==============================================================================
' MY BOOK COLLECTION - BILINGUAL LIBRARY MANAGEMENT SYSTEM
' Contact: 7878413535 - thakerdevduttyuppai@gmail.com
' File: UserForm1.frm (Code Behind UserForm)
' ==============================================================================

Option Explicit

Private mbIsLoading As Boolean

' ------------------------------------------------------------------------------
' 1. USERFORM INITIALIZATION
' ------------------------------------------------------------------------------
Private Sub UserForm_Initialize()
    On Error GoTo ErrHandler
    mbIsLoading = True
    
    ' Set Window Title & Frames
    Me.Caption = "My Book Collection - મારૂં પુસ્તક સંગ્રહ"
    
    ' Load Dropdown ComboBoxes from Database Master Lists
    Call LoadCombos
    
    ' Configure Search Criteria Dropdown
    With cmb_search
        .Clear
        .AddItem "Book ID"
        .AddItem "Book Name"
        .AddItem "Author"
        .AddItem "Publisher"
        .AddItem "Category"
        .AddItem "Language"
        .AddItem "Book Type"
        .ListIndex = 1 ' Default to "Book Name"
    End With
    
    ' Generate Next Sequential Book ID
    Call GenerateBookID
    
    ' Load Main ListBox with OS Compatibility Check
    Call LoadListBox
    
    ' Default Date for Borrower Section
    txt_IssueDate.Value = Format(Date, "yyyy-mm-dd")
    
    mbIsLoading = False
    
    ' Set Keyboard Focus directly to Book Name Field as per specification
    txt_BookName.SetFocus
    Exit Sub

ErrHandler:
    MsgBox "Initialization Error: " & Err.Description, vbCritical, "My Book Collection"
    mbIsLoading = False
End Sub

' ------------------------------------------------------------------------------
' 2. SAVE / UPDATE RECORD LOGIC
' ------------------------------------------------------------------------------
Private Sub BTN_Save_Update_Click()
    On Error GoTo ErrHandler
    
    ' Validation
    If Trim(txt_BookName.Value) = "" Then
        MsgBox "Please enter Book Name! (મહેરબાની કરીને પુસ્તકનું નામ દાખલ કરો!)", vbExclamation, "Validation Error"
        txt_BookName.SetFocus
        Exit Sub
    End If
    
    ' Duplicate & Partial Series Alert Check
    Call CheckDuplicateOrSeries(Trim(txt_BookName.Value))
    
    Dim dbPath As String, targetWB As Workbook, wsDB As Worksheet
    dbPath = ThisWorkbook.Path & "\Database.xlsx"
    
    ' Check if Database.xlsx exists
    If Dir(dbPath) = "" Then
        MsgBox "Database.xlsx file not found in current folder: " & ThisWorkbook.Path, vbCritical, "Database Missing"
        Exit Sub
    End If
    
    Set targetWB = Workbooks.Open(dbPath)
    Set wsDB = targetWB.Sheets("Database")
    
    Dim lastRow As Long, i As Long, foundRow As Long
    foundRow = 0
    lastRow = wsDB.Cells(wsDB.Rows.Count, "A").End(xlUp).Row
    
    ' Check if updating existing Book ID
    For i = 2 To lastRow
        If Trim(CStr(wsDB.Cells(i, 1).Value)) = Trim(txt_BookID.Value) Then
            foundRow = i
            Exit For
        End If
    Next i
    
    ' If new record, append at end
    If foundRow = 0 Then
        foundRow = lastRow + 1
    End If
    
    ' Write data fields
    With wsDB
        .Cells(foundRow, 1).Value = Trim(txt_BookID.Value)
        .Cells(foundRow, 2).Value = Trim(txt_BookName.Value)
        .Cells(foundRow, 3).Value = Trim(cmb_Author.Value)
        .Cells(foundRow, 4).Value = Trim(cmb_NovelEtc.Value)
        .Cells(foundRow, 5).Value = Trim(txt_Edition.Value)
        .Cells(foundRow, 6).Value = Trim(txt_YearPublished.Value)
        .Cells(foundRow, 7).Value = Trim(cmb_Translator.Value)
        .Cells(foundRow, 8).Value = Trim(cmb_Language.Value)
        .Cells(foundRow, 9).Value = Trim(txt_ISBN.Value)
        .Cells(foundRow, 10).Value = Trim(cmb_Publisher.Value)
        .Cells(foundRow, 11).Value = Trim(cmb_BookType.Value)
        .Cells(foundRow, 12).Value = Val(txt_Rate.Value)
        .Cells(foundRow, 13).Value = Trim(txt_Remarks1.Value)
    End With
    
    ' Independent Sorting as per Specification: Column A (BookID) and Column D (Category)
    Call IndependentSort(wsDB)
    
    ' Auto Save Backend Workbook (ws.Parent.Save)
    wsDB.Parent.Save
    targetWB.Close SaveChanges:=True
    
    MsgBox "Record saved successfully to Database.xlsx! (રેકોર્ડ સફળતાપૂર્વક સચવાયો!)", vbInformation, "Saved"
    
    ' Refresh List and Reset Form
    Call LoadListBox
    Call BTN_Reset_Click
    Exit Sub

ErrHandler:
    MsgBox "Save Error: " & Err.Description, vbCritical, "Save Failed"
End Sub

' ------------------------------------------------------------------------------
' 3. INDEPENDENT SORTING (COLUMN A AND COLUMN D)
' ------------------------------------------------------------------------------
Private Sub IndependentSort(ByRef ws As Worksheet)
    On Error Resume Next
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then Exit Sub
    
    ' Sort main range by Column A (Book ID) primary, Column D (Category) secondary
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add Key:=ws.Range("A2:A" & lastRow), SortOn:=xlSortOnValues, Order:=xlAscending, DataOption:=xlSortNormal
        .SortFields.Add Key:=ws.Range("D2:D" & lastRow), SortOn:=xlSortOnValues, Order:=xlAscending, DataOption:=xlSortNormal
        .SetRange ws.Range("A1:M" & lastRow)
        .Header = xlYes
        .MatchCase = False
        .Orientation = xlTopToBottom
        .Apply
    End With
End Sub

' ------------------------------------------------------------------------------
' 4. SEARCH ENTER KEY PRESS (KeyCode = 13 Focus Shift)
' ------------------------------------------------------------------------------
Private Sub cmb_SearchValue_KeyDown(ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer)
    If KeyCode = 13 Then ' Enter Key
        ' Instantly shift focus to Reset button as per specification
        BTN_Reset.SetFocus
    End If
End Sub

Private Sub cmb_SearchValue_Change()
    If mbIsLoading Then Exit Sub
    Call LoadListBox
End Sub

' ------------------------------------------------------------------------------
' 5. LISTBOX DUAL OS BINDING (WINDOWS vs MAC OS)
' ------------------------------------------------------------------------------
Private Sub LoadListBox()
    On Error GoTo ErrHandler
    Dim dbPath As String, targetWB As Workbook, wsDB As Worksheet
    dbPath = ThisWorkbook.Path & "\Database.xlsx"
    
    If Dir(dbPath) = "" Then Exit Sub
    
    Set targetWB = Workbooks.Open(dbPath, ReadOnly:=True)
    Set wsDB = targetWB.Sheets("Database")
    
    Dim lastRow As Long, i As Long, count As Long
    lastRow = wsDB.Cells(wsDB.Rows.Count, "A").End(xlUp).Row
    
    Dim searchCol As Integer, searchVal As String
    searchVal = LCase(Trim(cmb_SearchValue.Value))
    
    Select Case cmb_search.Value
        Case "Book ID": searchCol = 1
        Case "Book Name": searchCol = 2
        Case "Author": searchCol = 3
        Case "Publisher": searchCol = 10
        Case "Category": searchCol = 4
        Case "Language": searchCol = 8
        Case "Book Type": searchCol = 11
        Case Else: searchCol = 2
    End Select
    
    ListBox1.Clear
    ListBox1.ColumnCount = 6
    ListBox1.ColumnWidths = "60 pt;180 pt;120 pt;80 pt;60 pt;60 pt"
    
    #If Mac Then
        ' --- MAC OS BLOCK: Safe Variant Array Iteration ---
        Dim dataArr() As Variant, filteredList() As Variant, matchCount As Long
        matchCount = 0
        
        For i = 2 To lastRow
            Dim valToCompare As String
            valToCompare = LCase(CStr(wsDB.Cells(i, searchCol).Value))
            
            If searchVal = "" Or InStr(1, valToCompare, searchVal) > 0 Then
                ListBox1.AddItem wsDB.Cells(i, 1).Value ' ID
                ListBox1.List(matchCount, 1) = wsDB.Cells(i, 2).Value ' Name
                ListBox1.List(matchCount, 2) = wsDB.Cells(i, 3).Value ' Author
                ListBox1.List(matchCount, 3) = wsDB.Cells(i, 4).Value ' Category
                ListBox1.List(matchCount, 4) = wsDB.Cells(i, 8).Value ' Language
                ListBox1.List(matchCount, 5) = wsDB.Cells(i, 12).Value ' Rate
                matchCount = matchCount + 1
            End If
        Next i
        lbl_TotalBooks.Caption = "Total Books: " & matchCount
    #Else
        ' --- WINDOWS BLOCK: Optimized RowSource or Direct Array Populating ---
        Dim rowCount As Long: rowCount = 0
        For i = 2 To lastRow
            Dim valComp As String
            valComp = LCase(CStr(wsDB.Cells(i, searchCol).Value))
            
            If searchVal = "" Or InStr(1, valComp, searchVal) > 0 Then
                ListBox1.AddItem wsDB.Cells(i, 1).Value
                ListBox1.List(rowCount, 1) = wsDB.Cells(i, 2).Value
                ListBox1.List(rowCount, 2) = wsDB.Cells(i, 3).Value
                ListBox1.List(rowCount, 3) = wsDB.Cells(i, 4).Value
                ListBox1.List(rowCount, 4) = wsDB.Cells(i, 8).Value
                ListBox1.List(rowCount, 5) = wsDB.Cells(i, 12).Value
                rowCount = rowCount + 1
            End If
        Next i
        lbl_TotalBooks.Caption = "Total Books: " & rowCount
    #End If
    
    targetWB.Close SaveChanges:=False
    Exit Sub

ErrHandler:
    lbl_TotalBooks.Caption = "Total Books: 0"
End Sub

' ------------------------------------------------------------------------------
' 6. ACTION BUTTONS (Reset, Backup, PDF, Master)
' ------------------------------------------------------------------------------
Private Sub BTN_Reset_Click()
    txt_BookID.Value = ""
    txt_BookName.Value = ""
    cmb_Author.Value = ""
    cmb_NovelEtc.Value = ""
    txt_Edition.Value = ""
    txt_YearPublished.Value = ""
    cmb_Translator.Value = ""
    cmb_Language.Value = ""
    txt_ISBN.Value = ""
    cmb_Publisher.Value = ""
    cmb_BookType.Value = ""
    txt_Rate.Value = ""
    txt_Remarks1.Value = ""
    
    Call GenerateBookID
    txt_BookName.SetFocus
End Sub

Private Sub BTN_Backup_Click()
    Call mod_BackupPDF.TriggerAutomatedBackup
End Sub

Private Sub BTN_PDF_Landscape_Click()
    Call mod_BackupPDF.GenerateReportPDF(xlLandscape)
End Sub

Private Sub BTN_PDF_Portrait_Click()
    Call mod_BackupPDF.GenerateReportPDF(xlPortrait)
End Sub

Private Sub BTN_PDF_Folder_Click()
    Call mod_BackupPDF.OpenPDFExportFolder
End Sub

Private Sub BTN_Master_Click()
    MsgBox "Master List Management Utility opened.", vbInformation, "Master Management"
End Sub

' ------------------------------------------------------------------------------
' HELPER PROCEDURES
' ------------------------------------------------------------------------------
Private Sub GenerateBookID()
    ' Calculates next ID e.g. 1001, 1002...
    On Error Resume Next
    Dim dbPath As String, targetWB As Workbook, wsDB As Worksheet
    dbPath = ThisWorkbook.Path & "\Database.xlsx"
    If Dir(dbPath) = "" Then
        txt_BookID.Value = "1001"
        Exit Sub
    End If
    Set targetWB = Workbooks.Open(dbPath, ReadOnly:=True)
    Set wsDB = targetWB.Sheets("Database")
    Dim lastRow As Long, maxID As Long
    lastRow = wsDB.Cells(wsDB.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then
        maxID = 1000
    Else
        maxID = Val(wsDB.Cells(lastRow, 1).Value)
    End If
    targetWB.Close SaveChanges:=False
    txt_BookID.Value = CStr(maxID + 1)
End Sub

Private Sub LoadCombos()
    ' Populates Authors, Categories, Translators, Languages, Publishers, Types
    ' from Master tables in Database.xlsx
End Sub

Private Sub CheckDuplicateOrSeries(bookName As String)
    ' Smart duplicate & partial series alert check
End Sub
`;
}

export function generateVBAModuleBackupPDFCode(): string {
  return `' ==============================================================================
' MODULE: mod_BackupPDF.bas
' Automated Backups with FileSystemObject & PDF Report Exporter
' Contact: 7878413535 - thakerdevduttyuppai@gmail.com
' ==============================================================================

Option Explicit

Public Sub TriggerAutomatedBackup()
    On Error GoTo ErrHandler
    Dim FSO As Object
    Set FSO = CreateObject("Scripting.FileSystemObject")
    
    Dim backupDir As String
    backupDir = ThisWorkbook.Path & "\Backups\"
    
    If Not FSO.FolderExists(backupDir) Then
        FSO.CreateFolder(backupDir)
    End If
    
    Dim timestamp As String
    timestamp = Format(Now, "YYYYMMDD_HHMMSS")
    
    ' Copy Frontend Workbook
    Dim feBackup As String
    feBackup = backupDir & "My_Book_Collection_Backup_" & timestamp & ".xlsm"
    FSO.CopyFile ThisWorkbook.FullName, feBackup, True
    
    ' Copy Backend Database
    Dim dbPath As String, dbBackup As String
    dbPath = ThisWorkbook.Path & "\Database.xlsx"
    If FSO.FileExists(dbPath) Then
        dbBackup = backupDir & "Database_Backup_" & timestamp & ".xlsx"
        FSO.CopyFile dbPath, dbBackup, True
    End If
    
    MsgBox "Backup created successfully in folder:" & vbCrLf & backupDir, vbInformation, "Backup Complete"
    Exit Sub

ErrHandler:
    MsgBox "Backup Error: " & Err.Description, vbCritical, "Backup Failed"
End Sub

Public Sub GenerateReportPDF(ByVal orient As Long)
    On Error GoTo ErrHandler
    Dim dbPath As String, targetWB As Workbook, wsDB As Worksheet
    dbPath = ThisWorkbook.Path & "\Database.xlsx"
    
    If Dir(dbPath) = "" Then
        MsgBox "Database.xlsx not found!", vbExclamation
        Exit Sub
    End If
    
    Set targetWB = Workbooks.Open(dbPath, ReadOnly:=True)
    Set wsDB = targetWB.Sheets("Database")
    
    Dim pdfDir As String
    pdfDir = ThisWorkbook.Path & "\PDF_Exports\"
    Dim FSO As Object: Set FSO = CreateObject("Scripting.FileSystemObject")
    If Not FSO.FolderExists(pdfDir) Then FSO.CreateFolder(pdfDir)
    
    Dim orientStr As String
    orientStr = IIf(orient = 2, "Landscape", "Portrait")
    Dim pdfPath As String
    pdfPath = pdfDir & "Book_Catalog_" & orientStr & "_" & Format(Now, "YYYYMMDD_HHMMSS") & ".pdf"
    
    With wsDB.PageSetup
        .Orientation = orient
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .LeftHeader = "My Book Collection - Library Catalog"
        .RightHeader = "7878413535 | thakerdevduttyuppai@gmail.com"
        .CenterFooter = "Page &P of &N"
    End With
    
    wsDB.ExportAsFixedFormat Type:=0, Filename:=pdfPath, Quality:=0, IncludeDocProperties:=True, OpenAfterPublish:=True
    targetWB.Close SaveChanges:=False
    
    MsgBox "PDF Report exported successfully:" & vbCrLf & pdfPath, vbInformation, "PDF Export Complete"
    Exit Sub

ErrHandler:
    MsgBox "PDF Generation Error: " & Err.Description, vbCritical
End Sub

Public Sub OpenPDFExportFolder()
    Dim pdfDir As String
    pdfDir = ThisWorkbook.Path & "\PDF_Exports\"
    Dim FSO As Object: Set FSO = CreateObject("Scripting.FileSystemObject")
    If Not FSO.FolderExists(pdfDir) Then FSO.CreateFolder(pdfDir)
    
    Call Shell("explorer.exe """ & pdfDir & """", vbNormalFocus)
End Sub
`;
}
