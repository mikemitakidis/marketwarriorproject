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
  const nameSize = 44.8;
  const nameWidth = font.widthOfTextAtSize(fullName, nameSize);
  page.drawText(fullName, {
    x: (width - nameWidth) / 2,
    y: 305,
    size: nameSize,
    font,
    color: white,
  });

  // 2. Certificate ID (MW-XXXX) - right after "ID:" in top right
  const idSize = 14;
  const idText = certificateId;
  // Place right after "ID:" text, not on top of it
  page.drawText(idText, {
    x: 742,
    y: 530,
    size: idSize,
    font,
    color: gold,
  });

  // 3. Completion date - bottom left, above the gold line
  const dateSize = 16;
  page.drawText(completionDate, {
    x: 57,
    y: 78,
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
