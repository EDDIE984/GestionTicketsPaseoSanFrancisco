$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterWorkerHelper
{
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA
  {
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendBytesToPrinter(string printerName, string filePath, string documentName)
  {
    IntPtr printerHandle;
    if (!OpenPrinter(printerName.Normalize(), out printerHandle, IntPtr.Zero))
    {
      throw new Exception("No se pudo abrir la impresora: " + printerName + ". Win32: " + Marshal.GetLastWin32Error());
    }

    try
    {
      DOCINFOA docInfo = new DOCINFOA();
      docInfo.pDocName = documentName;
      docInfo.pDataType = "RAW";

      if (!StartDocPrinter(printerHandle, 1, docInfo)) throw new Exception("No se pudo iniciar documento RAW. Win32: " + Marshal.GetLastWin32Error());
      if (!StartPagePrinter(printerHandle)) throw new Exception("No se pudo iniciar pagina RAW. Win32: " + Marshal.GetLastWin32Error());

      byte[] bytes = File.ReadAllBytes(filePath);
      IntPtr unmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
      try
      {
        Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);
        int written;
        if (!WritePrinter(printerHandle, unmanagedBytes, bytes.Length, out written)) throw new Exception("No se pudo escribir en impresora RAW. Win32: " + Marshal.GetLastWin32Error());
        if (written != bytes.Length) throw new Exception("La impresora recibio " + written + " de " + bytes.Length + " bytes.");
      }
      finally
      {
        Marshal.FreeCoTaskMem(unmanagedBytes);
      }

      EndPagePrinter(printerHandle);
      EndDocPrinter(printerHandle);
    }
    finally
    {
      ClosePrinter(printerHandle);
    }
  }
}
"@

function Write-JsonLine($value) {
  [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}

Add-Type -TypeDefinition $source
Write-JsonLine @{ ready = $true }

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) {
    break
  }

  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  $job = $null
  try {
    $job = $line | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath $job.path)) {
      throw "No existe el archivo RAW: $($job.path)"
    }

    [RawPrinterWorkerHelper]::SendBytesToPrinter($job.printerName, $job.path, $job.documentName)
    Write-JsonLine @{ id = $job.id; ok = $true }
  }
  catch {
    $id = $null
    if ($job -and $job.id) {
      $id = $job.id
    }
    Write-JsonLine @{ id = $id; ok = $false; error = $_.Exception.Message }
  }
}
