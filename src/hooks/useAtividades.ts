import { useState, useCallback, useRef } from 'react';
import { ActivityData } from '@/types/activity';
import { externalSupabase } from '@/integrations/supabase/externalClient'
import { Atividade, atividadeToActivityData, activityDataToAtividade } from '@/types/atividade'


interface UseAtividadesReturn {
  data: ActivityData[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  syncData: (rows: ActivityData[]) => Promise<void>;
  setData: (data: ActivityData[]) => void;
  mergeNewData: (newData: ActivityData[]) => void;
}

export const useAtividades = (): UseAtividadesReturn => {
  const [data, setDataState] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const lastSyncedDataRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    isInitialLoadRef.current = true;

    try {
      console.log("Buscando dados do Supabase...");

      // Busca todas as atividades - usando paginação para evitar limite de 1000
      let allData: Atividade[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: atividades, error: fetchError } = await externalSupabase
          .from('atividades')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('data_atividade', { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (atividades && atividades.length > 0) {
          allData = [...allData, ...atividades];
          page++;
          hasMore = atividades.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allData.length > 0) {
        console.log(`Dados recebidos: ${allData.length} linhas.`);
        const convertedData = allData.map(atividadeToActivityData) as ActivityData[];
        setDataState(convertedData);
        lastSyncedDataRef.current = JSON.stringify(convertedData);
      } else {
        console.log("Nenhum dado encontrado no Supabase.");
        setDataState([]);
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
        console.log("Sistema pronto para sincronização.");
      }, 2000);
    }
  }, []);

  const syncData = useCallback(async (rows: ActivityData[]) => {
    if (isInitialLoadRef.current) {
      console.log("Sincronização bloqueada - carregamento inicial em andamento.");
      return;
    }

    const currentDataHash = JSON.stringify(rows);
    if (currentDataHash === lastSyncedDataRef.current) {
      console.log("Dados idênticos aos já sincronizados - pulando envio.");
      return;
    }

    if (!rows || rows.length === 0) {
      console.log("Nenhum dado para sincronizar.");
      return;
    }

    setIsSyncing(true);
    console.log(`Sincronizando ${rows.length} registros com Supabase...`);

    try {
      // Converte para formato do banco
      const atividades = rows.map(activityDataToAtividade);

      // Insere em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < atividades.length; i += batchSize) {
        const batch = atividades.slice(i, i + batchSize);

        const { error: insertError } = await externalSupabase
          .from('atividades')
          .upsert(batch, { 
            onConflict: 'numero_os',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.warn(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        } else {
          console.log(`Lote ${Math.floor(i / batchSize) + 1} enviado com sucesso.`);
        }
      }

      lastSyncedDataRef.current = currentDataHash;
      console.log("Sincronização completa!");
    } catch (err) {
      console.error("Erro na sincronização:", err);
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const setData = useCallback((newData: ActivityData[]) => {
    setDataState(newData);
  }, []);

  const mergeNewData = useCallback((newData: ActivityData[]) => {
    console.log(`Substituindo dados: ${newData.length} registros do arquivo.`);
    setDataState(newData);

    if (!isInitialLoadRef.current) {
      lastSyncedDataRef.current = '';
      syncData(newData);
    } else {
      console.log("Upload durante carregamento - sincronização será feita após carregar.");
      setTimeout(() => {
        lastSyncedDataRef.current = '';
        syncData(newData);
      }, 2500);
    }
  }, [syncData]);

  return {
    data,
    isLoading,
    isSyncing,
    error,
    fetchData,
    syncData,
    setData,
    mergeNewData
  };
};