import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a certificate PDF by filling in the blank template
 * @param {string} fullName - Recipient's name
 * @param {string} certificateId - MW-XXXX format ID
 * @param {string} completionDate - Formatted date string (e.g. "February 10, 2026")
 * @returns {Promise<Buffer>} - PDF bytes
 */
export async function generateCertificatePDF(fullName, certificateId, completionDate) {
  // Load blank template
  const templatePath = path.join(process.cwd(), 'public', 'MARKET WARRIOR plain Certificate.pdf');
  const templateBytes = fs.readFileSync(templatePath);

  // Load Noto Sans font
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
  const fontBytes = fs.readFileSync(fontPath);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const page = doc.getPage(0);
  const { width } = page.getSize();

  // Colors
  const white = rgb(1, 1, 1);
  const gold = rgb(0.788, 0.659, 0.298); // #c9a84c

  // 1. Name - centered, below "THIS CERTIFIES THAT"
  //    Size based on character count for natural scaling
  const nameLength = fullName.length;
  let nameSize;
  if (nameLength <= 15) {
    nameSize = 44.8;       // Default size - up to 15 chars (e.g. "Lisa Mitakidis")
  } else if (nameLength <= 18) {
    nameSize = 38;         // "Alexander Thompson"
  } else if (nameLength <= 20) {
    nameSize = 35;         // "Christopher Williams"
  } else if (nameLength <= 23) {
    nameSize = 32;         // "Christopher Montgomery"
  } else if (nameLength <= 25) {
    nameSize = 29;         // "Alexandros Papadopoulos"
  } else if (nameLength <= 28) {
    nameSize = 27;         // "Panagiotis Papasteriopoulos"
  } else if (nameLength <= 30) {
    nameSize = 25;         // "Maria-Konstantina Papadimitriou"
  } else if (nameLength <= 33) {
    nameSize = 23;         // Very long names
  } else if (nameLength <= 35) {
    nameSize = 21;         // Very long names
  } else if (nameLength <= 38) {
    nameSize = 19;         // Extremely long names
  } else {
    nameSize = 17;         // Maximum length names
  }
  const nameWidth = font.widthOfTextAtSize(fullName, nameSize);
  page.drawText(fullName, {
    x: (width - nameWidth) / 2,
    y: 305,
    size: nameSize,
    font,
    color: white,
  });

  // 2. Certificate ID (MW-XXXX) - centered under "MARKET WARRIOR" in top right
  //    Template no longer has "ID:" label, so just place the MW-XXXX value
  const idSize = 14;
  const idText = certificateId;
  const idWidth = font.widthOfTextAtSize(idText, idSize);
  page.drawText(idText, {
    x: 735 - idWidth / 2,
    y: 525,
    size: idSize,
    font,
    color: gold,
  });

  // 3. Completion date - bottom left, above the gold line
  const dateSize = 16;
  page.drawText(completionDate, {
    x: 57,
    y: 85,
    size: dateSize,
    font,
    color: white,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate a unique certificate ID in MW-XXXX format
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} - Unique certificate ID
 */
export async function generateUniqueCertificateId(supabase) {
  let attempts = 0;
  while (attempts < 20) {
    const digits = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    const certId = `MW-${digits}`;

    // Check if already exists
    const { data } = await supabase
      .from('certificates')
      .select('id')
      .eq('certificate_id', certId)
      .maybeSingle();

    if (!data) return certId;
    attempts++;
  }
  throw new Error('Could not generate unique certificate ID after 20 attempts');
}

/**
 * Format a date for the certificate
 * @param {Date|string} date
 * @returns {string} - e.g. "February 10, 2026"
 */
export function formatCertificateDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
