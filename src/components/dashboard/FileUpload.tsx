import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { ActivityData } from '@/types/activity';
import { REQUIRED_COLUMNS } from '@/config/constants';
import * as XLSX from 'xlsx';

export const FileUpload: React.FC = () => {
  const { addNewData, allData, isSyncing } = useDashboard();
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    missing?: string[];
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<number | null>(null);

  // ✅ Progresso “realista”: sobe até 90% enquanto processa, no fim fecha em 100%
  useEffect(() => {
    if (!isProcessing) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    // start
    setProgress(0);

    timerRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // segura em 90% até terminar
        const step = prev < 40 ? 4 : prev < 70 ? 2 : 1; // acelera no começo, desacelera depois
        return Math.min(90, prev + step);
      });
    }, 120);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isProcessing]);

  const validateHeaders = (headers: string[]) => {
    const normalizedHeaders = headers.map(h => String(h || '').trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter(
      col => !normalizedHeaders.includes(col.toLowerCase())
    );
    return {
      isValid: missing.length === 0,
      missing,
      found: REQUIRED_COLUMNS.filter(col =>
        normalizedHeaders.includes(col.toLowerCase())
      )
    };
  };

  const finishProgress = async () => {
    // fecha em 100% com animação rápida
    setProgress(100);
    await new Promise(res => setTimeout(res, 250));
    setProgress(0);
  };

  const processFile = useCallback(async (file: File) => {
  setIsProcessing(true);
  setValidationResult(null);
  setProgress(0);

  try {
    // 0% -> lendo arquivo
    setProgress(5);

    const arrayBuffer = await file.arrayBuffer();
    setProgress(12);

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    setProgress(18);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    setProgress(22);

    if (jsonData.length < 2) {
      setValidationResult({
        isValid: false,
        message: 'O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados.'
      });
      setProgress(0);
      setIsProcessing(false);
      return;
    }

    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    const validation = validateHeaders(headers);

    if (!validation.isValid) {
      setValidationResult({
        isValid: false,
        message: `Colunas ausentes: ${validation.missing.join(', ')}`,
        missing: validation.missing
      });
      setProgress(0);
      setIsProcessing(false);
      return;
    }

    const dataRows = jsonData.slice(1);
    const total = dataRows.length;

    // ✅ Aqui começa o progresso REAL (por linhas processadas)
    // reservamos 22% -> 95% para processar as linhas
    const startPct = 22;
    const endPct = 95;

    const newData: ActivityData[] = [];
    const CHUNK_SIZE = 400; // pode ajustar (200-1000)

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = dataRows.slice(i, i + CHUNK_SIZE);

      for (const row of chunk) {
        const obj: ActivityData = {};
        headers.forEach((header, index) => {
          obj[header] =
            (row as unknown[])[index] !== undefined
              ? String((row as unknown[])[index] || '')
              : '';
        });

        // mantém somente linhas com algum valor
        if (Object.values(obj).some(val => String(val).trim() !== '')) {
          newData.push(obj);
        }
      }

      // atualiza % de acordo com o quanto já processou
      const processed = Math.min(i + CHUNK_SIZE, total);
      const ratio = total === 0 ? 1 : processed / total;
      const pct = Math.round(startPct + ratio * (endPct - startPct));
      setProgress(pct);

      // deixa o React renderizar (evita travar a UI)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }

    if (newData.length === 0) {
      setValidationResult({
        isValid: false,
        message: 'Nenhum dado válido encontrado no arquivo.'
      });
      setProgress(0);
      setIsProcessing(false);
      return;
    }

    // aplicando dados no state
    setProgress(98);
    addNewData(newData);

    // finaliza
    setProgress(100);
    setValidationResult({
      isValid: true,
      message: `${newData.length} registros processados com sucesso!`
    });

    // opcional: some com a barra depois de um instante
    setTimeout(() => setProgress(0), 400);
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    setValidationResult({
      isValid: false,
      message: `Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    });
    setProgress(0);
  } finally {
    setIsProcessing(false);
  }
}, [addNewData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f =>
      f.name.endsWith('.csv') ||
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls')
    );

    if (validFile) {
      processFile(validFile);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const hasData = allData.length > 0;
  const showProcessingBar = isProcessing; // barra 0-100 só pro processamento do arquivo
  const showSyncHint = !isProcessing && isSyncing; // se quiser manter a info do sync sem duplicar

  if (hasData) {
    return (
      <div className="card p-4">
        <div
          className={`upload-area compact ${isDragging ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
          style={{ padding: '1rem 1.5rem', minHeight: 'auto' }}
        >
          <input
            type="file"
            id="fileInput"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3">
              {isProcessing ? (
                <div className="spinner w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              )}
              <div>
                <span className="text-sm font-medium text-foreground">
                  {isProcessing ? 'Processando...' : `${allData.length} registros carregados`}
                </span>
              </div>
            </div>

            <button className="btn btn-primary text-sm py-2 px-4" disabled={isProcessing}>
              <Upload className="w-4 h-4" />
              Adicionar mais
            </button>
          </div>

          {/* ✅ Barra 0 → 100 durante processamento */}
          {showProcessingBar && (
            <div className="mt-3 w-full">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {progress}% — Processando arquivo...
              </p>
            </div>
          )}

          {/* ✅ opcional: mensagem de sync sem “barra infinita” */}
          {showSyncHint && (
            <p className="mt-3 text-xs text-muted-foreground">
              Sincronizando com Google Sheets...
            </p>
          )}
        </div>

        {validationResult && (
          <div className={`alert ${validationResult.isValid ? 'alert-success' : 'alert-error'} mt-3`}>
            {validationResult.isValid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <div>
              <strong className="text-sm">{validationResult.isValid ? 'Sucesso!' : 'Erro'}</strong>
              <br />
              <small>{validationResult.message}</small>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div
        className={`upload-area ${isDragging ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          type="file"
          id="fileInput"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="upload-icon">
          {isProcessing ? (
            <div className="spinner" />
          ) : (
            <FileSpreadsheet className="w-12 h-12" />
          )}
        </div>

        <h3 className="upload-title">
          {isProcessing ? 'Processando...' : 'Arraste seus arquivos aqui'}
        </h3>
        <p className="upload-subtitle">
          ou clique para selecionar (CSV, XLSX)
        </p>

        <button className="btn btn-primary" disabled={isProcessing}>
          <Upload className="w-4 h-4" />
          Selecionar Arquivo
        </button>

        {showProcessingBar && (
          <div className="mt-4 w-full">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {progress}% — Processando arquivo...
            </p>
          </div>
        )}

        {showSyncHint && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Sincronizando com Google Sheets...
          </p>
        )}
      </div>

      {validationResult && (
        <div className={`alert ${validationResult.isValid ? 'alert-success' : 'alert-error'} mt-4`}>
          {validationResult.isValid ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <div>
            <strong>{validationResult.isValid ? 'Sucesso!' : 'Erro'}</strong>
            <br />
            <small>{validationResult.message}</small>
          </div>
        </div>
      )}
    </div>
  );
};
