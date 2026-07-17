import JSZip from "jszip";
import * as XLSX from "xlsx";

/**
 * Parses a standard Word document (.docx) and extracts plain text
 */
export async function parseDocx(file: File): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) {
      throw new Error("未能找到 word/document.xml，该文件可能不是合规的 Word .docx 文档");
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, "text/xml");
    
    // Check for XML parsing errors
    const parserError = xmlDoc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
      throw new Error("Word XML 结构解析失败");
    }

    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    const textLines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const textNodes = paragraphs[i].getElementsByTagName("w:t");
      let paragraphText = "";
      for (let j = 0; j < textNodes.length; j++) {
        paragraphText += textNodes[j].textContent || "";
      }
      if (paragraphText.trim()) {
        textLines.push(paragraphText);
      }
    }

    return textLines.join("\n");
  } catch (err: any) {
    console.error("parseDocx error:", err);
    throw new Error(`Word文档解析异常: ${err.message || err}`);
  }
}

/**
 * Parses an Excel spreadsheet (.xlsx/.xls) and formats tables into clean structured text
 */
export async function parseXlsx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        let fullText = "";

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert sheet to CSV format
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          if (csv.trim()) {
            fullText += `[工作表 - ${sheetName}]\n----------------------------------------\n${csv}\n----------------------------------------\n\n`;
          }
        });

        if (!fullText) {
          resolve("（该 Excel 工作簿内容为空）");
        } else {
          resolve(fullText.trim());
        }
      } catch (err: any) {
        reject(new Error(`Excel 格式解析异常: ${err.message || err}`));
      }
    };
    reader.onerror = (err) => reject(new Error(`读取文件流失败: ${err}`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts any file (especially images) to a standard Base64 Data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
