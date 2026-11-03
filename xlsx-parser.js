/* Plantel Francisco Ballester V4.0 - lector XLSX en navegador.
   Importa únicamente las 19 columnas autorizadas. */
(function(){
  const WANTED_HEADERS = [
    "Nº","SEMANA","FECHA","COMPRA/ PLANTACIÓN","VARIEDAD","TIPO",
    "BANDEJAS 16 B/hg (=Z02*15,78)","PLANTAS merma 8%",
    "DÍA RECOLECCIÓN (100)","PROPIETARIO","CERTIFICADO RIEGO",
    "SUPERFICIE (hanegadas)","Densidad plantas (p/hg) 3775 p/hg",
    "POLIGONO","PARCELA","MUNICIPIO",
    "ACEQUIA confirmada (Con certticado color verde)","CULTIVO","LOTE SIEMBRA"
  ];
  const norm=s=>String(s??'').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('es');
  const u16=(a,o)=>a[o]|(a[o+1]<<8);
  const u32=(a,o)=>(a[o]|(a[o+1]<<8)|(a[o+2]<<16)|(a[o+3]<<24))>>>0;
  async function inflateRaw(bytes){
    if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no permite descomprimir Excel XLSX. Actualiza Chrome, Edge o Firefox.');
    const ds=new DecompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
  }
  async function zipEntries(buf){
    const a=new Uint8Array(buf);let eocd=-1;
    for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--){if(u32(a,i)===0x06054b50){eocd=i;break}}
    if(eocd<0)throw new Error('El archivo XLSX no es un ZIP válido.');
    const size=u32(a,eocd+12),offset=u32(a,eocd+16),out=new Map();let p=offset;
    while(p<offset+size&&u32(a,p)===0x02014b50){
      const method=u16(a,p+10),csize=u32(a,p+20),nlen=u16(a,p+28),xlen=u16(a,p+30),clen=u16(a,p+32),local=u32(a,p+42);
      const name=new TextDecoder().decode(a.slice(p+46,p+46+nlen));
      const ln=u16(a,local+26),lx=u16(a,local+28),raw=a.slice(local+30+ln+lx,local+30+ln+lx+csize);
      out.set(name,{method,raw});p+=46+nlen+xlen+clen;
    }
    return out;
  }
  async function readEntry(entries,name){
    const e=entries.get(name);if(!e)return null;
    if(e.method===0)return e.raw;if(e.method===8)return inflateRaw(e.raw);
    throw new Error('Compresión XLSX no compatible: '+e.method);
  }
  const parseXml=bytes=>new DOMParser().parseFromString(new TextDecoder('utf-8').decode(bytes),'application/xml');
  const xmlText=el=>Array.from(el.querySelectorAll('t')).map(x=>x.textContent||'').join('');
  function colIndex(ref){
    const letters=String(ref).match(/^[A-Z]+/i)?.[0]?.toUpperCase()||'A';let n=0;
    for(const ch of letters)n=n*26+ch.charCodeAt(0)-64;return n-1;
  }
  function excelDate(v){
    const n=Number(v);if(!Number.isFinite(n))return String(v);
    const d=new Date(Date.UTC(1899,11,30)+n*86400000);
    return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear();
  }
  async function worksheetPath(entries){
    const wb=await readEntry(entries,'xl/workbook.xml');
    const rel=await readEntry(entries,'xl/_rels/workbook.xml.rels');
    if(!wb||!rel)return 'xl/worksheets/sheet1.xml';
    const wdoc=parseXml(wb),rdoc=parseXml(rel);
    const first=wdoc.querySelector('sheets > sheet');
    const rid=first?.getAttribute('r:id');
    if(!rid)return 'xl/worksheets/sheet1.xml';
    const relation=Array.from(rdoc.querySelectorAll('Relationship')).find(x=>x.getAttribute('Id')===rid);
    const target=relation?.getAttribute('Target');
    if(!target)return 'xl/worksheets/sheet1.xml';
    return target.startsWith('/')?target.slice(1):('xl/'+target.replace(/^\.?\//,''));
  }
  async function parseXlsx(arrayBuffer){
    const entries=await zipEntries(arrayBuffer);
    const ssBytes=await readEntry(entries,'xl/sharedStrings.xml'),shared=[];
    if(ssBytes)parseXml(ssBytes).querySelectorAll('si').forEach(si=>shared.push(xmlText(si)));
    const sheetPath=await worksheetPath(entries);
    const sheetBytes=await readEntry(entries,sheetPath);
    if(!sheetBytes)throw new Error('No se ha encontrado la primera hoja del Excel: '+sheetPath);
    const doc=parseXml(sheetBytes);
    if(doc.querySelector('parsererror'))throw new Error('La hoja Excel contiene XML no válido.');
    const rowNodes=Array.from(doc.querySelectorAll('sheetData > row'));
    const matrix=[];
    for(const row of rowNodes){
      const cells={};
      for(const c of Array.from(row.children).filter(x=>x.localName==='c')){
        const idx=colIndex(c.getAttribute('r')||'A1'),type=c.getAttribute('t')||'';
        const v=c.querySelector('v')?.textContent??'';let value='';
        if(type==='s')value=shared[Number(v)]??'';
        else if(type==='inlineStr')value=xmlText(c);
        else if(type==='b')value=v==='1';
        else if(type==='e')value='';
        else value=v;
        cells[idx]=value;
      }
      matrix.push(cells);
    }
    if(!matrix.length)throw new Error('El Excel no contiene filas.');
    let headerIndex=-1,indices=null;
    for(let r=0;r<Math.min(matrix.length,25);r++){
      const row=matrix[r],map={};
      Object.entries(row).forEach(([i,v])=>map[norm(v)]=Number(i));
      const candidate=WANTED_HEADERS.map(h=>map[norm(h)]);
      if(candidate.every(i=>i!==undefined)){headerIndex=r;indices=candidate;break}
      // Accept harmless spacing/linebreak differences in headings.
      const compact=Object.entries(map).map(([k,v])=>[k.replace(/\s/g,''),v]);
      const fallback=WANTED_HEADERS.map(h=>compact.find(([k])=>k===norm(h).replace(/\s/g,''))?.[1]);
      if(fallback.every(i=>i!==undefined)){headerIndex=r;indices=fallback;break}
    }
    if(headerIndex<0)throw new Error('No se localizó una fila de cabeceras con las 19 columnas requeridas. Comprueba los nombres de las columnas del Excel.');
    const result=[];
    for(let r=headerIndex+1;r<matrix.length;r++){
      const row=matrix[r],rec={};
      WANTED_HEADERS.forEach((h,j)=>{
        let v=row[indices[j]]??'';
        if(h==='FECHA'&&v!==''&&/^\d+(\.\d+)?$/.test(String(v)))v=excelDate(v);
        if(h==='DÍA RECOLECCIÓN (100)'&&v!==''&&/^\d+(\.\d+)?$/.test(String(v)))v=excelDate(v);
        rec[h]=v;
      });
      if(Object.values(rec).some(v=>v!==''&&v!==null&&v!==undefined))result.push(rec);
    }
    if(!result.length)throw new Error('Se han encontrado las cabeceras, pero no hay registros con datos.');
    return result;
  }
  window.fbParseXlsx=parseXlsx;
})();