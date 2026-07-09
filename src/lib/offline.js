import { useEffect, useRef } from 'react';

// 1. Comprime imagem via canvas (máx 800×800, JPEG 0.75) → base64
export function fileToDataURL(file, maxSize = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 2. Recria um File a partir de base64
export function dataURLtoFile(dataUrl, filename = 'foto.jpg') {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// 3. Upload com retry + timeout
export async function uploadComRetry(uploadFn, file, opts = {}) {
  const { tentativas = 2, timeoutMs = 30000 } = opts;
  for (let i = 0; i < tentativas; i++) {
    try {
      const result = await Promise.race([
        uploadFn(file),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout no upload')), timeoutMs)
        ),
      ]);
      return result;
    } catch (e) {
      if (i === tentativas - 1) throw e;
    }
  }
}

// 4. Gerenciamento de rascunho no localStorage
export function salvarRascunho(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
  } catch (e) {
    // quota cheia ou indisponível — silencioso
  }
}

export function carregarRascunho(chave) {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function limparRascunho(chave) {
  try {
    localStorage.removeItem(chave);
  } catch (e) {
    // silencioso
  }
}

// 4. Hook de auto-save
export function useRascunho(chave, dados, onChange) {
  const ref = useRef({ loaded: false, skip: false });
  useEffect(() => {
    if (!ref.current.loaded) {
      ref.current.loaded = true;
      const saved = carregarRascunho(chave);
      if (saved && onChange) {
        ref.current.skip = true;
        onChange(saved);
      }
      return;
    }
    if (ref.current.skip) {
      ref.current.skip = false;
      return;
    }
    salvarRascunho(chave, dados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, dados]);
}

// 5. Bloqueio de saída acidental
export function bloquearSaida(temDados) {
  const handler = (e) => {
    if (temDados) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}

export function useBloquearSaida(temDados) {
  useEffect(() => {
    const handler = (e) => {
      if (temDados) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [temDados]);
}

// 6. Verificação de conexão
export function estaOnline() {
  return navigator.onLine;
}

export function garantirConexao() {
  if (!navigator.onLine) {
    alert('Você está offline. Conecte-se à internet para realizar esta operação.');
    return false;
  }
  return true;
}

// 7. Captura e comprime foto → {dataUrl, file}
export async function capturarFoto(file, opts = {}) {
  const { maxSize = 800, quality = 0.75 } = opts;
  const dataUrl = await fileToDataURL(file, maxSize, quality);
  const compressedFile = dataURLtoFile(dataUrl, file.name || 'foto.jpg');
  return { dataUrl, file: compressedFile };
}

// 8. Captura imagem do clipboard → {dataUrl, file}
export async function colarImagemClipboard(opts = {}) {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) {
      const blob = await item.getType(type);
      const file = new File([blob], 'clipboard.png', { type });
      return await capturarFoto(file, opts);
    }
  }
  return null;
}

// 9. Upload em lote de fotos (data URL → URL remoto)
export async function uploadFotosEmLote(itens, opts = {}) {
  const { uploadFn, timeoutMs = 30000, tentativas = 2 } = opts;
  const falhas = [];
  const processados = [];

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    // Já é URL remota (string) — mantém como está
    if (typeof item === 'string') {
      processados.push(item);
      continue;
    }
    // Já tem URL remota
    if (item.url && !item._localFile && !item.dataUrl) {
      processados.push(item.url);
      continue;
    }
    try {
      let file = item._localFile || item.file;
      if (!(file instanceof File) && item.dataUrl) {
        file = dataURLtoFile(item.dataUrl, item.filename || `foto-${i}.jpg`);
      }
      if (!file) {
        processados.push(item.url || item);
        continue;
      }
      const result = await uploadComRetry(uploadFn, file, { tentativas, timeoutMs });
      processados.push(result.file_url);
    } catch (e) {
      falhas.push({ index: i, item, error: e.message });
      // Mantém dataUrl para nova tentativa depois
      processados.push(item.dataUrl || item.url || item);
    }
  }

  return { itens: processados, falhas };
}