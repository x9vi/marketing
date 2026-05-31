declare module 'pdfkit' {
  import type { Writable } from 'stream';

  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    pipe(stream: Writable): Writable;
    fontSize(size: number): this;
    text(text: string, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    end(): void;
  }

  export default PDFDocument;
}
