import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function clearNativeExports() {
  const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache });
  await Promise.all(files.filter(file => file.name.startsWith('od-account-export-')).map(file => Filesystem.deleteFile({ path: file.name, directory: Directory.Cache })));
}

export async function shareNativeFile(blob: Blob, filename: string) {
  await clearNativeExports();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob);
  });
  const { uri } = await Filesystem.writeFile({ path: `od-account-export-${filename.replace(/[^a-zA-Z0-9åäöÅÄÖ_.-]/g, '-')}`, directory: Directory.Cache, data });
  await Share.share({ title: 'Odlingsdagboken', files: [uri], dialogTitle: 'Spara eller dela din export' });
}

export async function createNativePdf(title: string, headers: string[], rows: string[][]) {
  const [{ PDFDocument, rgb }, { default: fontkit }, { default: fontUrl }] = await Promise.all([
    import('pdf-lib'), import('@pdf-lib/fontkit'), import('@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url'),
  ]);
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await (await fetch(fontUrl)).arrayBuffer(), { subset: true });
  const supported = new Set(font.getCharacterSet());
  const allText = [title, ...headers, ...rows.flat()].join('');
  if ([...allText].some(c => !/\s/.test(c) && !supported.has(c.codePointAt(0)!))) throw new Error('PDF-typsnittet saknar något tecken i anteckningarna. Exportera som CSV för att få med all text.');
  let page = pdf.addPage([595, 842]), y = 795;
  const line = (text: string, size = 10) => {
    if (y < 48) { page = pdf.addPage([595, 842]); y = 795; }
    page.drawText(text, { x: 40, y, font, size, color: rgb(0.12, 0.23, 0.17) }); y -= size + 6;
  };
  const paragraph = (text: string, size = 10) => {
    let buffer = '';
    for (const character of text.replace(/\r/g, '')) {
      if (character === '\n') { line(buffer, size); buffer = ''; continue; }
      if (font.widthOfTextAtSize(buffer + character, size) > 515) { line(buffer, size); buffer = ''; }
      buffer += character;
    }
    if (buffer) line(buffer, size);
  };
  paragraph(title, 19); paragraph(`Exporterad ${new Date().toLocaleDateString('sv-SE')}`, 10); y -= 14;
  rows.forEach((row, index) => { paragraph(`${index + 1}. ${row[1] || row[0] || 'Anteckning'}`, 12); row.forEach((cell, i) => paragraph(`${headers[i] || ''}: ${cell}`)); y -= 12; });
  return new Blob([new Uint8Array(await pdf.save()).buffer], { type: 'application/pdf' });
}
