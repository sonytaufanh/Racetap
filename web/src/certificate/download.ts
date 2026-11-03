import { certificateFileName } from './render';
import type { CertificateConfig, CertificatePdfSize } from './types';
import type { Participant } from '../results/types';

const PAGE_FORMATS: Record<Exclude<CertificatePdfSize, 'template'>, string> = {
  a4: 'a4',
  a3: 'a3',
  letter: 'letter'
};

/** Margin kept around the certificate when a standard page size is used (pt). */
const PAGE_MARGIN = 18;

/** Point width used for the "template" page mode; height follows the aspect. */
const TEMPLATE_PAGE_WIDTH = 842;

export interface PdfOptions {
  size: CertificatePdfSize;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('Canvas tidak mendukung ekspor gambar di browser ini.'));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal membuat file gambar.'));
        }
      },
      type,
      quality
    );
  });
}

function triggerDownload(href: string, filename: string, revoke: boolean): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (revoke) {
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}

export async function downloadPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas, 'image/png');
  const url = URL.createObjectURL(blob);

  triggerDownload(url, filename, true);
}

/**
 * The PDF embeds the rendered canvas as a JPEG image, so the file always
 * matches the editor preview regardless of which fonts the reader has.
 *
 * The page orientation comes from the artwork itself: a portrait certificate is
 * never rotated onto a landscape sheet, and "template" makes the page exactly
 * the certificate's aspect ratio.
 */
export async function downloadPdf(
  canvas: HTMLCanvasElement,
  options: PdfOptions,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const landscape = canvas.width >= canvas.height;

  let doc;

  if (options.size === 'template') {
    const width = TEMPLATE_PAGE_WIDTH;
    const height = Math.max(1, Math.round(width * (canvas.height / canvas.width)));
    // jsPDF expands the [min, max] pair according to the orientation, so the
    // page always matches the template aspect ratio exactly.
    const format = [Math.min(width, height), Math.max(width, height)];

    doc = new jsPDF({
      unit: 'pt',
      format,
      orientation: landscape ? 'landscape' : 'portrait',
      compress: true
    });
  } else {
    doc = new jsPDF({
      unit: 'pt',
      format: PAGE_FORMATS[options.size],
      orientation: landscape ? 'landscape' : 'portrait',
      compress: true
    });
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options.size === 'template' ? 0 : PAGE_MARGIN;
  const scale = Math.min(
    (pageWidth - margin * 2) / canvas.width,
    (pageHeight - margin * 2) / canvas.height
  );
  const width = canvas.width * scale;
  const height = canvas.height * scale;

  doc.addImage(
    canvas.toDataURL('image/jpeg', 0.95),
    'JPEG',
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
    'certificate',
    'FAST'
  );

  doc.save(filename);
}

export function certificatePngName(config: CertificateConfig, participant: Participant): string {
  return certificateFileName(config, participant, 'png');
}

export function certificatePdfName(config: CertificateConfig, participant: Participant): string {
  return certificateFileName(config, participant, 'pdf');
}
