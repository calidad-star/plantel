/* Plantel V3.4 - XLSX parser (browser, no external library).
   Reads the first worksheet and only the 19 approved columns. */
(function(){
  const WANTED_HEADERS = [
    "Nº","SEMANA","FECHA","COMPRA/ PLANTACIÓN","VARIEDAD","TIPO",
    "BANDEJAS 16 B/hg (=Z02*15,78)","PLANTAS merma 8%",
    "DÍA RECOLECCIÓN (100)","PROPIETARIO","CERTIFICADO RIEGO",
    "SUPERFICIE (hanegadas)","Densidad plantas (p/hg) 3775 p/hg",
    "POLIGONO","PARCELA","MUNICIPIO",
    "ACEQUIA confirmada (Con certticado color verde)","CULTIVO","LOTE SIEMBRA"
  ];
  const norm = s => String(s ?? '').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();

  function u16(a,o){ return a[o] | (a[o+1]<<8); }
  function u32(a,o){ return (a[o] | (a[o+1]<<8) | (a[o+2]<<16) | (a[o+3]<<24)) >>> 0; }
  function textDecoder(){ return new TextDecoder('utf-8'); }

  async function inflateRaw(bytes){
    const ds = new DecompressionStream('deflate-raw');
    const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }

  async function zipEntries(buf){
    const a = new Uint8Array(buf);
    let eocd=-1;
    const start=Math.max(0,a.length-65557);
    for(let i=a.length-22;i>=start;i--){
      if(u32(a,i)===0x06054b50){eocd=i;break;}
    }
    if(eocd<0) throw new Error('El archivo XLSX no es un ZIP válido.');
    const cdSize=u32(a,eocd+12), cdOffset=u32(a,eocd+16);
    const out=new Map();
    let p=cdOffset, end=cdOffset+cdSize;
    while(p<end && u32(a,p)===0x02014b50){
      const method=u16(a,p+10), csize=u32(a,p+20), usize=u32(a,p+24);
      const nlen=u16(a,p+28), xlen=u16(a,p+30), clen=u16(a,p+32);
      const local=u32(a,p+42);
      const name=new TextDecoder().decode(a.slice(p+46,p+46+nlen));
      const lp=local, ln=u16(a,lp+26), lx=u16(a,lp+28);
      const raw=a.slice(lp+30+ln+lx,lp+30+ln+lx+csize);
      out.set(name,{method,csize,usize,raw});
      p+=46+nlen+xlen+clen;
    }
    return out;
  }

  async function readEntry(entries,name){
    const e=entries.get(name);
    if(!e) return null;
    if(e.method===0) return e.raw;
    if(e.method===8) return inflateRaw(e.raw);
    throw new Error('Compresión XLSX no compatible: '+e.method);
  }

  function xmlText(el){
    return Array.from(el.querySelectorAll('t')).map(x=>x.textContent||'').join('');
  }
  function colIndex(ref){
    const letters=String(ref).match(/^[A-Z]+/i)?.[0]?.toUpperCase()||'A';
    let n=0; for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64); return n-1;
  }
  function excelDate(serial){
    const n=Number(serial);
    if(!Number.isFinite(n)) return String(serial);
    const d=new Date(Date.UTC(1899,11,30)+n*86400000);
    return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear();
  }

  async function parseXlsx(arrayBuffer){
    const entries=await zipEntries(arrayBuffer);
    const ssBytes=await readEntry(entries,'xl/sharedStrings.xml');
    const shared=[];
    if(ssBytes){
      const doc=new DOMParser().parseFromString(textDecoder().decode(ssBytes),'application/xml');
      doc.querySelectorAll('si').forEach(si=>shared.push(xmlText(si)));
    }
    const sheetBytes=await readEntry(entries,'xl/worksheets/sheet1.xml');
    if(!sheetBytes) throw new Error('No se encontró la primera hoja del Excel.');
    const doc=new DOMParser().parseFromString(textDecoder().decode(sheetBytes),'application/xml');
    const rowNodes=Array.from(doc.querySelectorAll('sheetData > row'));
    const matrix=[];
    for(const row of rowNodes){
      const cells={};
      for(const c of row.querySelectorAll(':scope > c')){
        const ref=c.getAttribute('r')||'A1';
        const idx=colIndex(ref);
        const type=c.getAttribute('t')||'';
        const v=c.querySelector('v')?.textContent ?? '';
        let value='';
        if(type==='s') value=shared[Number(v)] ?? '';
        else if(type==='inlineStr') value=xmlText(c);
        else if(type==='b') value=v==='1';
        else value=v;
        cells[idx]=value;
      }
      matrix.push(cells);
    }
    if(!matrix.length) throw new Error('El Excel no contiene filas.');
    const headerRow=matrix[0];
    const headerMap={};
    Object.entries(headerRow).forEach(([i,v])=>headerMap[norm(v)]=Number(i));
    const indices=WANTED_HEADERS.map(h=>{
      const exact=headerMap[norm(h)];
      if(exact!==undefined) return exact;
      const key=norm(h).replace(/\s/g,'').toLowerCase();
      const found=Object.entries(headerMap).find(([k])=>k.replace(/\s/g,'').toLowerCase()===key);
      if(found) return found[1];
      throw new Error('Falta la columna requerida: '+h);
    });
    const result=[];
    for(let r=1;r<matrix.length;r++){
      const row=matrix[r], rec={};
      WANTED_HEADERS.forEach((h,j)=>{
        let v=row[indices[j]] ?? '';
        if(h==='FECHA' && v!=='') v=excelDate(v);
        rec[h]=v;
      });
      if(Object.values(rec).some(v=>v!=='' && v!==null && v!==undefined)) result.push(rec);
    }
    return result;
  }
  window.fbParseXlsx = parseXlsx;
})();